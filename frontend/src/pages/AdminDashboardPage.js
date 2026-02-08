import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import '../styles/pages/AdminDashboard.css';
import AdminSidebar from '../components/AdminSidebar';
import AdminHeader from '../components/AdminHeader';

const AdminDashboardPage = () => {
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalUsers: 0,
    totalProducts: 0,
    totalRevenue: 0,
    pendingOrders: 0,
    activeAuctions: 0
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [recentProducts, setRecentProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate API calls
    setTimeout(() => {
      setStats({
        totalOrders: 1247,
        totalUsers: 892,
        totalProducts: 156,
        totalRevenue: 45230.50,
        pendingOrders: 23,
        activeAuctions: 8
      });
      
      setRecentOrders([
        { id: '#ORD-001', customer: 'John Doe', amount: '$125.00', status: 'pending', date: '2024-01-15' },
        { id: '#ORD-002', customer: 'Jane Smith', amount: '$89.99', status: 'processing', date: '2024-01-15' },
        { id: '#ORD-003', customer: 'Bob Wilson', amount: '$245.50', status: 'delivered', date: '2024-01-14' },
        { id: '#ORD-004', customer: 'Alice Brown', amount: '$75.00', status: 'cancelled', date: '2024-01-14' }
      ]);
      
      setRecentProducts([
        { id: 1, name: 'Wireless Headphones', category: 'Electronics', price: '$99.99', stock: 50, status: 'active' },
        { id: 2, name: 'Smart Watch', category: 'Wearables', price: '$199.99', stock: 25, status: 'low' },
        { id: 3, name: 'Gaming Mouse', category: 'Accessories', price: '$49.99', stock: 0, status: 'out' },
        { id: 4, name: 'Mechanical Keyboard', category: 'Accessories', price: '$129.99', stock: 15, status: 'active' }
      ]);
      
      setLoading(false);
    }, 1000);
  }, []);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#f59e0b';
      case 'processing': return '#3b82f6';
      case 'delivered': return '#10b981';
      case 'cancelled': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getStockStatus = (stock) => {
    if (stock > 10) return { label: 'In Stock', color: '#10b981' };
    if (stock > 0) return { label: 'Low Stock', color: '#f59e0b' };
    return { label: 'Out of Stock', color: '#ef4444' };
  };

  if (loading) {
    return (
      <div className="admin-dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <AdminSidebar />
      
      <div className="admin-dashboard-main">
        <AdminHeader title="Dashboard" />
        
        <main className="admin-dashboard-content">
          {/* Welcome Section */}
          <div className="welcome-section">
            <div className="welcome-card">
              <div className="welcome-content">
                <h1>Welcome back, Admin</h1>
                <p>Here's what's happening with your store today.</p>
              </div>
              <div className="welcome-actions">
                <Link to="/admin/products" className="btn btn-primary">
                  <i className="fas fa-plus"></i> Add Product
                </Link>
                <Link to="/admin/orders" className="btn btn-secondary">
                  <i className="fas fa-shopping-cart"></i> View Orders
                </Link>
              </div>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="kpi-grid">
            <div className="kpi-card">
              <div className="kpi-icon orders">
                <i className="fas fa-shopping-cart"></i>
              </div>
              <div className="kpi-content">
                <div className="kpi-value">{stats.totalOrders.toLocaleString()}</div>
                <div className="kpi-label">Total Orders</div>
              </div>
            </div>

            <div className="kpi-card">
              <div className="kpi-icon users">
                <i className="fas fa-users"></i>
              </div>
              <div className="kpi-content">
                <div className="kpi-value">{stats.totalUsers.toLocaleString()}</div>
                <div className="kpi-label">Total Users</div>
              </div>
            </div>

            <div className="kpi-card">
              <div className="kpi-icon products">
                <i className="fas fa-box"></i>
              </div>
              <div className="kpi-content">
                <div className="kpi-value">{stats.totalProducts}</div>
                <div className="kpi-label">Total Products</div>
              </div>
            </div>

            <div className="kpi-card">
              <div className="kpi-icon revenue">
                <i className="fas fa-dollar-sign"></i>
              </div>
              <div className="kpi-content">
                <div className="kpi-value">{formatCurrency(stats.totalRevenue)}</div>
                <div className="kpi-label">Total Revenue</div>
              </div>
            </div>

            <div className="kpi-card">
              <div className="kpi-icon pending">
                <i className="fas fa-clock"></i>
              </div>
              <div className="kpi-content">
                <div className="kpi-value">{stats.pendingOrders}</div>
                <div className="kpi-label">Pending Orders</div>
              </div>
            </div>

            <div className="kpi-card">
              <div className="kpi-icon auctions">
                <i className="fas fa-gavel"></i>
              </div>
              <div className="kpi-content">
                <div className="kpi-value">{stats.activeAuctions}</div>
                <div className="kpi-label">Active Auctions</div>
              </div>
            </div>
          </div>

          {/* Charts and Data Grid */}
          <div className="dashboard-grid">
            {/* Sales Chart */}
            <div className="chart-card">
              <div className="card-header">
                <h3>Sales Overview</h3>
                <div className="chart-controls">
                  <button className="chart-btn active">Week</button>
                  <button className="chart-btn">Month</button>
                  <button className="chart-btn">Year</button>
                </div>
              </div>
              <div className="chart-placeholder">
                <p>Sales chart would be rendered here</p>
              </div>
            </div>

            {/* Order Status Chart */}
            <div className="chart-card">
              <div className="card-header">
                <h3>Order Status Distribution</h3>
              </div>
              <div className="chart-placeholder">
                <p>Status chart would be rendered here</p>
              </div>
            </div>

            {/* Recent Orders */}
            <div className="data-card">
              <div className="card-header">
                <h3>Recent Orders</h3>
                <Link to="/admin/orders" className="view-all-link">View All</Link>
              </div>
              <div className="data-table">
                <table>
                  <thead>
                    <tr>
                      <th>Order ID</th>
                      <th>Customer</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.map((order, index) => (
                      <tr key={index}>
                        <td><strong>{order.id}</strong></td>
                        <td>{order.customer}</td>
                        <td><strong>{order.amount}</strong></td>
                        <td>
                          <span 
                            className="status-badge"
                            style={{ backgroundColor: getStatusColor(order.status) }}
                          >
                            {order.status}
                          </span>
                        </td>
                        <td>{order.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recent Products */}
            <div className="data-card">
              <div className="card-header">
                <h3>Recent Products</h3>
                <Link to="/admin/products" className="view-all-link">View All</Link>
              </div>
              <div className="data-table">
                <table>
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Category</th>
                      <th>Price</th>
                      <th>Stock</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentProducts.map((product) => (
                      <tr key={product.id}>
                        <td><strong>{product.name}</strong></td>
                        <td>{product.category}</td>
                        <td><strong>{product.price}</strong></td>
                        <td>{product.stock}</td>
                        <td>
                          <span 
                            className="stock-badge"
                            style={{ backgroundColor: getStockStatus(product.stock).color }}
                          >
                            {getStockStatus(product.stock).label}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="quick-actions">
            <h3>Quick Actions</h3>
            <div className="actions-grid">
              <Link to="/admin/products" className="action-card">
                <div className="action-icon">
                  <i className="fas fa-plus-circle"></i>
                </div>
                <div className="action-content">
                  <h4>Add Product</h4>
                  <p>Create new product listing</p>
                </div>
              </Link>
              
              <Link to="/admin/orders" className="action-card">
                <div className="action-icon">
                  <i className="fas fa-tasks"></i>
                </div>
                <div className="action-content">
                  <h4>Manage Orders</h4>
                  <p>Process and track orders</p>
                </div>
              </Link>
              
              <Link to="/admin/users" className="action-card">
                <div className="action-icon">
                  <i className="fas fa-users"></i>
                </div>
                <div className="action-content">
                  <h4>Manage Users</h4>
                  <p>View and manage users</p>
                </div>
              </Link>
              
              <Link to="/admin/reports" className="action-card">
                <div className="action-icon">
                  <i className="fas fa-chart-bar"></i>
                </div>
                <div className="action-content">
                  <h4>Reports</h4>
                  <p>Generate business reports</p>
                </div>
              </Link>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminDashboardPage;