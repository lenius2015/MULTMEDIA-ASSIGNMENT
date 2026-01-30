/**
 * Admin Messages & Chat Management System
 * Handles real-time messaging between admins and users
 */

class AdminMessages {
    constructor() {
        this.currentConversation = null;
        this.conversations = [];
        this.socket = null;
        this.soundEnabled = true;
        this.currentStatus = 'all';
        this.searchTimeout = null;

        this.init();
    }

    async init() {
        // Check authentication
        await this.checkAuth();

        // Initialize components
        this.initTabs();
        this.initSearch();
        this.initChatInput();
        this.initSoundToggle();
        this.initSocket();

        // Load initial data
        await this.loadConversations();

        // Update stats periodically
        setInterval(() => this.updateStats(), 30000);
    }

    async checkAuth() {
        try {
            const response = await fetch('/admin/api/check-auth');
            const data = await response.json();
            if (!data.authenticated) {
                window.location.href = '/admin/login';
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            window.location.href = '/admin/login';
        }
    }

    initTabs() {
        const tabs = document.querySelectorAll('.conversations-tabs button');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.currentStatus = tab.dataset.status;
                this.loadConversations();
            });
        });
    }

    initSearch() {
        const searchInput = document.getElementById('searchConversations');
        searchInput.addEventListener('input', (e) => {
            clearTimeout(this.searchTimeout);
            this.searchTimeout = setTimeout(() => {
                this.loadConversations(1, e.target.value);
            }, 300);
        });
    }

    initChatInput() {
        const input = document.getElementById('messageInput');
        const sendBtn = document.getElementById('sendBtn');

        // Auto-resize textarea
        input.addEventListener('input', () => {
            input.style.height = 'auto';
            input.style.height = Math.min(input.scrollHeight, 120) + 'px';
            sendBtn.disabled = input.value.trim() === '';
        });

        // Send on Enter (Shift+Enter for new line)
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (!sendBtn.disabled) {
                    this.sendMessage();
                }
            }
        });

        // Send button click
        sendBtn.addEventListener('click', () => this.sendMessage());

        // Close/Reopen buttons
        document.getElementById('closeChatBtn').addEventListener('click', () => this.closeConversation());
        document.getElementById('reopenChatBtn').addEventListener('click', () => this.reopenConversation());
    }

    initSoundToggle() {
        const toggle = document.getElementById('soundToggle');
        toggle.addEventListener('click', () => {
            this.soundEnabled = !this.soundEnabled;
            toggle.classList.toggle('muted', !this.soundEnabled);
            toggle.querySelector('#soundIcon').className = this.soundEnabled 
                ? 'fas fa-volume-up' 
                : 'fas fa-volume-mute';
            localStorage.setItem('adminChatSound', this.soundEnabled);
        });

        // Load saved preference
        const saved = localStorage.getItem('adminChatSound');
        if (saved !== null) {
            this.soundEnabled = saved === 'true';
            toggle.classList.toggle('muted', !this.soundEnabled);
            toggle.querySelector('#soundIcon').className = this.soundEnabled 
                ? 'fas fa-volume-up' 
                : 'fas fa-volume-mute';
        }
    }

    initSocket() {
        // Socket connection will be initialized from server.js
        if (typeof io !== 'undefined') {
            this.socket = io('/admin-chat', {
                transports: ['websocket', 'polling']
            });

            this.socket.on('connect', () => {
                console.log('Admin chat socket connected');
                if (this.currentConversation) {
                    this.socket.emit('join-conversation', { 
                        conversationId: this.currentConversation.id 
                    });
                }
            });

            this.socket.on('disconnect', () => {
                console.log('Admin chat socket disconnected');
            });

            this.socket.on('new-message', (message) => {
                if (message.conversation_id === this.currentConversation?.id) {
                    this.appendMessage(message);
                    this.markMessagesAsSeen(message.id);
                }
                this.playNotificationSound();
                this.updateConversationPreview(message);
            });

            this.socket.on('user-typing', (data) => {
                if (data.conversation_id === this.currentConversation?.id) {
                    this.showTypingIndicator(true);
                }
            });

            this.socket.on('user-stopped-typing', (data) => {
                if (data.conversation_id === this.currentConversation?.id) {
                    this.showTypingIndicator(false);
                }
            });

            this.socket.on('conversation-closed', (data) => {
                if (data.conversation_id === this.currentConversation?.id) {
                    this.currentConversation.status = 'closed';
                    this.updateChatHeader();
                }
                this.loadConversations();
            });
        }
    }

    async loadConversations(page = 1, search = '') {
        const listEl = document.getElementById('conversationsList');
        listEl.innerHTML = '<div class="loading-state"><div class="loading-spinner"></div></div>';

        try {
            const params = new URLSearchParams({
                page,
                limit: 20,
                ...(this.currentStatus !== 'all' && { status: this.currentStatus }),
                ...(search && { search })
            });

            const response = await fetch(`/admin/api/messages/conversations?${params}`);
            const data = await response.json();

            if (data.success) {
                this.conversations = data.conversations;
                this.renderConversations(data.conversations);
                this.updateTabCounts(data.pagination);
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            console.error('Load conversations error:', error);
            // Check if database is not initialized
            if (error.message.includes('Database not initialized') || error.message.includes('connect') || error.message.includes('ECONNREFUSED')) {
                listEl.innerHTML = `
                    <div class="empty-state" style="padding: 40px; text-align: center; color: #888;">
                        <i class="fas fa-database" style="font-size: 3rem; margin-bottom: 15px; opacity: 0.3;"></i>
                        <h3>Database Not Connected</h3>
                        <p>The database is not initialized yet. Please run the database migration first.</p>
                        <p style="font-size: 0.85rem; margin-top: 10px; color: #666;">
                            Run: <code style="background: #f0f0f0; padding: 2px 6px; border-radius: 4px;">node db.js</code>
                        </p>
                    </div>
                `;
            } else {
                listEl.innerHTML = `
                    <div class="error-state">
                        <i class="fas fa-exclamation-triangle"></i>
                        <h3>Failed to load conversations</h3>
                        <p>${error.message}</p>
                        <button class="retry-btn" onclick="adminMessages.loadConversations()">Retry</button>
                    </div>
                `;
            }
        }
    }

    renderConversations(conversations) {
        const listEl = document.getElementById('conversationsList');
        
        if (conversations.length === 0) {
            listEl.innerHTML = `
                <div class="empty-state" style="padding: 40px; text-align: center; color: #888;">
                    <i class="fas fa-comments" style="font-size: 3rem; margin-bottom: 15px; opacity: 0.3;"></i>
                    <h3>No conversations</h3>
                    <p>No conversations found</p>
                </div>
            `;
            return;
        }

        listEl.innerHTML = conversations.map(conv => {
            const initial = (conv.user_name || conv.session_id || 'U').charAt(0).toUpperCase();
            const timeAgo = this.formatTimeAgo(conv.last_message_at);
            const isUnread = conv.unread_count > 0;
            
            return `
                <div class="conversation-item ${isUnread ? 'unread' : ''} ${this.currentConversation?.id === conv.id ? 'active' : ''}" 
                     data-id="${conv.id}" onclick="adminMessages.selectConversation(${conv.id})">
                    <div class="conversation-avatar">
                        ${conv.user_avatar && conv.user_avatar !== '/images/default-avatar.png' 
                            ? `<img src="${conv.user_avatar}" alt="${conv.user_name || 'User'}">`
                            : initial
                        }
                        <div class="online-indicator ${conv.is_online ? '' : 'offline'}"></div>
                    </div>
                    <div class="conversation-info">
                        <div class="conversation-name">
                            ${conv.user_name || conv.session_id || 'Unknown User'}
                            ${conv.unread_count > 0 ? `<span class="unread-badge">${conv.unread_count}</span>` : ''}
                        </div>
                        <div class="conversation-preview">${conv.last_message || 'No messages yet'}</div>
                        <div class="conversation-meta">
                            <span class="conversation-time">${timeAgo}</span>
                            <span class="status-badge ${conv.status}">${conv.status}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    async selectConversation(id) {
        const chatContent = document.getElementById('chatContent');
        const emptyChat = document.getElementById('emptyChat');
        const errorState = document.getElementById('errorState');
        const chatMessages = document.getElementById('chatMessages');

        // Update active state in list
        document.querySelectorAll('.conversation-item').forEach(item => {
            item.classList.toggle('active', parseInt(item.dataset.id) === id);
            if (item.classList.contains('unread') && parseInt(item.dataset.id) === id) {
                item.classList.remove('unread');
                item.querySelector('.unread-badge')?.remove();
            }
        });

        chatContent.style.display = 'none';
        emptyChat.style.display = 'none';
        errorState.style.display = 'none';
        chatMessages.innerHTML = '<div class="loading-state"><div class="loading-spinner"></div></div>';
        chatContent.style.display = 'flex';

        try {
            const response = await fetch(`/admin/conversations/${id}`);
            const data = await response.json();

            if (data.success) {
                this.currentConversation = data.conversation;
                this.renderChat(data.conversation, data.messages);
                this.joinConversationRoom(id);
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            console.error('Select conversation error:', error);
            chatContent.style.display = 'none';
            errorState.style.display = 'block';
            document.getElementById('errorMessage').textContent = error.message;
        }
    }

    renderChat(conversation, messages) {
        // Update header
        const avatar = document.getElementById('chatUserAvatar');
        const initial = (conversation.user_name || conversation.session_id || 'U').charAt(0).toUpperCase();
        
        if (conversation.user_avatar && conversation.user_avatar !== '/images/default-avatar.png') {
            avatar.innerHTML = `<img src="${conversation.user_avatar}" alt="${conversation.user_name || 'User'}"><div class="online-indicator" id="chatOnlineIndicator"></div>`;
        } else {
            avatar.innerHTML = `<span id="chatUserInitial">${initial}</span><div class="online-indicator" id="chatOnlineIndicator"></div>`;
        }

        document.getElementById('chatUserName').textContent = conversation.user_name || conversation.session_id || 'Unknown User';
        
        const statusEl = document.getElementById('chatUserStatus');
        if (conversation.is_online) {
            statusEl.className = 'chat-user-status';
            statusEl.innerHTML = '<span class="status-dot" style="width: 8px; height: 8px; background: #28a745; border-radius: 50%; display: inline-block;"></span> Online';
        } else {
            statusEl.className = 'chat-user-status offline';
            statusEl.innerHTML = 'Offline';
        }

        // Update close/reopen buttons
        document.getElementById('closeChatBtn').style.display = conversation.status === 'open' ? 'flex' : 'none';
        document.getElementById('reopenChatBtn').style.display = conversation.status === 'closed' ? 'flex' : 'none';

        // Render messages
        this.renderMessages(messages);
    }

    renderMessages(messages) {
        const chatMessages = document.getElementById('chatMessages');
        
        if (messages.length === 0) {
            chatMessages.innerHTML = `
                <div style="text-align: center; color: #888; padding: 40px;">
                    <i class="fas fa-comments" style="font-size: 2rem; margin-bottom: 10px; opacity: 0.3;"></i>
                    <p>No messages yet. Start the conversation!</p>
                </div>
            `;
            return;
        }

        chatMessages.innerHTML = messages.map(msg => this.createMessageHTML(msg)).join('');
        this.scrollToBottom();
    }

    createMessageHTML(message) {
        const isAdmin = message.sender_type === 'admin';
        const time = new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        let statusIcon = '';
        if (isAdmin) {
            if (message.status === 'seen') {
                statusIcon = '<span class="message-status seen"><i class="fas fa-check-double"></i></span>';
            } else if (message.status === 'delivered') {
                statusIcon = '<span class="message-status delivered"><i class="fas fa-check-double"></i></span>';
            } else {
                statusIcon = '<span class="message-status sent"><i class="fas fa-check"></i></span>';
            }
        }

        return `
            <div class="message ${message.sender_type}">
                <div class="message-bubble">${this.escapeHtml(message.message)}</div>
                <div class="message-time">
                    ${time}
                    ${statusIcon}
                </div>
            </div>
        `;
    }

    appendMessage(message) {
        const chatMessages = document.getElementById('chatMessages');
        
        // Remove empty state if exists
        const emptyMsg = chatMessages.querySelector('.empty-state, div[style*="text-align: center"]');
        if (emptyMsg) {
            emptyMsg.remove();
        }

        chatMessages.insertAdjacentHTML('beforeend', this.createMessageHTML(message));
        this.scrollToBottom();
    }

    async sendMessage() {
        const input = document.getElementById('messageInput');
        const message = input.value.trim();
        const sendBtn = document.getElementById('sendBtn');

        if (!message || !this.currentConversation || sendBtn.disabled) return;

        sendBtn.disabled = true;
        input.value = '';
        input.style.height = 'auto';

        try {
            const response = await fetch(`/admin/conversations/${this.currentConversation.id}/reply`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ message })
            });

            const data = await response.json();

            if (data.success) {
                this.appendMessage(data.message);
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            console.error('Send message error:', error);
            // Revert message in UI
            this.showNotification('Failed to send message: ' + error.message, 'error');
        } finally {
            sendBtn.disabled = input.value.trim() === '';
        }
    }

    async closeConversation() {
        if (!this.currentConversation) return;

        try {
            const response = await fetch(`/admin/conversations/${this.currentConversation.id}/close`, {
                method: 'POST'
            });

            const data = await response.json();

            if (data.success) {
                this.currentConversation.status = 'closed';
                this.updateChatHeader();
                this.loadConversations();
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            console.error('Close conversation error:', error);
            this.showNotification('Failed to close conversation', 'error');
        }
    }

    async reopenConversation() {
        if (!this.currentConversation) return;

        try {
            const response = await fetch(`/admin/conversations/${this.currentConversation.id}/reopen`, {
                method: 'POST'
            });

            const data = await response.json();

            if (data.success) {
                this.currentConversation.status = 'open';
                this.updateChatHeader();
                this.loadConversations();
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            console.error('Reopen conversation error:', error);
            this.showNotification('Failed to reopen conversation', 'error');
        }
    }

    updateChatHeader() {
        document.getElementById('closeChatBtn').style.display = this.currentConversation.status === 'open' ? 'flex' : 'none';
        document.getElementById('reopenChatBtn').style.display = this.currentConversation.status === 'closed' ? 'flex' : 'none';
    }

    updateConversationPreview(message) {
        const item = document.querySelector(`.conversation-item[data-id="${message.conversation_id}"]`);
        if (item) {
            const preview = item.querySelector('.conversation-preview');
            const time = item.querySelector('.conversation-time');
            if (preview) preview.textContent = message.message.substring(0, 50) + (message.message.length > 50 ? '...' : '');
            if (time) time.textContent = 'Just now';
        }
        this.loadConversations(); // Refresh full list
    }

    async markMessagesAsSeen(messageId) {
        // This is handled by the backend when loading conversation
        // But we can also do it here for immediate feedback
    }

    showTypingIndicator(show) {
        const indicator = document.getElementById('typingIndicator');
        indicator.classList.toggle('show', show);
        if (show) {
            this.scrollToBottom();
        }
    }

    joinConversationRoom(conversationId) {
        if (this.socket) {
            this.socket.emit('join-conversation', { conversationId });
        }
    }

    leaveConversationRoom(conversationId) {
        if (this.socket) {
            this.socket.emit('leave-conversation', { conversationId });
        }
    }

    async updateStats() {
        try {
            const response = await fetch('/admin/conversations/stats/unread');
            const data = await response.json();
            if (data.success) {
                document.getElementById('openCount').textContent = data.active_conversations;
            }
        } catch (error) {
            console.error('Update stats error:', error);
        }
    }

    updateTabCounts(pagination) {
        document.getElementById('allCount').textContent = pagination.total;
        document.getElementById('openCount').textContent = this.conversations.filter(c => c.status === 'open').length;
    }

    playNotificationSound() {
        if (!this.soundEnabled) return;

        const audio = document.getElementById('notificationSound');
        if (audio) {
            audio.currentTime = 0;
            audio.play().catch(err => console.log('Audio play failed:', err));
        }
    }

    showNotification(message, type = 'info') {
        // Simple notification - can be enhanced with toast library
        console.log(`[${type.toUpperCase()}] ${message}`);
        
        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: ${type === 'error' ? '#dc3545' : type === 'success' ? '#28a745' : '#004e89'};
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            animation: slideUp 0.3s ease;
        `;
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'fadeOut 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    formatTimeAgo(dateString) {
        if (!dateString) return 'Unknown';
        
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    scrollToBottom() {
        const chatMessages = document.getElementById('chatMessages');
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideUp {
        from { transform: translateX(-50%) translateY(20px); opacity: 0; }
        to { transform: translateX(-50%) translateY(0); opacity: 1; }
    }
    @keyframes fadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
    }
`;
document.head.appendChild(style);

// Initialize when DOM is ready
let adminMessages;
document.addEventListener('DOMContentLoaded', () => {
    adminMessages = new AdminMessages();
});
