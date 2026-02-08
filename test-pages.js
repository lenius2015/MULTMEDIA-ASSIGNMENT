const http = require('http');

async function testPage(url, description) {
    return new Promise((resolve) => {
        console.log(`Testing ${description}...`);
        
        const request = http.get(url, (response) => {
            let data = '';
            response.on('data', (chunk) => {
                data += chunk;
            });
            response.on('end', () => {
                if (response.statusCode === 200) {
                    console.log(`✓ ${description} - Status: ${response.statusCode}`);
                    resolve(true);
                } else {
                    console.log(`✗ ${description} - Status: ${response.statusCode}`);
                    resolve(false);
                }
            });
        });

        request.on('error', (error) => {
            console.log(`✗ ${description} - Error: ${error.message}`);
            resolve(false);
        });

        // Timeout after 5 seconds
        request.setTimeout(5000, () => {
            request.destroy();
            console.log(`✗ ${description} - Timeout`);
            resolve(false);
        });
    });
}

async function runTests() {
    console.log('Testing page accessibility...\n');
    
    const baseUrl = 'http://localhost:3000';
    
    const tests = [
        { url: `${baseUrl}/deals`, description: 'Deals page' },
        { url: `${baseUrl}/promotions`, description: 'Promotions page' },
        { url: `${baseUrl}/categories`, description: 'Categories page' },
        { url: `${baseUrl}/api/deals`, description: 'Deals API' },
        { url: `${baseUrl}/api/promotions`, description: 'Promotions API' }
    ];
    
    let passed = 0;
    let total = tests.length;
    
    for (const test of tests) {
        const result = await testPage(test.url, test.description);
        if (result) passed++;
    }
    
    console.log(`\nResults: ${passed}/${total} tests passed`);
    
    if (passed === total) {
        console.log('🎉 All pages are accessible!');
    } else {
        console.log('⚠️  Some pages may have issues');
    }
}

runTests();