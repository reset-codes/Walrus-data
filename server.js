const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const scheduler = require('./utils/scheduler');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware - helmet for security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  frameguard: { action: 'deny' },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: 'same-origin' }
}));

// Rate limiting - optimized for 100-500 requests/day
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting for health checks and internal scraping
  skip: (req) => req.path === '/health' || req.headers['user-agent']?.includes('node')
});

app.use(limiter);

// CORS configuration with proper production settings
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, postman)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = process.env.NODE_ENV === 'production' 
      ? [
          process.env.FRONTEND_URL_PROD,
          'https://yourapp.render.com', // Replace with your actual Render frontend URL
          'https://walrus-dashboard.netlify.app' // Example frontend URL
        ].filter(Boolean)
      : [
          'http://localhost:3000', 
          'http://localhost:5173',
          'http://localhost:8080'
        ];
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
}));

// Body parsing with size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes
app.use('/api', require('./routes/api'));

// Root endpoint - reduced information disclosure
app.get('/', (req, res) => {
  const schedulerStatus = scheduler.getStatus();
  res.json({ 
    message: 'Walrus Data API',
    version: '1.0.0',
    status: 'operational',
    endpoints: {
      health: '/health',
      walrusData: '/api/walrus-data',
      lastUpdate: '/api/last-update'
    },
    // Only show scheduler info if not in production for security
    ...(process.env.NODE_ENV !== 'production' && {
      scheduler: {
        nextUpdate: schedulerStatus.nextRun,
        lastUpdate: schedulerStatus.lastRun,
        cacheStatus: schedulerStatus.cacheStatus
      }
    })
  });
});

// Health endpoint for Render.com monitoring
app.get('/health', (req, res) => {
  const memUsage = process.memoryUsage();
  const memUsageMB = Math.round(memUsage.rss / 1024 / 1024);
  
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    message: 'Walrus API Server is running',
    uptime: Math.floor(process.uptime()),
    memory: `${memUsageMB}MB`,
    // Include system info only in development
    ...(process.env.NODE_ENV === 'development' && {
      nodeVersion: process.version,
      platform: process.platform
    })
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    message: 'The requested resource does not exist',
    availableEndpoints: ['/health', '/api/walrus-data', '/api/last-update']
  });
});

// Enhanced error handling middleware
app.use((err, req, res, next) => {
  // Log the full error for debugging
  console.error(`[${new Date().toISOString()}] Error:`, {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    url: req.url,
    method: req.method,
    ip: req.ip
  });

  // CORS error handling
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ 
      error: 'CORS policy violation',
      message: 'Origin not allowed'
    });
  }

  // Rate limiting error
  if (err.statusCode === 429) {
    return res.status(429).json({ 
      error: 'Rate limit exceeded',
      message: 'Too many requests, please try again later'
    });
  }

  // Default error response - minimal information disclosure
  const statusCode = err.statusCode || err.status || 500;
  const message = statusCode === 500 ? 'Internal server error' : err.message || 'An error occurred';
  
  res.status(statusCode).json({ 
    error: message,
    timestamp: new Date().toISOString(),
    // Only show detailed errors in development
    ...(process.env.NODE_ENV === 'development' && { details: err.message })
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Walrus API Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 API endpoints: http://localhost:${PORT}/api`);
  
  // Start the daily scheduler
  scheduler.start();
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  scheduler.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down server...');
  scheduler.stop();
  process.exit(0);
});