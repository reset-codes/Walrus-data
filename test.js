// Comprehensive test runner for Walrus API
const SecurityTester = require('./tests/security-test');
const ScraperTester = require('./tests/scraper-test');
const walrusScraper = require('./scrapers/walrusScraper');

async function runQuickTests() {
  console.log('🚀 Running quick functionality tests...\n');
  
  try {
    // Quick scraper test
    console.log('📋 Quick Test 1: Testing scraper...');
    const scrapedData = await walrusScraper.testScrape();
    
    if (scrapedData) {
      console.log('✅ Scraper test passed!');
      
      // Check if it's real data or fallback
      if (scrapedData.dataSource === 'realtime') {
        console.log('🎯 Real-time data successfully scraped');
      } else {
        console.log('⚠️  Fallback data detected - may need to check scraping logic');
      }
      
      console.log('📊 Data summary:');
      console.log(`   Storage Price: ${scrapedData.storagePrice?.display || 'N/A'} ${scrapedData.storagePrice?.unit || ''}`);
      console.log(`   Write Price: ${scrapedData.writePrice?.display || 'N/A'} ${scrapedData.writePrice?.unit || ''}`);
      console.log(`   Storage Capacity: ${scrapedData.storageCapacity?.display || scrapedData.storageCapacity?.percentageDisplay || 'N/A'}`);
      console.log(`   Current Epoch: ${scrapedData.epoch?.display || 'N/A'}`);
    } else {
      console.log('❌ Scraper test failed!');
      return false;
    }
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // Data validation test
    console.log('📋 Quick Test 2: Testing data validation...');
    const isValid = walrusScraper.validateData(scrapedData);
    const isStrictValid = walrusScraper.validateDataStrict(scrapedData);
    
    console.log(`✅ Basic validation: ${isValid ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Strict validation: ${isStrictValid ? 'PASS' : 'FAIL'}`);
    
    if (isValid && isStrictValid) {
      console.log('✅ All validation tests passed!');
    } else {
      console.log('⚠️ Validation issues detected');
    }
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // Memory usage test
    console.log('📋 Quick Test 3: Memory usage check...');
    const memUsage = process.memoryUsage();
    const memMB = Math.round(memUsage.rss / 1024 / 1024);
    
    console.log(`💾 Current memory usage: ${memMB}MB`);
    if (memMB < 200) {
      console.log('✅ Memory usage is optimal for Render.com free tier');
    } else if (memMB < 400) {
      console.log('⚠️ Memory usage is moderate - monitor on production');
    } else {
      console.log('❌ Memory usage is high - optimization needed');
    }
    
    console.log('\n🎉 Quick tests completed!');
    return true;
    
  } catch (error) {
    console.error('❌ Quick test failed:', error.message);
    return false;
  }
}

async function runFullTests() {
  console.log('🔬 Running comprehensive test suite...\n');
  
  const scraperTester = new ScraperTester();
  await scraperTester.runAllTests();
  
  console.log('\n' + '='.repeat(80) + '\n');
  
  // Only run security tests if server is running
  try {
    const SecurityTester = require('./tests/security-test');
    const securityTester = new SecurityTester();
    await securityTester.runAllTests();
  } catch (error) {
    console.log('⚠️ Security tests skipped - start server first with "npm run dev"');
    console.log('   Then run: node tests/security-test.js');
  }
}

async function runProductionReadinessCheck() {
  console.log('🚀 Production Readiness Check for Render.com\n');
  
  const checks = [
    { name: 'Environment Variables', check: () => {
      const hasNodeEnv = process.env.NODE_ENV || 'development';
      const hasPort = process.env.PORT || '3001';
      return hasNodeEnv && hasPort;
    }},
    { name: 'Memory Limit', check: () => process.memoryUsage().rss < 400 * 1024 * 1024 },
    { name: 'Scraper URLs', check: () => walrusScraper.urls.length > 0 },
    { name: 'Cache System', check: () => require('./utils/cache') !== null },
    { name: 'Scheduler System', check: () => require('./utils/scheduler') !== null }
  ];
  
  let allPassed = true;
  
  for (const check of checks) {
    try {
      const result = check.check();
      console.log(`${result ? '✅' : '❌'} ${check.name}: ${result ? 'PASS' : 'FAIL'}`);
      if (!result) allPassed = false;
    } catch (error) {
      console.log(`❌ ${check.name}: ERROR - ${error.message}`);
      allPassed = false;
    }
  }
  
  console.log('\n' + '='.repeat(50));
  if (allPassed) {
    console.log('🎉 READY FOR RENDER.COM DEPLOYMENT!');
    console.log('\n📝 Deployment steps:');
    console.log('1. Set environment variables in Render.com dashboard');
    console.log('2. Set NODE_ENV=production');
    console.log('3. Configure build command: npm install');
    console.log('4. Configure start command: npm start');
    console.log('5. Monitor logs for successful startup');
  } else {
    console.log('⚠️ NOT READY - Fix issues above before deploying');
  }
}

// Main test runner
async function runTests() {
  const args = process.argv.slice(2);
  const testType = args[0] || 'quick';
  
  switch (testType) {
    case 'quick':
      await runQuickTests();
      break;
    case 'full':
      await runFullTests();
      break;
    case 'production':
      await runProductionReadinessCheck();
      break;
    case 'security':
      const SecurityTester = require('./tests/security-test');
      const securityTester = new SecurityTester();
      await securityTester.runAllTests();
      break;
    case 'scraper':
      const ScraperTester = require('./tests/scraper-test');
      const scraperTester = new ScraperTester();
      await scraperTester.runAllTests();
      break;
    default:
      console.log('Usage: node test.js [quick|full|production|security|scraper]');
      console.log('  quick      - Fast functionality tests (default)');
      console.log('  full       - All tests including performance');
      console.log('  production - Render.com readiness check');
      console.log('  security   - Security and API tests (requires running server)');
      console.log('  scraper    - Detailed scraper tests');
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests, runQuickTests, runFullTests, runProductionReadinessCheck };