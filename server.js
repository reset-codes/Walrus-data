const express = require('express');
const cors = require('cors');
const path = require('path');
const scheduler = require('./utils/scheduler');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://yourfrontend.netlify.app'] // Replace with your frontend URL
    : ['http://localhost:3000', 'http://localhost:5173'] // Vite default ports
}));
app.use(express.json());

// Routes
app.use('/api', require('./routes/api'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    message: 'Walrus API Server is running' 
  });
});

// Root endpoint
app.get('/', (req, res) => {
  const schedulerStatus = scheduler.getStatus();
  res.json({ 
    message: 'Walrus Data API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      walrusData: '/api/walrus-data',
      lastUpdate: '/api/last-update'
    },
    scheduler: {
      nextUpdate: schedulerStatus.nextRun,
      lastUpdate: schedulerStatus.lastRun,
      cacheStatus: schedulerStatus.cacheStatus
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
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