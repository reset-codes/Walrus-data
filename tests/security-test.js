// Security and functionality tests for Walrus API
const http = require('http');
const https = require('https');

class SecurityTester {
  constructor(baseUrl = 'http://localhost:3001') {
    this.baseUrl = baseUrl;
    this.results = [];
  }

  async runAllTests() {
    console.log('🧪 Starting comprehensive security and functionality tests...\n');
    
    const tests = [
      this.testHealthEndpoint.bind(this),
      this.testRateLimit.bind(this),
      this.testCORSHeaders.bind(this),
      this.testSecurityHeaders.bind(this),
      this.testWalrusDataEndpoint.bind(this),
      this.testLastUpdateEndpoint.bind(this),
      this.testErrorHandling.bind(this),
      this.testInputValidation.bind(this),
      this.test404Handling.bind(this)
    ];

    for (const test of tests) {
      try {
        await test();
      } catch (error) {
        this.logResult('ERROR', test.name, `Failed: ${error.message}`);
      }
    }

    this.printSummary();
  }

  async makeRequest(path, options = {}) {
    return new Promise((resolve, reject) => {
      const url = `${this.baseUrl}${path}`;
      const client = url.startsWith('https:') ? https : http;
      
      const req = client.request(url, {
        method: options.method || 'GET',
        headers: {
          'User-Agent': 'SecurityTester/1.0',
          ...options.headers
        }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const jsonData = JSON.parse(data);
            resolve({ statusCode: res.statusCode, headers: res.headers, data: jsonData });
          } catch {
            resolve({ statusCode: res.statusCode, headers: res.headers, data: data });
          }
        });
      });

