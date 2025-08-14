const express = require('express');
const router = express.Router();
const cache = require('../utils/cache');
const walrusScraper = require('../scrapers/walrusScraper');

// Get Walrus data (cached)
router.get('/walrus-data', async (req, res) => {
  try {
    // Check cache first
    const cachedData = cache.get('walrus-data');
    
    if (cachedData) {
      console.log('📦 Serving data from cache');
      return res.json({
        success: true,
        data: cachedData,
        source: 'cache',
        timestamp: new Date().toISOString()
      });
    }

    // If no cache, try to scrape fresh data
    console.log('🔍 Cache miss - fetching fresh data');
    const freshData = await walrusScraper.scrapeWalrusData();
    
    if (freshData) {
      // Cache the fresh data for 1 hour
      cache.set('walrus-data', freshData, 3600); // 1 hour in seconds
      
      return res.json({
        success: true,
        data: freshData,
        source: 'fresh',
        timestamp: new Date().toISOString()
      });
    }

    // If scraping fails, return error
    res.status(503).json({
      success: false,
      error: 'Unable to fetch Walrus data at the moment',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error in /walrus-data:', error.message);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

// Force refresh data (for testing)
router.post('/refresh', async (req, res) => {
  try {
    console.log('🔄 Force refreshing Walrus data...');
    
    // Clear cache
    cache.del('walrus-data');
    
    // Scrape fresh data
    const freshData = await walrusScraper.scrapeWalrusData();
    
    if (freshData) {
      // Cache the fresh data
      cache.set('walrus-data', freshData, 3600);
      
      res.json({
        success: true,
        message: 'Data refreshed successfully',
        data: freshData,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(503).json({
        success: false,
        error: 'Failed to refresh data',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('❌ Error in /refresh:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to refresh data',
      timestamp: new Date().toISOString()
    });
  }
});

// Get last update time
router.get('/last-update', (req, res) => {
  const lastUpdate = cache.getTimestamp('walrus-data');
  
  res.json({
    success: true,
    lastUpdate: lastUpdate || null,
    cacheStatus: lastUpdate ? 'active' : 'empty',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;