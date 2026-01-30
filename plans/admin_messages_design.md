# Admin Messages & Chat Management System - Complete Design Document

## Quick Fix for 500 Error
**Location**: `routes/admin.js`
**Issue**: Duplicate route definitions at lines 407 and 1108
**Solution**: Remove the duplicate route at line 1108

## Complete System Architecture

### Database Schema
- **conversations**: Chat sessions with user/admin relationships
- **messages**: Individual messages with read status
- **online_status**: Real-time user presence tracking
- **admin_notifications**: Sound alert management

### API Endpoints
- `GET /api/admin/messages/conversations` - List all conversations
- `GET /api/admin/messages/conversations/:id` - Get single conversation
- `POST /api/admin/messages/conversations/:id/messages` - Send message
- `PUT /api/admin/messages/conversations/:id/read-all` - Mark all read
- `GET /api/admin/messages/online-users` - Get online status

### UI Components
1. **Messages List Panel** (Left)
   - Conversation items with unread badges
   - Online/offline indicators
   - Priority badges (urgent, high)
   - Message previews

2. **Chat Window** (Right)
   - User info header with status
   - Message history container
   - Input area with send button
   - Action buttons (close, resolve)

3. **Sound Notifications**
   - New message alerts
   - Urgent priority sounds
   - Mute/unmute functionality

### Real-time Communication
- **WebSocket Events**: `new_message`, `typing_start`, `typing_stop`
- **Polling Fallback**: 10-second intervals if WebSocket fails
- **Connection Management**: Auto-reconnect logic

### Error Handling
- **Error Boundaries**: Catch and log all JavaScript errors
- **User-friendly Messages**: Show actionable error states
- **Fallback UI**: Graceful degradation for connection issues
- **Server-side Logging**: Comprehensive error tracking

### Admin Chat Lifecycle
1. Admin connects and loads conversations
2. New message triggers sound notification
3. Admin selects conversation → loads chat history
4. Admin types and sends reply (real-time delivery)
5. Conversation marked as resolved/closed
6. Return to inbox for next conversation

## Implementation Phases

### Phase 1 (Week 1): Core Features
- Fix 500 error
- Basic conversation list UI
- Chat window functionality
- Error handling foundation

### Phase 2 (Week 2): Real-time Features  
- WebSocket integration
- Online status indicators
- Sound notifications
- Typing indicators

### Phase 3 (Week 3): Advanced Features
- File attachments
- Message search
- Analytics dashboard
- Performance optimization

## Success Criteria
- < 2 second message delivery
- 99.9% connection reliability
- < 1% error rate
- Complete offline support
- Accessible UI for all admin users