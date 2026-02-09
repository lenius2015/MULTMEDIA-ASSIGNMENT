/**
 * Orders Page
 * Display user order history
 */

import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { orderAPI } from '../services/api';
import '../styles/pages/Orders.css';

export function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await orderAPI.getAll();
      if (response.success) {
        setOrders(response.data || []);
      } else {
        // Use mock data for demonstration
        setOrders([
          {
            id: 'ORD-001',
            date: '2024-01-15',
            status: 'delivered',
            total: 12500,
            items: [
              { id: 1, name: 'Smartphone X', quantity: 1, price: 10000, image: '/images/product-1.jpg' },
              { id: 2, name: 'Phone Case', quantity: 2, price: 1250, image: '/images/product-2.jpg' }
            ]
          },
          {
            id: 'ORD-002',
            date: '2024-01-20',
            status: 'shipped',
            total: 8500,
            items: [
              { id: 1, name: 'Wireless Headphones', quantity: 1, price: 8500, image: '/images/product-3.jpg' }
            ]
          },
          {
            id: 'ORD-003',
            date: '2024-01-25',
            status: 'processing',
            total: 25000,
            items: [
              { id: 1, name: 'Laptop Pro', quantity: 1, price: 25000, image: '/images/product-4.jpg' }
            ]
          }
        ]);
      }
    } catch (err) {
      setError('Failed to load orders');
      // Mock data as fallback
      setOrders([
        {
          id: 'ORD-001',
          date: '2024-01-15',
          status: 'delivered',
          total: 12500,
          items: [
            { id: 1, name: 'Smartphone X', quantity: 1, price: 10000, image: '/images/product-1.jpg' },
            { id: 2, name: 'Phone Case', quantity: 2, price: 1250, image: '/images/product-2.jpg' }
          ]
        },
        {
          id: 'ORD-002',
          date: '2024-01-20',
          status: 'shipped',
          total: 8500,
          items: [
            { id: 1, name: 'Wireless Headphones', quantity: 1, price: 8500, image: '/images/product-3.jpg' }
          ]
        },
        {
          id: 'ORD-003',
          date: '2024-01-25',
          status: 'processing',
          total: 25000,
          items: [
            { id: 1, name: 'Laptop Pro', quantity: 1, price: 25000, image: '/images/product-4.jpg' }
          ]
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      delivered: '#10b981',
      shipped: '#3b82f6',
      processing: '#f59e0b',
      cancelled: '#ef4444',
      pending: '#6b7280'
    };
    return colors[status] || colors.pending;
  };

  const getStatusText = (status) => {
    const texts = {
      delivered: 'Delivered',
      shipped: 'Shipped',
      processing: 'Processing',
      cancelled: 'Cancelled',
      pending: 'Pending'
    };
    return texts[status] || status;
  };

  const formatPrice = (price) => {
    return 'KSh ' + price.toLocaleString();
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-KE', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const filteredOrders = orders.filter(order => {
    if (filter === 'all') return true;
    return order.status === filter;
  });

  return (
    <div className="orders-page">
      <Helmet>
        <title>My Orders - ShopHub</title>
        <meta name="description" content="View your order history" />
      </Helmet>

      <div className="orders-container">
        <div className="orders-header">
          <h1>My Orders</h1>
          <p>Track and manage your orders</p>
        </div>

        {/* Order Filters */}
        <div className="orders-filters">
          <button 
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All Orders
          </button>
          <button 
            className={`filter-btn ${filter === 'processing' ? 'active' : ''}`}
            onClick={() => setFilter('processing')}
          >
            Processing
          </button>
          <button 
            className={`filter-btn ${filter === 'shipped' ? 'active' : ''}`}
            onClick={() => setFilter('shipped')}
          >
            Shipped
          </button>
          <button 
            className={`filter-btn ${filter === 'delivered' ? 'active' : ''}`}
            onClick={() => setFilter('delivered')}
          >
            Delivered
          </button>
        </div>

        {loading ? (
          <div className="orders-loading">
            <div className="loading-spinner"></div>
            <p>Loading your orders...</p>
          </div>
        ) : error ? (
          <div className="orders-error">
            <p>{error}</p>
            <button onClick={fetchOrders}>Try Again</button>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="orders-empty">
            <div className="empty-icon">📦</div>
            <h2>No orders found</h2>
            <p>You haven't placed any orders yet.</p>
            <Link to="/products" className="start-shopping-btn">
              Start Shopping
            </Link>
          </div>
        ) : (
          <div className="orders-list">
            {filteredOrders.map(order => (
              <div key={order.id} className="order-card">
                <div className="order-header">
                  <div className="order-info">
                    <span className="order-id">{order.id}</span>
                    <span className="order-date">{formatDate(order.date)}</span>
                  </div>
                  <div className="order-status" style={{ backgroundColor: getStatusColor(order.status) }}>
                    {getStatusText(order.status)}
                  </div>
                </div>

                <div className="order-items">
                  {order.items && order.items.slice(0, 3).map((item, index) => (
                    <div key={index} className="order-item">
                      <div className="item-image">
                        {item.image ? (
                          <img src={item.image} alt={item.name} />
                        ) : (
                          <div className="item-placeholder">📦</div>
                        )}
                      </div>
                      <div className="item-details">
                        <h4>{item.name}</h4>
                        <p>Qty: {item.quantity} × {formatPrice(item.price)}</p>
                      </div>
                    </div>
                  ))}
                  {order.items && order.items.length > 3 && (
                    <div className="more-items">
                      +{order.items.length - 3} more items
                    </div>
                  )}
                </div>

                <div className="order-footer">
                  <div className="order-total">
                    <span>Total:</span>
                    <strong>{formatPrice(order.total)}</strong>
                  </div>
                  <div className="order-actions">
                    <button className="view-details-btn">View Details</button>
                    {order.status === 'delivered' && (
                      <button className="reorder-btn">Buy Again</button>
                    )}
                    {order.status === 'shipped' && (
                      <button className="track-btn">Track Order</button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default OrdersPage;
