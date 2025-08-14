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
      // Cache the fresh data for 24 hours (daily updates)
      cache.set('walrus-data', freshData, 86400); // 24 hours in seconds
      
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