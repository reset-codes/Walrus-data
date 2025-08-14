const puppeteer = require('puppeteer');

class WalrusScraper {
  constructor() {
    this.urls = [
      'https://walruscan.com/mainnet/home',
      'https://stake-wal.wal.app/'
    ];
    this.timeout = 45000; // 45 seconds
  }

  async scrapeWalrusData() {
    let browser = null;
    
    try {
      console.log('🚀 Starting Walrus data scrape...');
      
      // Launch browser with secure and resource-optimized settings for Render.com
      browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
          '--disable-background-networking',
          '--disable-background-timer-throttling',
          '--disable-renderer-backgrounding',
          '--disable-backgrounding-occluded-windows',
          '--disable-client-side-phishing-detection',
          '--disable-component-extensions-with-background-pages',
          '--disable-default-apps',
          '--disable-extensions',
          '--disable-features=TranslateUI,VizDisplayCompositor',
          '--disable-hang-monitor',
          '--disable-ipc-flooding-protection',
          '--disable-popup-blocking',
          '--disable-prompt-on-repost',
          '--disable-sync',
          '--metrics-recording-only',
          '--no-default-browser-check',
          '--safebrowsing-disable-auto-update',
          '--memory-pressure-off',
          '--max_old_space_size=400'
        ],
        // Resource limits for free tier deployment
        defaultViewport: { width: 1280, height: 720 },
        timeout: 30000
      });

      // Try each URL until one works
      for (const url of this.urls) {
        console.log(`📡 Trying ${url}...`);
        
        try {
          const data = await this.scrapeFromUrl(browser, url);
          if (data && this.validateData(data)) {
            console.log('✅ Successfully scraped data from:', url);
            return data;
          }
        } catch (error) {
          console.log(`❌ Failed to scrape from ${url}:`, error.message);
          continue;
        }
      }
      
      console.log('❌ All URLs failed');
      return null;

    } catch (error) {
      console.error('❌ Scraping error:', error.message);
      return null;
    } finally {
      if (browser) {
        await browser.close();
        console.log('🔒 Browser closed');
      }
    }
  }

  async scrapeFromUrl(browser, url) {
    const page = await browser.newPage();
    
    try {
      // Set viewport and user agent
      await page.setViewport({ width: 1920, height: 1080 });
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      
      console.log(`📡 Navigating to ${url}...`);
      
      // Navigate to the page with retry
      let retries = 3;
      while (retries > 0) {
        try {
          await page.goto(url, { 
            waitUntil: 'domcontentloaded',
            timeout: this.timeout 
          });
          break;
        } catch (error) {
          retries--;
          if (retries === 0) throw error;
          console.log(`⚠️ Retrying navigation... (${retries} attempts left)`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      // Wait for the content to load with better detection
      console.log('⏳ Waiting for content to load...');
      
      try {
        // Wait for specific elements that should contain the data
        await page.waitForFunction(() => {
          const text = document.body.innerText;
          return text.length > 1000 && (
            text.includes('Storage') || 
            text.includes('Epoch') || 
            text.includes('TB') ||
            text.includes('FROST')
          );
        }, { timeout: 15000 });
        console.log('✅ Page content detected');
      } catch (error) {
        console.log('⚠️ Timeout waiting for content, proceeding anyway...');
      }
      
      // Additional wait to ensure dynamic content loads
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Take a screenshot for debugging (optional)
      // await page.screenshot({ path: 'debug.png' });

      // Extract data using multiple strategies
      const walrusData = await page.evaluate(() => {
        const data = {
          storagePrice: null,
          writePrice: null,
          storageCapacity: null,
          epoch: null,
          dataSource: 'realtime', // Will be changed to 'fallback' if using fallback values
          timestamp: new Date().toISOString()
        };

        // Helper function to clean text
        const cleanText = (text) => {
          return text ? text.trim().replace(/\s+/g, ' ') : '';
        };

        // Helper function to extract numbers
        const extractNumber = (text) => {
          const match = text.match(/[\d,]+/);
          return match ? match[0].replace(/,/g, '') : null;
        };

        // Helper function to extract percentage
        const extractPercentage = (text) => {
          const match = text.match(/([\d.]+)%/);
          return match ? match[1] : null;
        };

        try {
          // Strategy 1: Look for specific text patterns
          const allText = document.body.innerText;
          

          
          // Extract Storage Price - match actual format: "11,000FROST / MB"
          // We need to distinguish between storage (first occurrence) and write price (second)
          const allFrostMatches = allText.match(/(\d{1,3}(?:,\d{3})*)\s*FROST\s*\/\s*MB/gi);
          
          if (allFrostMatches && allFrostMatches.length >= 2) {
            // First match is storage price (FROST/MiB/EPOCH)
            const storageMatch = allFrostMatches[0].match(/(\d{1,3}(?:,\d{3})*)/);
            if (storageMatch) {
              data.storagePrice = {
                value: parseInt(storageMatch[1].replace(/,/g, '')),
                unit: 'FROST/MiB/EPOCH',
                display: storageMatch[1]
              };
            }
            
            // Second match is write price (FROST/MiB)
            const writeMatch = allFrostMatches[1].match(/(\d{1,3}(?:,\d{3})*)/);
            if (writeMatch) {
              data.writePrice = {
                value: parseInt(writeMatch[1].replace(/,/g, '')),
                unit: 'FROST/MiB',
                display: writeMatch[1]
              };
            }
          }

          // Extract Epoch information
          const epochMatch = allText.match(/Epoch\s*(\d+)/i);
          if (epochMatch) {
            data.epoch = {
              number: parseInt(epochMatch[1]),
              display: `Epoch ${epochMatch[1]}`
            };
          }

          // Extract Storage Capacity - look for the "644 / 4,167 TB" pattern first
          const storagePattern = allText.match(/(\d{1,3}(?:,\d{3})*)\s*\/\s*(\d{1,3}(?:,\d{3})*)\s*TB/i);
          if (storagePattern) {
            const usedTB = parseInt(storagePattern[1].replace(/,/g, ''));
            const totalTB = parseInt(storagePattern[2].replace(/,/g, ''));
            const percentage = ((usedTB / totalTB) * 100).toFixed(2);
            
            data.storageCapacity = {
              used: usedTB,
              total: totalTB,
              usedDisplay: storagePattern[1] + ' TB',
              totalDisplay: storagePattern[2] + ' TB',
              display: `${storagePattern[1]} / ${storagePattern[2]} TB`,
              percentage: parseFloat(percentage),
              percentageDisplay: percentage + '%'
            };
          } else {
            // Fallback: Extract just percentage if TB numbers not found
            const capacityMatch = allText.match(/([\d.]+)%/);
            if (capacityMatch) {
              data.storageCapacity = {
                percentage: parseFloat(capacityMatch[1]),
                percentageDisplay: capacityMatch[1] + '%'
              };
              
              // Try to find the actual usage numbers (like 643.1 TB / 4.16 PB)
              const usageMatch = allText.match(/([\d.]+)\s*TB\s*\/?\s*([\d.]+)\s*PB/i);
              if (usageMatch) {
                data.storageCapacity.used = parseFloat(usageMatch[1]);
                data.storageCapacity.total = parseFloat(usageMatch[2]) * 1000; // Convert PB to TB
                data.storageCapacity.usedDisplay = usageMatch[1] + ' TB';
                data.storageCapacity.totalDisplay = usageMatch[2] + ' PB';
                data.storageCapacity.display = `${usageMatch[1]} TB / ${usageMatch[2]} PB`;
              }
            }
          }

          // Strategy 2: Look for elements with specific class names or data attributes
          // This is a fallback if text matching doesn't work

          // Try to find elements containing "FROST"
          const frostElements = Array.from(document.querySelectorAll('*')).filter(el => 
            el.textContent && el.textContent.includes('FROST')
          );

          frostElements.forEach(el => {
            const text = el.textContent.trim();
            
            // Storage price pattern
            if (text.includes('FROST/MiB/EPOCH') && !data.storagePrice) {
              const match = text.match(/(\d{1,3}(?:,\d{3})*)/);
              if (match) {
                data.storagePrice = {
                  value: parseInt(match[1].replace(/,/g, '')),
                  unit: 'FROST/MiB/EPOCH',
                  display: match[1]
                };
              }
            }
            
            // Write price pattern
            if (text.includes('FROST/MiB') && !text.includes('EPOCH') && !data.writePrice) {
              const match = text.match(/(\d{1,3}(?:,\d{3})*)/);
              if (match) {
                data.writePrice = {
                  value: parseInt(match[1].replace(/,/g, '')),
                  unit: 'FROST/MiB',
                  display: match[1]
                };
              }
            }
          });

          // Try to find percentage elements
          if (!data.storageCapacity) {
            const percentageElements = Array.from(document.querySelectorAll('*')).filter(el =>
              el.textContent && el.textContent.match(/\d+\.\d+%/)
            );
            
            if (percentageElements.length > 0) {
              const text = percentageElements[0].textContent;
              const match = text.match(/([\d.]+)%/);
              if (match) {
                data.storageCapacity = {
                  percentage: parseFloat(match[1]),
                  percentageDisplay: match[1] + '%'
                };
              }
            }
          }

        } catch (error) {
          console.log('Error during data extraction:', error.message);
        }

        // Fallback: If we found storage capacity but no prices, use known values
        // This is a temporary fix while we debug the price extraction
        if (data.storageCapacity && !data.storagePrice && !data.writePrice) {
          console.log('⚠️ Using fallback price values - real-time scraping failed');
          data.dataSource = 'fallback';
          data.storagePrice = {
            value: 11000,
            unit: 'FROST/MiB/EPOCH',
            display: '11,000'
          };
          data.writePrice = {
            value: 20000,
            unit: 'FROST/MiB',
            display: '20,000'
          };
        }

        return data;
      });

      console.log('📊 Extracted data from', url, ':', walrusData);
      return walrusData;
      
    } finally {
      await page.close();
    }
  }

  validateData(data) {
    // More strict validation to ensure real data quality
    const hasStoragePrice = data.storagePrice?.value && data.storagePrice?.value > 0;
    const hasWritePrice = data.writePrice?.value && data.writePrice?.value > 0;
    const hasStorageCapacity = (data.storageCapacity?.used && data.storageCapacity?.total) || 
                              (data.storageCapacity?.percentage && data.storageCapacity?.percentage > 0);
    const hasEpoch = data.epoch?.number && data.epoch?.number > 0;

    const validFields = [hasStoragePrice, hasWritePrice, hasStorageCapacity, hasEpoch]
      .filter(Boolean);

    // Prefer real-time data over fallback
    const isRealTimeData = data.dataSource === 'realtime';
    
    // Require at least 3 fields for high confidence, or 2 fields if real-time
    return isRealTimeData ? validFields.length >= 2 : validFields.length >= 3;
  }

  // Enhanced validation for production use
  validateDataStrict(data) {
    if (!data || typeof data !== 'object') return false;

    // Ensure all critical fields exist and have reasonable values
    const storageValid = data.storagePrice?.value >= 1000 && data.storagePrice?.value <= 100000;
    const writeValid = data.writePrice?.value >= 1000 && data.writePrice?.value <= 100000;
    const capacityValid = data.storageCapacity?.percentage >= 0 && data.storageCapacity?.percentage <= 100;
    const epochValid = data.epoch?.number >= 1 && data.epoch?.number <= 10000;

    return storageValid && writeValid && capacityValid && epochValid;
  }

  // Test method to check if scraping is working
  async testScrape() {
    console.log('🧪 Running test scrape...');
    const result = await this.scrapeWalrusData();
    
    if (result && this.validateData(result)) {
      console.log('✅ Test scrape successful:', result);
      return result;
    } else {
      console.log('❌ Test scrape failed - no valid data found');
      return null;
    }
  }
}

// Create singleton instance
const walrusScraper = new WalrusScraper();

module.exports = walrusScraper;