/**
 * OMUNJU SHOPPERS Chatbot
 * Smart chatbot with live chat and WhatsApp support
 */

class Chatbot {
    constructor() {
        this.socket = null;
        this.currentMode = 'chatbot'; // chatbot, live_chat, whatsapp
        this.adminOnline = false;
        this.conversationId = null;
        this.messages = [];
        this.isOpen = false;
        this.user = null;
        
        this.init();
    }

    init() {
        this.createWidget();
        this.setupEventListeners();
        this.connectSocket();
        this.loadChatHistory();
    }

    createWidget() {
        // Create chatbot container
        const chatbotHTML = `
            <!-- Chatbot Toggle Button -->
            <button class="chatbot-toggle" id="chatbotToggle" title="Chat with us">
                <i class="fas fa-comments" id="chatbotToggleIcon"></i>
            </button>

            <!-- Chatbot Window -->
            <div class="chatbot-window" id="chatbotWindow">
                <!-- Header -->
                <div class="chatbot-header">
                    <div class="chatbot-header-info">
                        <div class="chatbot-avatar">
                            <i class="fas fa-headset"></i>
                        </div>
                        <div class="chatbot-header-text">
                            <h4>OMUNJU SHOPPERS</h4>
                            <span class="chatbot-status" id="chatbotStatus">
                                <span class="status-dot online"></span> <span id="statusText">Online</span>
                            </span>
                        </div>
                    </div>
                    <div class="chatbot-header-actions">
                        <button class="chatbot-close" id="chatbotClose">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>

                <!-- Messages Container -->
                <div class="chatbot-messages" id="chatbotMessages">
                    <!-- Welcome Message -->
                    <div class="chatbot-welcome" id="chatbotWelcome">
                        <div class="chatbot-avatar">
                            <i class="fas fa-store"></i>
                        </div>
                        <h3>Welcome to OMUNJU SHOPPERS! 👋</h3>
                        <p>How can we help you today?</p>
                        <div class="chatbot-quick-actions">
                            <button class="quick-btn" data-action="track">Track Order</button>
                            <button class="quick-btn" data-action="products">Products</button>
                            <button class="quick-btn" data-action="contact">Contact Us</button>
                            <button class="quick-btn" data-action="whatsapp">WhatsApp</button>
                        </div>
                    </div>
                </div>

                <!-- Typing Indicator -->
                <div class="chatbot-typing" id="chatbotTyping" style="display: none;">
                    <div class="typing-dots">
                        <span></span><span></span><span></span>
                    </div>
                    <span>Typing...</span>
                </div>

                <!-- Input Area -->
                <div class="chatbot-input-area" id="chatbotInputArea">
                    <div class="chatbot-input-wrapper">
                        <textarea 
                            class="chatbot-input" 
                            id="chatbotInput" 
                            placeholder="Type your message..."
                            rows="1"
                        ></textarea>
                        <button class="chatbot-send" id="chatbotSend" disabled>
                            <i class="fas fa-paper-plane"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Create style element
        const style = document.createElement('style');
        style.textContent = this.getStyles();
        document.head.appendChild(style);

        // Add container to body
        const container = document.createElement('div');
        container.id = 'chatbot-container';
        container.innerHTML = chatbotHTML;
        document.body.appendChild(container);
    }

    getStyles() {
        return `
            /* Chatbot Toggle Button */
            .chatbot-toggle {
                position: fixed;
                bottom: 20px;
                right: 20px;
                width: 60px;
                height: 60px;
                border-radius: 50%;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                border: none;
                cursor: pointer;
                box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
                z-index: 9999;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: transform 0.3s ease;
            }

            .chatbot-toggle:hover {
                transform: scale(1.1);
            }

            .chatbot-toggle i {
                color: white;
                font-size: 1.5rem;
            }

            /* Chat Window */
            .chatbot-window {
                position: fixed;
                bottom: 90px;
                right: 20px;
                width: 380px;
                height: 550px;
                max-height: calc(100vh - 120px);
                background: white;
                border-radius: 20px;
                box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
                display: none;
                flex-direction: column;
                z-index: 9999;
                overflow: hidden;
            }

            .chatbot-window.show {
                display: flex;
                animation: slideIn 0.3s ease;
            }

            @keyframes slideIn {
                from { opacity: 0; transform: translateY(20px); }
                to { opacity: 1; transform: translateY(0); }
            }

            /* Header */
            .chatbot-header {
                padding: 15px 20px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .chatbot-header-info {
                display: flex;
                align-items: center;
                gap: 12px;
            }

            .chatbot-avatar {
                width: 45px;
                height: 45px;
                border-radius: 50%;
                background: rgba(255, 255, 255, 0.2);
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .chatbot-avatar i {
                font-size: 1.3rem;
            }

            .chatbot-header-text h4 {
                margin: 0;
                font-size: 1rem;
                font-weight: 600;
            }

            .chatbot-status {
                font-size: 0.8rem;
                display: flex;
                align-items: center;
                gap: 5px;
            }

            .status-dot {
                width: 8px;
                height: 8px;
                border-radius: 50%;
            }

            .status-dot.online {
                background: #25d366;
            }

            .status-dot.offline {
                background: #ff6b6b;
            }

            .chatbot-header-actions {
                display: flex;
                gap: 10px;
            }

            .chatbot-header-actions button {
                background: rgba(255, 255, 255, 0.2);
                border: none;
                color: white;
                width: 35px;
                height: 35px;
                border-radius: 50%;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: background 0.3s;
            }

            .chatbot-header-actions button:hover {
                background: rgba(255, 255, 255, 0.3);
            }

            /* Messages */
            .chatbot-messages {
                flex: 1;
                overflow-y: auto;
                padding: 20px;
                background: #f8f9fa;
            }

            .chatbot-welcome {
                text-align: center;
                padding: 20px;
            }

            .chatbot-welcome .chatbot-avatar {
                width: 70px;
                height: 70px;
                margin: 0 auto 15px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            }

            .chatbot-welcome .chatbot-avatar i {
                color: white;
                font-size: 1.8rem;
            }

            .chatbot-welcome h3 {
                margin: 0 0 10px;
                color: #333;
                font-size: 1.2rem;
            }

            .chatbot-welcome p {
                color: #666;
                margin-bottom: 20px;
            }

            .chatbot-quick-actions {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 10px;
            }

            .quick-btn {
                padding: 12px 15px;
                border: 2px solid #667eea;
                background: white;
                color: #667eea;
                border-radius: 10px;
                cursor: pointer;
                font-weight: 500;
                transition: all 0.3s;
            }

            .quick-btn:hover {
                background: #667eea;
                color: white;
            }

            /* Message Bubbles */
            .chatbot-message {
                display: flex;
                margin-bottom: 15px;
                animation: fadeIn 0.3s ease;
            }

            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
            }

            .chatbot-message.bot {
                justify-content: flex-start;
            }

            .chatbot-message.user {
                justify-content: flex-end;
            }

            .message-avatar {
                width: 35px;
                height: 35px;
                border-radius: 50%;
                background: #667eea;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
            }

            .chatbot-message.user .message-avatar {
                background: #25d366;
            }

            .message-avatar i {
                color: white;
                font-size: 0.9rem;
            }

            .message-content {
                max-width: 70%;
                padding: 12px 16px;
                border-radius: 18px;
                margin-left: 10px;
                font-size: 0.95rem;
                line-height: 1.4;
            }

            .chatbot-message.bot .message-content {
                background: white;
                color: #333;
                border-bottom-left-radius: 5px;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
            }

            .chatbot-message.user .message-content {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border-bottom-right-radius: 5px;
            }

            .message-time {
                font-size: 0.7rem;
                color: #999;
                margin-top: 5px;
                margin-left: 10px;
            }

            /* Typing Indicator */
            .chatbot-typing {
                padding: 15px 20px;
                display: flex;
                align-items: center;
                gap: 10px;
                background: white;
                border-top: 1px solid #eee;
                font-size: 0.85rem;
                color: #666;
            }

            .typing-dots {
                display: flex;
                gap: 4px;
            }

            .typing-dots span {
                width: 8px;
                height: 8px;
                background: #667eea;
                border-radius: 50%;
                animation: typing 1.4s infinite;
            }

            .typing-dots span:nth-child(2) {
                animation-delay: 0.2s;
            }

            .typing-dots span:nth-child(3) {
                animation-delay: 0.4s;
            }

            @keyframes typing {
                0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
                30% { transform: translateY(-5px); opacity: 1; }
            }

            /* Input Area */
            .chatbot-input-area {
                padding: 15px 20px;
                background: white;
                border-top: 1px solid #eee;
            }

            .chatbot-input-wrapper {
                display: flex;
                gap: 10px;
                align-items: flex-end;
            }

            .chatbot-input {
                flex: 1;
                padding: 12px 16px;
                border: 2px solid #eee;
                border-radius: 25px;
                font-size: 0.95rem;
                resize: none;
                outline: none;
                transition: border-color 0.3s;
                font-family: inherit;
            }

            .chatbot-input:focus {
                border-color: #667eea;
            }

            .chatbot-send {
                width: 45px;
                height: 45px;
                border-radius: 50%;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                border: none;
                color: white;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: transform 0.3s;
            }

            .chatbot-send:hover:not(:disabled) {
                transform: scale(1.05);
            }

            .chatbot-send:disabled {
                background: #ccc;
                cursor: not-allowed;
            }

            /* Live Chat Mode Indicator */
            .live-chat-indicator {
                background: #25d366;
                color: white;
                padding: 8px 15px;
                border-radius: 20px;
                font-size: 0.8rem;
                margin-bottom: 15px;
                display: inline-flex;
                align-items: center;
                gap: 8px;
            }

            .live-chat-indicator i {
                font-size: 0.9rem;
            }

            /* Admin Typing */
            .admin-typing {
                background: #e8f5e9;
                color: #2e7d32;
                padding: 8px 15px;
                border-radius: 15px;
                font-size: 0.85rem;
                margin-bottom: 15px;
            }

            /* Responsive */
            @media (max-width: 480px) {
                .chatbot-window {
                    right: 10px;
                    left: 10px;
                    width: auto;
                    bottom: 80px;
                    height: calc(100vh - 100px);
                }

                .chatbot-toggle {
                    right: 15px;
                    bottom: 15px;
                    width: 55px;
                    height: 55px;
                }
            }
        `;
    }

    setupEventListeners() {
        // Toggle chat
        document.getElementById('chatbotToggle').addEventListener('click', () => this.toggleChat());
        document.getElementById('chatbotClose').addEventListener('click', () => this.toggleChat());

        // Send message
        const sendBtn = document.getElementById('chatbotSend');
        const input = document.getElementById('chatbotInput');
        
        sendBtn.addEventListener('click', () => this.sendMessage());
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Quick action buttons
        document.querySelectorAll('.quick-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.target.dataset.action;
                this.handleQuickAction(action);
            });
        });
    }

    connectSocket() {
        if (typeof io !== 'undefined') {
            this.socket = io();
            
            this.socket.on('connect', () => {
                console.log('Chatbot connected to server');
            });

            this.socket.on('admin_status', (data) => {
                this.adminOnline = data.online;
                this.updateAdminStatus();
            });

            this.socket.on('new_message', (data) => {
                if (this.currentMode === 'live_chat') {
                    this.addMessage(data.message, 'bot', data.message.sender_name);
                }
            });

            this.socket.on('user_typing', (data) => {
                if (data.isTyping) {
                    this.showTypingIndicator();
                } else {
                    this.hideTypingIndicator();
                }
            });
        }
    }

    updateAdminStatus() {
        const statusElement = document.getElementById('chatbotStatus');
        const statusText = document.getElementById('statusText');
        
        if (this.adminOnline) {
            statusElement.innerHTML = '<span class="status-dot online"></span> <span>Admin Online</span>';
        } else {
            statusElement.innerHTML = '<span class="status-dot offline"></span> <span>Offline</span>';
        }
    }

    toggleChat() {
        this.isOpen = !this.isOpen;
        const window = document.getElementById('chatbotWindow');
        const toggle = document.getElementById('chatbotToggle');
        
        if (this.isOpen) {
            window.classList.add('show');
            toggle.style.display = 'none';
            document.getElementById('chatbotInput').focus();
        } else {
            window.classList.remove('show');
            toggle.style.display = 'flex';
        }
    }

    loadChatHistory() {
        // Load from localStorage
        const history = localStorage.getItem('chatbot_history');
        if (history) {
            this.messages = JSON.parse(history);
            // Don't auto-load history in welcome view
        }
    }

    saveChatHistory() {
        // Keep only last 50 messages
        const recentMessages = this.messages.slice(-50);
        localStorage.setItem('chatbot_history', JSON.stringify(recentMessages));
    }

    handleQuickAction(action) {
        switch(action) {
            case 'track':
                this.sendMessage('I want to track my order');
                break;
            case 'products':
                this.sendMessage('Show me products');
                break;
            case 'contact':
                this.sendMessage('I want to contact customer care');
                break;
            case 'whatsapp':
                this.redirectToWhatsApp();
                break;
        }
    }

    async sendMessage(text = null) {
        const input = document.getElementById('chatbotInput');
        const message = text || input.value.trim();
        
        if (!message) return;

        // Add user message
        this.addMessage(message, 'user');
        input.value = '';
        document.getElementById('chatbotSend').disabled = true;

        // Save message to database
        await this.saveMessageToServer(message);

        // Process message
        this.processMessage(message);
    }

    async saveMessageToServer(message) {
        try {
            const response = await fetch('/api/conversations/message', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: message,
                    messageType: 'text'
                })
            });

            const data = await response.json();
            if (data.success) {
                this.conversationId = data.conversationId;
            }
        } catch (error) {
            console.error('Failed to save message:', error);
        }
    }

    addMessage(content, type, sender = null) {
        const container = document.getElementById('chatbotMessages');
        
        // Remove welcome if exists
        const welcome = document.getElementById('chatbotWelcome');
        if (welcome) {
            welcome.style.display = 'none';
        }

        // Check for live chat indicator
        let indicator = document.querySelector('.live-chat-indicator');
        if (type === 'user' && this.currentMode === 'live_chat' && !indicator) {
            const ind = document.createElement('div');
            ind.className = 'live-chat-indicator';
            ind.innerHTML = '<i class="fas fa-user-tie"></i> Live chat with admin';
            container.appendChild(ind);
        }

        const messageDiv = document.createElement('div');
        messageDiv.className = `chatbot-message ${type}`;
        
        const avatar = type === 'bot' 
            ? '<div class="message-avatar"><i class="fas fa-store"></i></div>'
            : '<div class="message-avatar"><i class="fas fa-user"></i></div>';

        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        messageDiv.innerHTML = `
            ${type === 'bot' ? avatar : ''}
            <div>
                <div class="message-content">${this.formatMessage(content)}</div>
                <div class="message-time">${time}</div>
            </div>
            ${type === 'user' ? avatar : ''}
        `;

        container.appendChild(messageDiv);
        container.scrollTop = container.scrollHeight;

        // Save to history
        this.messages.push({ content, type, sender, time: new Date().toISOString() });
        this.saveChatHistory();
    }

    formatMessage(text) {
        // Convert URLs to links
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        text = text.replace(urlRegex, '<a href="$1" target="_blank" style="color: #667eea;">$1</a>');
        
        // Convert line breaks
        text = text.replace(/\n/g, '<br>');
        
        return text;
    }

    showTypingIndicator() {
        document.getElementById('chatbotTyping').style.display = 'flex';
        document.getElementById('chatbotMessages').scrollTop = document.getElementById('chatbotMessages').scrollHeight;
    }

    hideTypingIndicator() {
        document.getElementById('chatbotTyping').style.display = 'none';
    }

    async processMessage(message) {
        const lowerMessage = message.toLowerCase();

        // Check for live chat keywords
        const liveChatKeywords = ['talk to admin', 'live chat', 'human', 'customer care', 'agent', 'real person'];
        if (liveChatKeywords.some(kw => lowerMessage.includes(kw))) {
            await this.handleLiveChatRequest();
            return;
        }

        // Check for WhatsApp
        const whatsappKeywords = ['whatsapp', 'whats app'];
        if (whatsappKeywords.some(kw => lowerMessage.includes(kw))) {
            this.redirectToWhatsApp();
            return;
        }

        // Check for order tracking
        if (lowerMessage.includes('track') && lowerMessage.includes('order')) {
            this.addMessage('To track your order, please enter your order number and we\'ll provide you with the latest status. You can also track orders from your account dashboard.', 'bot');
            return;
        }

        // Check for products/inquiry
        if (lowerMessage.includes('product') || lowerMessage.includes('show me') || lowerMessage.includes('browse')) {
            this.addMessage('You can browse all our products at <a href="/products" style="color: #667eea;">/products</a> or check our <a href="/categories" style="color: #667eea;">categories</a>. What type of products are you looking for?', 'bot');
            return;
        }

        // Check for prices/cost
        if (lowerMessage.includes('price') || lowerMessage.includes('cost') || lowerMessage.includes('how much')) {
            this.addMessage('You can find product prices on our product pages. Visit <a href="/products" style="color: #667eea;">/products</a> to browse and see pricing information.', 'bot');
            return;
        }

        // Check for shipping/delivery
        if (lowerMessage.includes('shipping') || lowerMessage.includes('delivery') || lowerMessage.includes('shipping')) {
            this.addMessage('We offer free shipping on orders above Tsh 50,000! Delivery typically takes 2-5 business days within Tanzania.', 'bot');
            return;
        }

        // Check for contact
        if (lowerMessage.includes('contact') || lowerMessage.includes('phone') || lowerMessage.includes('email') || lowerMessage.includes('location')) {
            this.addMessage('You can contact us via:\n• Email: support@omunjushoppers.com\n• Phone: +255 700 000 000\n• WhatsApp: +255 700 000 000\n• Visit our <a href="/contact" style="color: #667eea;">contact page</a> for more details.', 'bot');
            return;
        }

        // Check for about
        if (lowerMessage.includes('about') || lowerMessage.includes('who are you') || lowerMessage.includes('what is')) {
            this.addMessage('OMUNJU SHOPPERS is your premier online shopping destination. We offer a wide range of products including electronics, fashion, home goods, and more with fast delivery across Tanzania.', 'bot');
            return;
        }

        // Default response
        const defaultResponses = [
            'Thank you for your message! Could you please provide more details so I can assist you better?',
            'I understand. Let me help you with that. You can also try asking about our products, orders, or contact customer support.',
            'Thanks for reaching out! For immediate assistance, you can switch to live chat with our admin team or contact us on WhatsApp.',
            'I\'m here to help! For complex questions, I recommend talking to our live customer care team.'
        ];

        setTimeout(() => {
            const response = defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
            this.addMessage(response, 'bot');
        }, 1000);
    }

    async handleLiveChatRequest() {
        // Check admin status
        if (this.adminOnline) {
            this.currentMode = 'live_chat';
            this.addMessage('Admin is online! Connecting you now...', 'bot');
            
            // Notify admin
            if (this.socket) {
                this.socket.emit('request_live_chat', { userId: this.user?.id });
            }

            // Add live chat indicator
            const indicator = document.createElement('div');
            indicator.className = 'live-chat-indicator';
            indicator.innerHTML = '<i class="fas fa-user-tie"></i> Live chat with admin';
            indicator.id = 'liveChatIndicator';
            document.getElementById('chatbotMessages').appendChild(indicator);
        } else {
            this.addMessage('Admin is currently offline. Please leave a message or contact us on WhatsApp for immediate assistance.', 'bot');
            
            // Show offline form after 2 seconds
            setTimeout(() => {
                this.showOfflineForm();
            }, 2000);
        }
    }

    showOfflineForm() {
        const formHTML = `
            <div class="offline-form" style="background: white; padding: 20px; border-radius: 15px; margin-top: 15px;">
                <h4 style="margin: 0 0 15px; color: #333;">Leave us a message</h4>
                <input type="text" id="offlineName" placeholder="Your Name" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 8px; margin-bottom: 10px;">
                <input type="email" id="offlineEmail" placeholder="Email or Phone" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 8px; margin-bottom: 10px;">
                <textarea id="offlineMessage" placeholder="Your Message" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 8px; margin-bottom: 10px; min-height: 80px;"></textarea>
                <button onclick="chatbot.submitOfflineMessage()" style="width: 100%; padding: 12px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 8px; cursor: pointer;">Send Message</button>
            </div>
        `;
        this.addMessage(formHTML, 'bot');
    }

    submitOfflineMessage() {
        const name = document.getElementById('offlineName')?.value;
        const contact = document.getElementById('offlineEmail')?.value;
        const message = document.getElementById('offlineMessage')?.value;

        if (!name || !contact || !message) {
            alert('Please fill in all fields');
            return;
        }

        // Save to server
        fetch('/api/conversations/offline-message', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, contact, message })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                this.addMessage('Thank you! We\'ll get back to you within 24 hours.', 'bot');
            } else {
                this.addMessage('Failed to send message. Please try again.', 'bot');
            }
        })
        .catch(error => {
            console.error('Offline message error:', error);
            this.addMessage('Failed to send message. Please try again.', 'bot');
        });
    }

    redirectToWhatsApp() {
        const phoneNumber = '+255700000000'; // Replace with actual number
        const message = 'Hello OMUNJU SHOPPERS, I need assistance.';
        const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
    }
}

// Initialize chatbot
let chatbot;
document.addEventListener('DOMContentLoaded', () => {
    chatbot = new Chatbot();
});

// Make accessible globally
window.chatbot = chatbot;