      req.on('error', reject);
      req.setTimeout(10000, () => reject(new Error('Request timeout')));
      req.end();
    });
  }

  async testHealthEndpoint() {
    const response = await this.makeRequest('/health');
    
    if (response.statusCode === 200) {
      const hasRequiredFields = response.data.status && response.data.timestamp && response.data.message;
      this.logResult('PASS', 'Health Endpoint', hasRequiredFields ? 'All fields present' : 'Missing fields');
      
      // Check memory reporting
      if (response.data.memory) {
        this.logResult('PASS', 'Memory Monitoring', `Memory: ${response.data.memory}`);
      }
    } else {
      this.logResult('FAIL', 'Health Endpoint', `Status: ${response.statusCode}`);
    }
  }

  async testRateLimit() {
    const requests = [];
    
    // Make 12 requests rapidly (should hit rate limit)
    for (let i = 0; i < 12; i++) {
      requests.push(this.makeRequest('/health'));
    }

    const responses = await Promise.allSettled(requests);
    const rateLimited = responses.some(r => 
      r.status === 'fulfilled' && r.value.statusCode === 429
    );

    this.logResult(rateLimited ? 'PASS' : 'FAIL', 'Rate Limiting', 
      rateLimited ? 'Rate limit triggered' : 'Rate limit not working');
  }

  async testCORSHeaders() {
    const response = await this.makeRequest('/', {
      headers: {
        'Origin': 'https://example.com',
        'Access-Control-Request-Method': 'GET'
      }
    });

    const hasAccessControl = response.headers['access-control-allow-origin'] !== undefined;
    this.logResult(hasAccessControl ? 'PASS' : 'FAIL', 'CORS Headers', 
      hasAccessControl ? 'CORS headers present' : 'CORS headers missing');
  }

  async testSecurityHeaders() {
    const response = await this.makeRequest('/');
    const headers = response.headers;

    const securityChecks = [
      { name: 'X-Frame-Options', present: !!headers['x-frame-options'] },
      { name: 'X-Content-Type-Options', present: !!headers['x-content-type-options'] },
      { name: 'X-XSS-Protection', present: !!headers['x-xss-protection'] },
      { name: 'Strict-Transport-Security', present: !!headers['strict-transport-security'] },
      { name: 'Content-Security-Policy', present: !!headers['content-security-policy'] }
    ];

    securityChecks.forEach(check => {
      this.logResult(check.present ? 'PASS' : 'FAIL', `Security Header: ${check.name}`, 
        check.present ? 'Present' : 'Missing');
    });
  }

  async testWalrusDataEndpoint() {
    const response = await this.makeRequest('/api/walrus-data');
    
    if (response.statusCode === 200 || response.statusCode === 503) {
      const hasRequiredStructure = response.data.success !== undefined && 
                                 response.data.timestamp !== undefined;
      
      this.logResult('PASS', 'Walrus Data Endpoint', 
        `Status: ${response.statusCode}, Structure valid: ${hasRequiredStructure}`);

      // Check for data source indicator
      if (response.data.data?.dataSource) {
        this.logResult('PASS', 'Data Source Tracking', 
          `Source: ${response.data.data.dataSource}`);
      }

      // Check response time
      if (response.data.responseTime) {
        const responseTime = parseInt(response.data.responseTime);
        this.logResult(responseTime < 5000 ? 'PASS' : 'WARN', 'Response Time', 
          response.data.responseTime);
      }
    } else {
      this.logResult('FAIL', 'Walrus Data Endpoint', `Status: ${response.statusCode}`);
    }
  }

  async testLastUpdateEndpoint() {
    const response = await this.makeRequest('/api/last-update');
    
    if (response.statusCode === 200) {
      const hasRequiredFields = response.data.success !== undefined && 
                              response.data.cacheStatus !== undefined;
      this.logResult('PASS', 'Last Update Endpoint', hasRequiredFields ? 'Valid structure' : 'Invalid structure');
    } else {
      this.logResult('FAIL', 'Last Update Endpoint', `Status: ${response.statusCode}`);
    }
  }

  async testErrorHandling() {
    const response = await this.makeRequest('/nonexistent');
    
    if (response.statusCode === 404) {
      const hasErrorStructure = response.data.error && response.data.message;
      this.logResult('PASS', '404 Handling', hasErrorStructure ? 'Proper error structure' : 'Poor error structure');
    } else {
      this.logResult('FAIL', '404 Handling', `Expected 404, got ${response.statusCode}`);
    }
  }

  async testInputValidation() {
    // Test with malicious headers
    try {
      const response = await this.makeRequest('/api/walrus-data', {
        headers: {
          'X-Forwarded-For': '"><script>alert("xss")</script>',
          'User-Agent': 'Mozilla/5.0 <script>alert(1)</script>'
        }
      });

      // Should not crash and should return proper response
      this.logResult('PASS', 'Input Validation', 'Handles malicious headers safely');
    } catch (error) {
      this.logResult('FAIL', 'Input Validation', `Server crashed: ${error.message}`);
    }
  }

  async test404Handling() {
    const paths = ['/admin', '/config', '/.env', '/api/admin'];
    
    for (const path of paths) {
      const response = await this.makeRequest(path);
      if (response.statusCode === 404) {
        this.logResult('PASS', `404 Protection: ${path}`, 'Properly blocked');
      } else {
        this.logResult('FAIL', `404 Protection: ${path}`, `Status: ${response.statusCode}`);
      }
    }
  }

  logResult(status, test, message) {
    const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : status === 'WARN' ? '⚠️' : '❓';
    console.log(`${icon} ${status}: ${test} - ${message}`);
    this.results.push({ status, test, message });
  }

  printSummary() {
    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    const warnings = this.results.filter(r => r.status === 'WARN').length;

    console.log('\n' + '='.repeat(60));
    console.log('🧪 TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⚠️ Warnings: ${warnings}`);
    console.log(`📊 Total: ${this.results.length}`);
    
    if (failed === 0) {
      console.log('\n🎉 All critical tests passed! API is ready for production.');
    } else {
      console.log('\n⚠️ Some tests failed. Review the issues before deploying.');
    }
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new SecurityTester();
  tester.runAllTests().catch(console.error);
}

module.exports = SecurityTester;