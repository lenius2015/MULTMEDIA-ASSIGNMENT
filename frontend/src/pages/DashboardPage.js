/**
 * Dashboard Page
 * Real dashboard component that fetches data from backend
 */

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { dashboardAPI } from '../services/api';
import '../styles/pages/Dashboard.css';

export default function DashboardPage() {
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [cartCount, setCartCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const response = await dashboardAPI.getDashboard();
        if (response.success) {
          setUser(response.user);
          setOrders(response.orders || []);
          setCartCount(response.cartCount || 0);
        } else {
          setError(response.message || 'Failed to load dashboard');
        }
      } catch (err) {
        console.error('Dashboard fetch error:', err);
        setError(err.message || 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="dashboard-page">
        <div className="dashboard-loading">
          <div className="loading-spinner"></div>
          <p>Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-page">
        <div className="dashboard-error">
          <h2>Oops! Something went wrong</h2>
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>Try Again</button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-container">
        {/* Welcome Section */}
        <div className="dashboard-welcome">
          <div className="welcome-content">
            <h1>Welcome back, {user?.name || 'User'}!</h1>
            <p>Manage your account, track orders, and more.</p>
          </div>
          <div className="welcome-actions">
            <Link to="/profile" className="btn btn-primary">Edit Profile</Link>
            <Link to="/cart" className="btn btn-secondary">View Cart ({cartCount})</Link>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="dashboard-stats">
          <div className="stat-card">
            <div className="stat-icon">📦</div>
            <div className="stat-info">
              <h3>{orders.length}</h3>
              <p>Total Orders</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🛒</div>
            <div className="stat-info">
              <h3>{cartCount}</h3>
              <p>Cart Items</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">💳</div>
            <div className="stat-info">
              <h3>{user?.role === 'user' ? 'Regular' : user?.role}</h3>
              <p>Account Type</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">📅</div>
            <div className="stat-info">
              <h3>{user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}</h3>
              <p>Member Since</p>
            </div>
          </div>
        </div>

        {/* Account Info */}
        <div className="dashboard-section">
          <div className="section-header">
            <h2>Account Information</h2>
            <Link to="/profile" className="section-link">Edit</Link>
          </div>
          <div className="account-info-card">
            <div className="info-row">
              <span className="info-label">Name:</span>
              <span className="info-value">{user?.name || 'Not set'}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Email:</span>
              <span className="info-value">{user?.email || 'Not set'}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Phone:</span>
              <span className="info-value">{user?.phone || 'Not set'}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Address:</span>
              <span className="info-value">{user?.address || 'Not set'}</span>
            </div>
          </div>
        </div>

        {/* Recent Orders */}
        <div className="dashboard-section">
          <div className="section-header">
            <h2>Recent Orders</h2>
            <Link to="/orders" className="section-link">View All</Link>
          </div>
          {orders.length > 0 ? (
            <div className="orders-list">
              {orders.slice(0, 5).map((order) => (
                <div key={order.id} className="order-card">
                  <div className="order-header">
                    <span className="order-id">Order #{order.id}</span>
                    <span className={`order-status status-${order.status}`}>{order.status}</span>
                  </div>
                  <div className="order-details">
                    <p>Date: {new Date(order.created_at).toLocaleDateString()}</p>
                    <p>Total: ${order.total?.toFixed(2) || '0.00'}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <p>No orders yet</p>
              <Link to="/products" className="btn btn-primary">Start Shopping</Link>
            </div>
          )}
        </div>

        {/* Quick Links */}
        <div className="dashboard-quick-links">
          <Link to="/wishlist" className="quick-link">
            <span className="link-icon">❤️</span>
            <span className="link-text">My Wishlist</span>
          </Link>
          <Link to="/orders" className="quick-link">
            <span className="link-icon">📦</span>
            <span className="link-text">Order History</span>
          </Link>
          <Link to="/profile" className="quick-link">
            <span className="link-icon">👤</span>
            <span className="link-text">Edit Profile</span>
          </Link>
          <Link to="/notifications" className="quick-link">
            <span className="link-icon">🔔</span>
            <span className="link-text">Notifications</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
