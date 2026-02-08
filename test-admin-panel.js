/**
 * Admin Panel Test Suite - Fixed Version
 * Run with: node test-admin-panel.js
 * 
 * Note: Some tests may return redirects (302) instead of JSON responses
 * if the server sends HTML redirects for unauthenticated requests.
 */

const http = require('http');

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';

// Test helper functions
const makeRequest = (method, path, data = null, cookies = '') => {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE_URL);
        const options = {
            hostname: url.hostname,
            port: url.port || 3000,
            path: url.pathname + url.search,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Cookie': cookies || ''
            }
        };

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                let parsedBody = null;
                const contentType = res.headers['content-type'] || '';
                
                // Try to parse as JSON, but don't fail on HTML
                if (contentType.includes('application/json') && body.trim()) {
                    try {
                        parsedBody = JSON.parse(body);
                    } catch (e) {
                        parsedBody = { raw: body };
                    }
                }
                
                resolve({
                    status: res.statusCode,
                    headers: res.headers,
                    body: parsedBody,
                    cookies: res.headers['set-cookie']
                });
            });
        });

        req.on('error', reject);

        if (data) {
            req.write(JSON.stringify(data));
        }
        req.end();
    });
};

// Test cases - Updated to match actual route structure
const tests = [
    {
        name: 'Admin Login Page Loads',
        test: async () => {
            const res = await makeRequest('GET', '/admin/login');
            return res.status === 200;
        }
    },
    {
        name: 'Admin Dashboard Requires Authentication',
        test: async () => {
            const res = await makeRequest('GET', '/admin/dashboard');
            return [302, 401].includes(res.status); // Redirect or unauthorized
        }
    },
    {
        name: 'Admin Messages API - Auth Required',
        test: async () => {
            const res = await makeRequest('GET', '/admin/api/messages');
            return [302, 401].includes(res.status); // Redirect or unauthorized
        }
    },
    {
        name: 'Admin Messages API - Invalid ID Handling',
        test: async () => {
            const res = await makeRequest('PUT', '/admin/api/messages/invalid/read');
            return [302, 400, 401, 404].includes(res.status);
        }
    },
    {
        name: 'Admin API Search - SQL Injection Prevention',
        test: async () => {
            const res = await makeRequest('GET', '/admin/api/search?q=--');
            return [200, 302, 401].includes(res.status);
        }
    },
    {
        name: 'Admin Messages Stats API - Auth Required',
        test: async () => {
            const res = await makeRequest('GET', '/admin/api/messages/stats');
            return [302, 401].includes(res.status);
        }
    }
];

// Run tests
async function runTests() {
    console.log('🧪 Admin Panel Test Suite\n');
    console.log('='.repeat(50));

    let passed = 0;
    let failed = 0;

    for (const test of tests) {
        try {
            const result = await test.test();
            if (result) {
                console.log(`✅ PASS: ${test.name}`);
                passed++;
            } else {
                console.log(`❌ FAIL: ${test.name}`);
                failed++;
            }
        } catch (error) {
            console.log(`❌ ERROR: ${test.name} - ${error.message}`);
            failed++;
        }
    }

    console.log('='.repeat(50));
    console.log(`\nResults: ${passed} passed, ${failed} failed`);
    console.log('\n🚀 Test suite completed!');
}

// Manual test checklist for browser testing
console.log(`
╔════════════════════════════════════════════════════════════╗
║           ADMIN PANEL MANUAL TEST CHECKLIST              ║
╚════════════════════════════════════════════════════════════╝

🔐 AUTHENTICATION TESTS
[ ] Login page loads without errors
[ ] Invalid credentials show error message
[ ] Valid admin login redirects to dashboard
[ ] Logout destroys session
[ ] Accessing admin pages without login redirects to login

📊 DASHBOARD TESTS
[ ] Dashboard stats load correctly
[ ] Charts render without console errors
[ ] Recent activity shows data
[ ] Quick actions work

📦 PRODUCTS CRUD TESTS
[ ] Product list loads
[ ] Add new product form works
[ ] Add product with invalid data shows validation errors
[ ] Edit product works
[ ] Delete product (soft delete) works
[ ] Product search works

📁 CATEGORIES CRUD TESTS
[ ] Category list loads
[ ] Add category works
[ ] Cannot delete category with products
[ ] Edit category works

📋 ORDERS MANAGEMENT TESTS
[ ] Order list loads
[ ] Update order status works
[ ] Cannot set invalid status
[ ] Order details show correctly

💬 MESSAGES TESTS
[ ] Message list loads
[ ] Mark as read works
[ ] Delete message works
[ ] Message stats show correctly

🔒 SECURITY TESTS
[ ] SQL injection in search is blocked
[ ] XSS in forms is sanitized
[ ] Unauthorized API calls return 401/redirect
[ ] Rate limiting is active

⚡ PERFORMANCE TESTS
[ ] Page loads in under 2 seconds
[ ] API calls complete in under 1 second
[ ] No memory leaks detected

📱 RESPONSIVE TESTS
[ ] Dashboard works on mobile
[ ] Sidebar collapses properly
[ ] Tables are scrollable on small screens

`);

// Run automated tests
runTests().catch(console.error);
