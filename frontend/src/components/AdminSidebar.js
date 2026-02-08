import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import '../styles/AdminSidebar.css';

const AdminSidebar = () => {
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const menuItems = [
    {
      title: 'Dashboard',
      icon: 'fas fa-tachometer-alt',
      path: '/admin/dashboard'
    },
    {
      title: 'Products',
      icon: 'fas fa-box',
      path: '/admin/products'
    },
    {
      title: 'Orders',
      icon: 'fas fa-shopping-cart',
      path: '/admin/orders'
    },
    {
      title: 'Users',
      icon: 'fas fa-users',
      path: '/admin/users'
    },
    {
      title: 'Categories',
      icon: 'fas fa-tags',
      path: '/admin/categories'
    },
    {
      title: 'Auctions',
      icon: 'fas fa-gavel',
      path: '/admin/auctions'
    },
    {
      title: 'Promotions',
      icon: 'fas fa-percentage',
      path: '/admin/promotions'
    },
    {
      title: 'Deals',
      icon: 'fas fa-gift',
      path: '/admin/deals'
    },
    {
      title: 'Messages',
      icon: 'fas fa-envelope',
      path: '/admin/messages'
    },
    {
      title: 'Reports',
      icon: 'fas fa-chart-bar',
      path: '/admin/reports'
    },
    {
      title: 'Settings',
      icon: 'fas fa-cog',
      path: '/admin/settings'
    }
  ];

  const isActive = (path) => {
    return location.pathname === path;
  };

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <div className={`admin-sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <div className="sidebar-brand">
          <i className="fas fa-store"></i>
          <span className="brand-text">Admin Panel</span>
        </div>
        <button className="sidebar-toggle" onClick={toggleSidebar}>
          <i className="fas fa-bars"></i>
        </button>
      </div>

      <nav className="sidebar-nav">
        <ul className="nav-list">
          {menuItems.map((item, index) => (
            <li key={index} className={`nav-item ${isActive(item.path) ? 'active' : ''}`}>
              <Link to={item.path} className="nav-link">
                <i className={item.icon}></i>
                <span className="nav-text">{item.title}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="sidebar-footer">
        <div className="user-info">
          <div className="user-avatar">
            <i className="fas fa-user"></i>
          </div>
          <div className="user-details">
            <div className="user-name">Admin User</div>
            <div className="user-role">Administrator</div>
          </div>
        </div>
        <div className="sidebar-actions">
          <Link to="/admin/profile" className="sidebar-action">
            <i className="fas fa-user-cog"></i>
            <span>Profile</span>
          </Link>
          <button className="sidebar-action logout">
            <i className="fas fa-sign-out-alt"></i>
            <span>Logout</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminSidebar;