const cron = require('node-cron');
const cache = require('./cache');
const walrusScraper = require('../scrapers/walrusScraper');

class WalrusScheduler {
  constructor() {
    this.isRunning = false;
    this.lastRun = null;
    this.nextRun = null;
  }

  // Start the daily scheduler at 00:00 UTC
  start() {
    console.log('🕐 Starting Walrus data scheduler...');
    console.log(`🌍 Current UTC time: ${new Date().toISOString()}`);
    
    // Schedule daily scraping at 00:00 UTC
    // Cron format: second minute hour day month dayOfWeek
    // '0 0 0 * * *' = every day at 00:00:00 UTC
    this.cronJob = cron.schedule('0 0 0 * * *', async () => {
      console.log(`🕐 Scheduled scrape triggered at UTC: ${new Date().toISOString()}`);
      await this.performDailyScrape();
    }, {
      scheduled: true,
      timezone: 'UTC'
    });

    // Verify cron job is properly scheduled
    if (this.cronJob) {
      console.log('✅ Cron job created successfully');
      console.log(`🕐 Cron timezone: UTC`);
      console.log(`🕐 Cron expression: '0 0 0 * * *' (daily at 00:00 UTC)`);
    }

    // Calculate next run time
    this.updateNextRunTime();
    
    // Perform initial scrape if no cached data exists
    this.performInitialScrapeIfNeeded();
    
    console.log('✅ Scheduler started successfully');
    console.log(`📅 Next scheduled scrape: ${this.nextRun}`);
    
    // Verify scheduling accuracy
    this.verifyScheduling();
  }

  // Stop the scheduler
  stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      console.log('🛑 Scheduler stopped');
    }
  }

  // Perform the daily scraping
  async performDailyScrape() {
    if (this.isRunning) {
      console.log('⚠️ Scraping already in progress, skipping...');
      return;
    }

    this.isRunning = true;
    this.lastRun = new Date().toISOString();
    
    try {
      console.log('🚀 Starting scheduled daily scrape at', this.lastRun);
      
      // Clear existing cache
      cache.delete('walrus-data');
      
      // Scrape fresh data
      const freshData = await walrusScraper.scrapeWalrusData();
      
      if (freshData) {
        // Cache the fresh data for 24 hours
        cache.set('walrus-data', freshData, 86400);
        console.log('✅ Daily scrape completed successfully');
        console.log('📊 Data cached until next scheduled run');
      } else {
        console.error('❌ Daily scrape failed - no data retrieved');
      }
      
    } catch (error) {
      console.error('❌ Error during scheduled scrape:', error.message);
    } finally {
      this.isRunning = false;
      this.updateNextRunTime();
    }
  }

  // Perform initial scrape if no cached data exists
  async performInitialScrapeIfNeeded() {
    const cachedData = cache.get('walrus-data');
    
    if (!cachedData) {
      console.log('🔍 No cached data found, performing initial scrape...');
      await this.performDailyScrape();
    } else {
      console.log('📦 Cached data found, skipping initial scrape');
      const cacheTimestamp = cache.getTimestamp('walrus-data');
      if (cacheTimestamp) {
        console.log(`📅 Data last updated: ${new Date(cacheTimestamp).toISOString()}`);
      }
    }
  }

  // Calculate next run time
  updateNextRunTime() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    tomorrow.setUTCHours(0, 0, 0, 0);
    this.nextRun = tomorrow.toISOString();
  }

  // Verify scheduling accuracy
  verifyScheduling() {
    const now = new Date();
    const currentUTC = now.toISOString();
    const currentHour = now.getUTCHours();
    const currentMinute = now.getUTCMinutes();
    
    console.log(`🔍 Scheduling verification:`);
    console.log(`   Current UTC: ${currentUTC}`);
    console.log(`   Current UTC hour: ${currentHour}:${currentMinute.toString().padStart(2, '0')}`);
    console.log(`   Next run: ${this.nextRun}`);
    
    // Calculate time until next run
    if (this.nextRun) {
      const nextRunTime = new Date(this.nextRun);
      const timeUntilNext = nextRunTime.getTime() - now.getTime();
      const hoursUntilNext = Math.floor(timeUntilNext / (1000 * 60 * 60));
      const minutesUntilNext = Math.floor((timeUntilNext % (1000 * 60 * 60)) / (1000 * 60));
      
      console.log(`   Time until next run: ${hoursUntilNext}h ${minutesUntilNext}m`);
    }
  }

  // Get scheduler status
  getStatus() {
    return {
      isRunning: this.isRunning,
      lastRun: this.lastRun,
      nextRun: this.nextRun,
      currentUTC: new Date().toISOString(),
      cacheStatus: cache.get('walrus-data') ? 'active' : 'empty',
      cacheTimestamp: cache.getTimestamp('walrus-data'),
      cronJobActive: this.cronJob ? this.cronJob.running : false
    };
  }
}

// Create singleton instance
const scheduler = new WalrusScheduler();

module.exports = scheduler;