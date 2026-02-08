#!/usr/bin/env node

const express = require('express');
const request = require('supertest');
const pool = require('./db');
const { requireAdminAuth } = require('./middleware/adminAuth');

// Create a test app
const app = express();
app.use(express.json());

// Import routes
const conversationsRoutes = require('./routes/conversations');
const adminChatRoomRoutes = require('./routes/adminChatRoom');

// Mock admin auth middleware for testing
app.use('/api/chat', (req, res, next) => {
  req.session = {
    adminId: 1,
    adminName: 'Test Admin',
    adminEmail: 'test@admin.com'
  };
  next();
});

app.use('/api/conversations', (req, res, next) => {
  req.session = {
    userId: 1,
    userName: 'Test User',
    userEmail: 'test@user.com'
  };
  next();
});

// Use routes
app.use('/api/chat', adminChatRoomRoutes);
app.use('/api/conversations', conversationsRoutes);

// Test function
async function testMessagingRoutes() {
  console.log('Testing Messaging System Routes...\n');

  try {
    // Test 1: Get conversations stats
    console.log('1. Testing GET /api/chat/stats');
    const statsResponse = await request(app)
      .get('/api/chat/stats')
      .expect(200);
    
    console.log('✓ Stats endpoint working:', statsResponse.body.success);
    console.log('  Data:', statsResponse.body.data || {});

    // Test 2: Get online users
    console.log('\n2. Testing GET /api/chat/online-users');
    const usersResponse = await request(app)
      .get('/api/chat/online-users')
      .expect(200);
    
    console.log('✓ Online users endpoint working:', usersResponse.body.success);
    console.log('  Users count:', usersResponse.body.users ? usersResponse.body.users.length : 0);

    // Test 3: Get conversations
    console.log('\n3. Testing GET /api/conversations/');
    const convResponse = await request(app)
      .get('/api/conversations/')
      .expect(200);
    
    console.log('✓ Conversations endpoint working:', convResponse.body.success);
    console.log('  Conversations count:', convResponse.body.conversations ? convResponse.body.conversations.length : 0);

    // Test 4: Check new messages
    console.log('\n4. Testing GET /api/chat/check-new');
    const newMsgResponse = await request(app)
      .get('/api/chat/check-new')
      .expect(200);
    
    console.log('✓ Check new messages endpoint working:', newMsgResponse.body.success);
    console.log('  New messages count:', newMsgResponse.body.newCount || 0);

    console.log('\n✅ All messaging routes are working correctly!');
    console.log('\nNext steps:');
    console.log('1. Start your server: npm start');
    console.log('2. Visit admin dashboard: /admin/dashboard');
    console.log('3. Check messages page: /admin/messages');
    console.log('4. Test live chat functionality');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Error details:', error);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  testMessagingRoutes();
}

module.exports = { testMessagingRoutes };