/**
 * Admin Chat WebSocket Handler
 * Real-time communication system for admin messaging
 */

class AdminChatWebSocket {
    constructor() {
        this.socket = null;
        this.adminId = null;
        this.currentConversationId = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 3000;
        this.isConnected = false;
        
        this.callbacks = {
            onMessage: null,
            onTyping: null,
            onStatusChange: null,
            onNotification: null,
            onError: null
        };
        
        this.init();
    }
    
    init() {
        this.connect();
        this.setupEventHandlers();
    }
    
    connect() {
        if (typeof io === 'undefined') {
            console.warn('Socket.IO not available');
            this.handleError('Socket.IO library not loaded');
            return;
        }
        
        this.socket = io({
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionDelay: this.reconnectDelay,
            reconnectionAttempts: this.maxReconnectAttempts
        });
        
        this.setupSocketListeners();
    }
    
    setupSocketListeners() {
        // Connection events
        this.socket.on('connect', () => {
            console.log('Admin chat connected:', this.socket.id);
            this.isConnected = true;
            this.reconnectAttempts = 0;
            
            // Join admin room
            this.socket.emit('admin_connect', this.adminId);
            
            // Rejoin current conversation if any
            if (this.currentConversationId) {
                this.socket.emit('join_conversation', this.currentConversationId);
            }
            
            if (this.callbacks.onStatusChange) {
                this.callbacks.onStatusChange('connected');
            }
        });
        
        this.socket.on('disconnect', (reason) => {
            console.log('Admin chat disconnected:', reason);
            this.isConnected = false;
            
            if (this.callbacks.onStatusChange) {
                this.callbacks.onStatusChange('disconnected', reason);
            }
            
            // Attempt reconnection
            if (this.reconnectAttempts < this.maxReconnectAttempts) {
                this.reconnectAttempts++;
                setTimeout(() => {
                    console.log(`Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
                    this.socket.connect();
                }, this.reconnectDelay);
            }
        });
        
        this.socket.on('connect_error', (error) => {
            console.error('Connection error:', error);
            this.handleError('Connection failed: ' + error.message);
        });
        
        this.socket.on('reconnect', (attemptNumber) => {
            console.log('Reconnected after', attemptNumber, 'attempts');
            this.reconnectAttempts = 0;
            
            if (this.callbacks.onStatusChange) {
                this.callbacks.onStatusChange('reconnected');
            }
        });
        
        this.socket.on('reconnect_failed', () => {
            console.error('Reconnection failed after maximum attempts');
            this.handleError('Unable to establish connection');
        });
        
        // Message events
        this.socket.on('new_message', (data) => {
            console.log('New message received:', data);
            
            if (this.callbacks.onMessage) {
                this.callbacks.onMessage(data);
            }
        });
        
        this.socket.on('message_notification', (data) => {
            console.log('Message notification:', data);
            
            if (this.callbacks.onNotification) {
                this.callbacks.onNotification(data);
            }
        });
        
        // Typing events
        this.socket.on('user_typing', (data) => {
            if (this.callbacks.onTyping) {
                this.callbacks.onTyping(data);
            }
        });
        
        // Conversation events
        this.socket.on('conversation_updated', (data) => {
            console.log('Conversation updated:', data);
            // Trigger conversation list refresh
            if (this.callbacks.onConversationUpdate) {
                this.callbacks.onConversationUpdate(data);
            }
        });
        
        this.socket.on('conversation_deleted', (data) => {
            console.log('Conversation deleted:', data);
            
            // If currently viewing deleted conversation, close it
            if (this.currentConversationId === data.conversationId) {
                this.closeConversation();
            }
        });
        
        // Admin room events
        this.socket.on('admin_message', (data) => {
            console.log('Admin room message:', data);
            
            if (this.callbacks.onNotification) {
                this.callbacks.onNotification(data);
            }
        });
        
        // Error events
        this.socket.on('error', (error) => {
            console.error('Socket error:', error);
            this.handleError(error.message);
        });
        
        this.socket.on('message_error', (error) => {
            console.error('Message error:', error);
            this.handleError('Message delivery failed: ' + error.message);
        });
    }
    
    setupEventHandlers() {
        // Handle page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible' && !this.isConnected) {
                console.log('Page became visible, attempting reconnection...');
                this.socket.connect();
            }
        });
        
        // Handle online/offline status
        window.addEventListener('online', () => {
            console.log('Network online, attempting reconnection...');
            if (!this.isConnected) {
                this.socket.connect();
            }
        });
        
        window.addEventListener('offline', () => {
            console.log('Network offline');
            if (this.callbacks.onStatusChange) {
                this.callbacks.onStatusChange('offline');
            }
        });
    }
    
    // ============================================
    // CONVERSATION MANAGEMENT
    // ============================================
    
    joinConversation(conversationId) {
        if (!this.isConnected) {
            console.warn('Cannot join conversation: not connected');
            return;
        }
        
        // Leave previous conversation
        if (this.currentConversationId) {
            this.socket.emit('leave_conversation', this.currentConversationId);
        }
        
        // Join new conversation
        this.currentConversationId = conversationId;
        this.socket.emit('join_conversation', conversationId);
        
        console.log('Joined conversation:', conversationId);
    }
    
    leaveConversation() {
        if (this.currentConversationId && this.isConnected) {
            this.socket.emit('leave_conversation', this.currentConversationId);
            this.currentConversationId = null;
        }
    }
    
    closeConversation() {
        this.leaveConversation();
        
        // Notify UI
        if (this.callbacks.onConversationClosed) {
            this.callbacks.onConversationClosed();
        }
    }
    
    // ============================================
    // MESSAGING
    // ============================================
    
    sendMessage(conversationId, message, messageType = 'text') {
        if (!this.isConnected) {
            console.error('Cannot send message: not connected');
            return { success: false, error: 'Not connected to server' };
        }
        
        return new Promise((resolve, reject) => {
            this.socket.emit('send_message', {
                conversationId,
                message,
                messageType
            }, (response) => {
                if (response.error) {
                    console.error('Send message error:', response.error);
                    reject(new Error(response.error));
                } else {
                    console.log('Message sent successfully:', response.messageId);
                    resolve(response);
                }
            });
            
            // Set timeout for response
            setTimeout(() => {
                reject(new Error('Message send timeout'));
            }, 10000);
        });
    }
    
    // ============================================
    // TYPING INDICATORS
    // ============================================
    
    startTyping(conversationId) {
        if (this.isConnected && conversationId) {
            this.socket.emit('typing_start', conversationId);
        }
    }
    
    stopTyping(conversationId) {
        if (this.isConnected && conversationId) {
            this.socket.emit('typing_stop', conversationId);
        }
    }
    
    // ============================================
    // CALLBACK SETTERS
    // ============================================
    
    onMessage(callback) {
        this.callbacks.onMessage = callback;
    }
    
    onTyping(callback) {
        this.callbacks.onTyping = callback;
    }
    
    onStatusChange(callback) {
        this.callbacks.onStatusChange = callback;
    }
    
    onNotification(callback) {
        this.callbacks.onNotification = callback;
    }
    
    onError(callback) {
        this.callbacks.onError = callback;
    }
    
    onConversationUpdate(callback) {
        this.callbacks.onConversationUpdate = callback;
    }
    
    onConversationClosed(callback) {
        this.callbacks.onConversationClosed = callback;
    }
    
    // ============================================
    // ERROR HANDLING
    // ============================================
    
    handleError(errorMessage) {
        console.error('AdminChatWebSocket Error:', errorMessage);
        
        if (this.callbacks.onError) {
            this.callbacks.onError(errorMessage);
        }
    }
    
    // ============================================
    // CONNECTION MANAGEMENT
    // ============================================
    
    disconnect() {
        if (this.socket) {
            this.leaveConversation();
            this.socket.disconnect();
            this.socket = null;
            this.isConnected = false;
        }
    }
    
    reconnect() {
        if (this.socket && !this.isConnected) {
            this.reconnectAttempts = 0;
            this.socket.connect();
        }
    }
    
    getConnectionStatus() {
        return {
            connected: this.isConnected,
            socketId: this.socket?.id,
            reconnectAttempts: this.reconnectAttempts
        };
    }
}

// Export for use
window.AdminChatWebSocket = AdminChatWebSocket;