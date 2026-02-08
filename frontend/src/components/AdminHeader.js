import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import '../styles/AdminHeader.css';

const AdminHeader = ({ title, breadcrumbs = [] }) => {
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const notifications = [
    { id: 1, message: 'New order received', time: '2 minutes ago', type: 'order' },
    { id: 2, message: 'Product out of stock', time: '1 hour ago', type: 'warning' },
    { id: 3, message: 'User registration', time: '3 hours ago', type: 'user' },
    { id: 4, message: 'System update available', time: '1 day ago', type: 'system' }
  ];

  const toggleNotifications = () => {
    setIsNotificationsOpen(!isNotificationsOpen);
    setIsUserMenuOpen(false);
  };

  const toggleUserMenu = () => {
    setIsUserMenuOpen(!isUserMenuOpen);
    setIsNotificationsOpen(false);
  };

  const markAsRead = (id) => {
    // Mark notification as read
    console.log('Marking notification as read:', id);
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'order': return 'fas fa-shopping-cart';
      case 'warning': return 'fas fa-exclamation-triangle';
      case 'user': return 'fas fa-user-plus';
      case 'system': return 'fas fa-cog';
      default: return 'fas fa-bell';
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case 'order': return '#3b82f6';
      case 'warning': return '#f59e0b';
      case 'user': return '#10b981';
      case 'system': return '#8b5cf6';
      default: return '#6b7280';
    }
  };

  return (
    <header className="admin-header">
      <div className="header-top">
        <div className="header-left">
          <button className="mobile-menu-toggle">
            <i className="fas fa-bars"></i>
          </button>
          <div className="header-title">
            <h1>{title}</h1>
            {breadcrumbs.length > 0 && (
              <div className="breadcrumbs">
                {breadcrumbs.map((crumb, index) => (
                  <React.Fragment key={index}>
                    <Link to={crumb.path}>{crumb.label}</Link>
                    {index < breadcrumbs.length - 1 && <span>/</span>}
                  </React.Fragment>
                ))}
              </div>
            )}
          </div>
        </div>
        
        <div className="header-right">
          {/* Search Bar */}
          <div className="search-bar">
            <i className="fas fa-search"></i>
            <input type="text" placeholder="Search..." />
          </div>

          {/* Notifications */}
          <div className="notification-dropdown">
            <button className="notification-btn" onClick={toggleNotifications}>
              <i className="fas fa-bell"></i>
              {notifications.length > 0 && (
                <span className="notification-badge">{notifications.length}</span>
              )}
            </button>
            
            {isNotificationsOpen && (
              <div className="notification-panel">
                <div className="notification-header">
                  <h4>Notifications</h4>
                  <span className="notification-count">{notifications.length} new</span>
                </div>
                
                <div className="notification-list">
                  {notifications.map((notification) => (
                    <div 
                      key={notification.id} 
                      className="notification-item"
                      onClick={() => markAsRead(notification.id)}
                    >
                      <div className="notification-icon" style={{ backgroundColor: getNotificationColor(notification.type) }}>
                        <i className={getNotificationIcon(notification.type)}></i>
                      </div>
                      <div className="notification-content">
                        <p>{notification.message}</p>
                        <span className="notification-time">{notification.time}</span>
                      </div>
                      <button className="mark-read-btn">
                        <i className="fas fa-check"></i>
                      </button>
                    </div>
                  ))}
                </div>
                
                <div className="notification-footer">
                  <Link to="/admin/notifications" className="view-all-btn">View All Notifications</Link>
                </div>
              </div>
            )}
          </div>

          {/* User Menu */}
          <div className="user-dropdown">
            <button className="user-btn" onClick={toggleUserMenu}>
              <div className="user-avatar">
                <i className="fas fa-user"></i>
              </div>
              <span className="user-name">Admin User</span>
              <i className="fas fa-chevron-down"></i>
            </button>
            
            {isUserMenuOpen && (
              <div className="user-panel">
                <div className="user-info">
                  <div className="user-avatar-large">
                    <i className="fas fa-user"></i>
                  </div>
                  <div className="user-details">
                    <div className="user-name">Admin User</div>
                    <div className="user-email">admin@shop.com</div>
                  </div>
                </div>
                
                <div className="user-actions">
                  <Link to="/admin/profile" className="user-action">
                    <i className="fas fa-user-cog"></i>
                    <span>Profile Settings</span>
                  </Link>
                  <Link to="/admin/security" className="user-action">
                    <i className="fas fa-shield-alt"></i>
                    <span>Security</span>
                  </Link>
                  <Link to="/admin/activity" className="user-action">
                    <i className="fas fa-history"></i>
                    <span>Activity Log</span>
                  </Link>
                </div>
                
                <div className="user-footer">
                  <button className="logout-btn">
                    <i className="fas fa-sign-out-alt"></i>
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default AdminHeader;