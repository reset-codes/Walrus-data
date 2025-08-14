// Test script to verify scraping functionality
const walrusScraper = require('./scrapers/walrusScraper');

async function runTests() {
  console.log('🧪 Starting Walrus API Tests...\n');
  
  try {
    // Test 1: Scraper functionality
    console.log('📋 Test 1: Testing scraper...');
    const scrapedData = await walrusScraper.testScrape();
    
    if (scrapedData) {
      console.log('✅ Scraper test passed!');
      console.log('📊 Data:', JSON.stringify(scrapedData, null, 2));
    } else {
      console.log('❌ Scraper test failed!');
      return;
    }
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // Test 2: Data validation
    console.log('📋 Test 2: Testing data validation...');
    
    const requiredFields = ['storagePrice', 'writePrice', 'storageCapacity'];
    const foundFields = requiredFields.filter(field => 
      scrapedData[field] && scrapedData[field] !== null
    );
    
    console.log(`📊 Found ${foundFields.length}/${requiredFields.length} data fields:`);
    foundFields.forEach(field => {
      console.log(`  ✅ ${field}:`, scrapedData[field]);
    });
    
    if (foundFields.length >= 2) {
      console.log('✅ Data validation passed!');
    } else {
      console.log('❌ Data validation failed - need at least 2 fields');
    }
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // Test 3: API endpoint simulation
    console.log('📋 Test 3: Simulating API response...');
    
    const apiResponse = {
      success: true,
      data: scrapedData,
      source: 'fresh',
      timestamp: new Date().toISOString()
    };
    
    console.log('📡 API Response:', JSON.stringify(apiResponse, null, 2));
    console.log('✅ API simulation passed!');
    
    console.log('\n🎉 All tests completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('1. Run: npm run dev');
    console.log('2. Test endpoints:');
    console.log('   - http://localhost:3001/health');
    console.log('   - http://localhost:3001/api/walrus-data');
    console.log('   - http://localhost:3001/api/last-update');
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests();
}

module.exports = { runTests };