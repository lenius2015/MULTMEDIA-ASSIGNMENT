/**
 * Chat Popup Component
 * Floating chat button with popup chat window
 */

import React, { useState, useRef, useEffect } from 'react';
import '../styles/ChatPopup.css';

export function ChatPopup({ user }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { id: 1, type: 'bot', text: 'Hi there! 👋 How can I help you today?', time: new Date() }
  ]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      text: newMessage,
      time: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setNewMessage('');
    setIsTyping(true);

    // Simulate bot response
    setTimeout(() => {
      const botResponses = [
        "Thanks for your message! I'll get back to you shortly.",
        "Great question! Let me help you with that.",
        "I understand. Here's what you need to know...",
        "Our team is here to assist you. One moment please.",
        "That's a great choice! Let me show you more details."
      ];

      const botMessage = {
        id: Date.now() + 1,
        type: 'bot',
        text: botResponses[Math.floor(Math.random() * botResponses.length)],
        time: new Date()
      };

      setMessages(prev => [...prev, botMessage]);
      setIsTyping(false);
    }, 1500);
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-KE', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className={`chat-popup ${isOpen ? 'open' : ''}`}>
      {/* Chat Button */}
      <button 
        className="chat-toggle-btn"
        onClick={() => setIsOpen(!isOpen)}
        title="Chat with us"
      >
        {isOpen ? (
          <span className="close-icon">✕</span>
        ) : (
          <span className="chat-icon">💬</span>
        )}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="chat-window">
          <div className="chat-header">
            <div className="chat-header-info">
              <div className="chat-avatar">🛍️</div>
              <div>
                <h3>ShopHub Support</h3>
                <span className="chat-status">Online</span>
              </div>
            </div>
            <button className="chat-minimize" onClick={() => setIsOpen(false)}>
              ✕
            </button>
          </div>

          <div className="chat-messages">
            {messages.map(msg => (
              <div 
                key={msg.id} 
                className={`message ${msg.type === 'user' ? 'user' : 'bot'}`}
              >
                <div className="message-content">
                  <p>{msg.text}</p>
                  <span className="message-time">{formatTime(msg.time)}</span>
                </div>
              </div>
            ))}
            
            {isTyping && (
              <div className="message bot typing">
                <div className="message-content">
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          <form className="chat-input" onSubmit={handleSendMessage}>
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              disabled={isTyping}
            />
            <button 
              type="submit" 
              disabled={!newMessage.trim() || isTyping}
              className="send-btn"
            >
              ➤
            </button>
          </form>

          <div className="chat-footer">
            <p>We usually reply within a few minutes</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default ChatPopup;
