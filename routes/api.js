const express = require('express');
const router = express.Router();
const cache = require('../utils/cache');
const walrusScraper = require('../scrapers/walrusScraper');

// Input validation and sanitization helper
const validateAndSanitizeData = (data) => {
  if (!data || typeof data !== 'object') {
    return null;
  }

  // Sanitize and validate scraped data
  const sanitized = {
    storagePrice: null,
    writePrice: null,
    storageCapacity: null,
    epoch: null,
    dataSource: 'unknown',
    timestamp: new Date().toISOString()
  };

  // Validate storage price
  if (data.storagePrice?.value && typeof data.storagePrice.value === 'number' && 
      data.storagePrice.value > 0 && data.storagePrice.value < 1000000) {
    sanitized.storagePrice = {
      value: Math.floor(data.storagePrice.value),
      unit: String(data.storagePrice.unit || 'FROST/MiB/EPOCH').substring(0, 50),
      display: String(data.storagePrice.display || data.storagePrice.value).substring(0, 20)
    };
  }

  // Validate write price
  if (data.writePrice?.value && typeof data.writePrice.value === 'number' && 
      data.writePrice.value > 0 && data.writePrice.value < 1000000) {
    sanitized.writePrice = {
      value: Math.floor(data.writePrice.value),
      unit: String(data.writePrice.unit || 'FROST/MiB').substring(0, 50),
      display: String(data.writePrice.display || data.writePrice.value).substring(0, 20)
    };
  }

  // Validate storage capacity
  if (data.storageCapacity) {
    sanitized.storageCapacity = {};
    
    if (typeof data.storageCapacity.percentage === 'number' && 
        data.storageCapacity.percentage >= 0 && data.storageCapacity.percentage <= 100) {
      sanitized.storageCapacity.percentage = parseFloat(data.storageCapacity.percentage.toFixed(2));
      sanitized.storageCapacity.percentageDisplay = `${sanitized.storageCapacity.percentage}%`;
    }
    
    if (typeof data.storageCapacity.used === 'number' && data.storageCapacity.used >= 0) {
      sanitized.storageCapacity.used = Math.floor(data.storageCapacity.used);
    }
    
    if (typeof data.storageCapacity.total === 'number' && data.storageCapacity.total >= 0) {
      sanitized.storageCapacity.total = Math.floor(data.storageCapacity.total);
    }

    if (data.storageCapacity.display) {
      sanitized.storageCapacity.display = String(data.storageCapacity.display).substring(0, 100);
    }
  }

  // Validate epoch
  if (data.epoch?.number && typeof data.epoch.number === 'number' && 
      data.epoch.number > 0 && data.epoch.number < 100000) {
    sanitized.epoch = {
      number: Math.floor(data.epoch.number),
      display: `Epoch ${Math.floor(data.epoch.number)}`
    };
  }

  // Validate data source
  if (data.dataSource && ['realtime', 'fallback', 'cached'].includes(data.dataSource)) {
    sanitized.dataSource = data.dataSource;
  }

  // Validate timestamp
  if (data.timestamp && new Date(data.timestamp).getTime()) {
    sanitized.timestamp = new Date(data.timestamp).toISOString();
  }

  return sanitized;
};

// Get Walrus data (cached) - with enhanced validation and circuit breaker
router.get('/walrus-data', async (req, res) => {
  const startTime = Date.now();
  
  try {
    // Check cache first
    let cachedData = cache.get('walrus-data');
    
    if (cachedData) {
      // Validate cached data
      cachedData = validateAndSanitizeData(cachedData);
      if (cachedData) {
        console.log('📦 Serving validated data from cache');
        return res.json({
          success: true,
          data: cachedData,
          source: 'cache',
          timestamp: new Date().toISOString(),
          responseTime: `${Date.now() - startTime}ms`
        });
      } else {
        console.log('⚠️ Cached data failed validation, clearing cache');
        cache.delete('walrus-data');
      }
    }

    // If no valid cache, try to scrape fresh data
    console.log('🔍 Cache miss - fetching fresh data');
    let freshData = await walrusScraper.scrapeWalrusData();
    
    if (freshData) {
      // Validate and sanitize scraped data
      freshData = validateAndSanitizeData(freshData);
      
      if (freshData && walrusScraper.validateDataStrict(freshData)) {
        // Cache the validated fresh data for 24 hours
        cache.set('walrus-data', freshData, 86400);
        console.log('✅ Fresh data validated and cached');
        
        return res.json({
          success: true,
          data: freshData,
          source: 'fresh',
          timestamp: new Date().toISOString(),
          responseTime: `${Date.now() - startTime}ms`
        });
      } else {
        console.log('❌ Fresh data failed validation');
      }
    }

    // If scraping fails or data is invalid, return error
    res.status(503).json({
      success: false,
      error: 'Unable to fetch valid Walrus data at the moment. Please try again later.',
      timestamp: new Date().toISOString(),
      responseTime: `${Date.now() - startTime}ms`,
      retryAfter: '5 minutes'
    });

  } catch (error) {
    console.error(`❌ Error in /walrus-data [${Date.now() - startTime}ms]:`, {
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
    
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString(),
      responseTime: `${Date.now() - startTime}ms`
    });
  }
});



// Get last update time and scheduler status
router.get('/last-update', (req, res) => {
  const lastUpdate = cache.getTimestamp('walrus-data');
  
  res.json({
    success: true,
    lastUpdate: lastUpdate || null,
    cacheStatus: lastUpdate ? 'active' : 'empty',
    updateSchedule: 'Daily at 00:00 UTC',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;