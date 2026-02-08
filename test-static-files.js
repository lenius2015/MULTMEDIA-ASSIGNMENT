#!/usr/bin/env node

const express = require('express');
const request = require('supertest');

// Create a test app
const app = express();

// Serve static files
app.use(express.static('public'));

// Test function
async function testStaticFiles() {
  console.log('Testing Static File Serving...\n');

  try {
    // Test 1: Check if admin.css exists and is accessible
    console.log('1. Testing GET /admin.css');
    const cssResponse = await request(app)
      .get('/admin.css')
      .expect(200);
    
    console.log('✓ admin.css accessible');
    console.log('  Content-Type:', cssResponse.headers['content-type']);
    console.log('  Content-Length:', cssResponse.headers['content-length']);

    // Test 2: Check if style.css exists and is accessible
    console.log('\n2. Testing GET /style.css');
    const styleResponse = await request(app)
      .get('/style.css')
      .expect(200);
    
    console.log('✓ style.css accessible');
    console.log('  Content-Type:', styleResponse.headers['content-type']);

    // Test 3: Check if favicon.ico exists
    console.log('\n3. Testing GET /favicon.ico');
    const faviconResponse = await request(app)
      .get('/favicon.ico')
      .expect(200);
    
    console.log('✓ favicon.ico accessible');

    console.log('\n✅ All static files are being served correctly!');
    console.log('\nIf you still see 404 errors in the browser:');
    console.log('1. Clear your browser cache');
    console.log('2. Check browser developer tools for specific errors');
    console.log('3. Verify the server is running on the correct port');
    console.log('4. Check if there are any network/firewall issues');

  } catch (error) {
    console.error('❌ Static file test failed:', error.message);
    console.error('Error details:', error);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  testStaticFiles();
}

module.exports = { testStaticFiles };