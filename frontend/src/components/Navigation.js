/**
 * Navigation Component
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import '../styles/Navigation.css';
import SearchBar from './SearchBar';
import { authAPI } from '../services/api';


export function Navigation({ user, onLogout }) {
  const [cartCount, setCartCount] = useState(Number(localStorage.getItem('cartCount') || 0));
  const [wishlistCount, setWishlistCount] = useState(Number(localStorage.getItem('wishlistCount') || 0));
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(null);
  const [uploadingPicture, setUploadingPicture] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const syncCounts = () => {
      setCartCount(Number(localStorage.getItem('cartCount') || 0));
      setWishlistCount(Number(localStorage.getItem('wishlistCount') || 0));
    };

    const onStart = () => setSyncing(true);
    const onComplete = (e) => { setSyncing(false); setLastSync(e?.detail?.at || Date.now()); };

    window.addEventListener('storage', syncCounts);
    window.addEventListener('cart-updated', syncCounts);
    window.addEventListener('wishlist-updated', syncCounts);
    window.addEventListener('sync-start', onStart);
    window.addEventListener('sync-complete', onComplete);

    // Listen for user updates from other components
    const handleUserUpdate = (e) => {
      if (e.detail) {
        // Force re-render with new user data
        setPreviewImage(e.detail.profile_picture || null);
      }
    };
    window.addEventListener('user-updated', handleUserUpdate);

    // Close dropdowns when clicking outside
    const handleClickOutside = (event) => {
      if (!event.target.closest('.dropdown-container')) {
        setDropdownOpen(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      window.removeEventListener('storage', syncCounts);
      window.removeEventListener('cart-updated', syncCounts);
      window.removeEventListener('wishlist-updated', syncCounts);
      window.removeEventListener('sync-start', onStart);
      window.removeEventListener('sync-complete', onComplete);
      window.removeEventListener('user-updated', handleUserUpdate);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const toggleDropdown = (dropdownName) => {
    setDropdownOpen(dropdownOpen === dropdownName ? null : dropdownName);
  };

  const closeDropdown = () => {
    setDropdownOpen(null);
  };

  const handleFileChange = useCallback(async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      alert('Please select a valid image file (JPEG, PNG, GIF, or WebP)');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      alert('Image size must be less than 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewImage(e.target?.result);
    };
    reader.readAsDataURL(file);

    setUploadingPicture(true);
    const formData = new FormData();
    formData.append('profile_picture', file);

    try {
      const response = await authAPI.updateProfilePicture(formData);
      if (response.success) {
        localStorage.setItem('user', JSON.stringify(response.data));
        window.dispatchEvent(new CustomEvent('user-updated', { detail: response.data }));
        setPreviewImage(null);
        alert('Profile picture updated!');
      } else {
        setPreviewImage(null);
        alert(response.message || 'Failed to update');
      }
    } catch (error) {
      setPreviewImage(null);
      console.error('Upload error:', error);
      alert('Failed to upload');
    } finally {
      setUploadingPicture(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, []);

  const handleAvatarClick = () => {
    if (user) {
      toggleDropdown('account');
    } else {
      toggleDropdown('auth');
    }
  };

  const handleProfilePictureClick = () => {
    fileInputRef.current?.click();
  };

  const getUserInitial = () => {
    if (!user?.name) return 'U';
    return user.name.split(' ').map(n => n[0]).join('').charAt(0).toUpperCase();
  };

  return (
    <nav className="navbar">
      <div className="nav-container">
        <Link to="/" className="nav-logo">
          ShopHub
        </Link>

        <SearchBar />

        <ul className="nav-menu">
          <li className="nav-item">
            <Link to="/" className="nav-link">HOME</Link>
          </li>
          
          <li className="nav-item dropdown-container">
            <button 
              className="nav-link dropdown-toggle"
              onClick={() => toggleDropdown('shop')}
            >
              SHOP ▼
            </button>
            {dropdownOpen === 'shop' && (
              <ul className="dropdown-menu">
                <li><Link to="/products" className="dropdown-link" onClick={closeDropdown}>All Products</Link></li>
                <li><Link to="/categories" className="dropdown-link" onClick={closeDropdown}>Categories</Link></li>
                <li><Link to="/deals" className="dropdown-link" onClick={closeDropdown}>Deals</Link></li>
                <li><Link to="/promotions" className="dropdown-link" onClick={closeDropdown}>Promotions</Link></li>
                <li><Link to="/auctions" className="dropdown-link" onClick={closeDropdown}>Auctions</Link></li>
              </ul>
            )}
          </li>

          {/* User Avatar / Account */}
          <li className={`nav-item user-avatar-section ${dropdownOpen === 'account' ? 'active' : ''}`}>
            <button className="avatar-trigger" onClick={handleAvatarClick}>
              <div className={`avatar-circle ${uploadingPicture ? 'uploading' : ''}`}>
                {uploadingPicture ? (
                  <span className="avatar-spinner"></span>
                ) : previewImage || user?.profile_picture ? (
                  <img 
                    src={previewImage || user.profile_picture} 
                    alt="Profile"
                    className="avatar-img"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                ) : (
                  <span className="avatar-initial">{getUserInitial()}</span>
                )}
              </div>
              {user && <span className="avatar-name">{user.name?.split(' ')[0]}</span>}
              <span className="avatar-arrow">{dropdownOpen === 'account' ? '▲' : '▼'}</span>
            </button>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/jpeg,image/png,image/gif,image/webp"
              style={{ display: 'none' }}
            />

            {dropdownOpen === 'account' && (
              <div className="avatar-dropdown">
                {user && (
                  <div className="avatar-dropdown-header">
                    <div className="header-avatar">
                      {previewImage || user.profile_picture ? (
                        <img src={previewImage || user.profile_picture} alt="" />
                      ) : (
                        <span>{getUserInitial()}</span>
                      )}
                    </div>
                    <div className="header-info">
                      <strong>{user.name}</strong>
                      <span>{user.email}</span>
                    </div>
                  </div>
                )}
                
                <div className="avatar-dropdown-divider"></div>
                
                <ul className="avatar-dropdown-menu">
                  {user ? (
                    <>
                      <li>
                        <button onClick={() => { closeDropdown(); handleProfilePictureClick(); }}>
                          <span className="menu-icon">📷</span>
                          Change Photo
                        </button>
                      </li>
                      <li><Link to="/dashboard" onClick={closeDropdown}>📊 Dashboard</Link></li>
                      <li><Link to="/orders" onClick={closeDropdown}>📦 My Orders</Link></li>
                      <li><Link to="/profile" onClick={closeDropdown}>⚙️ Settings</Link></li>
                      <li><Link to="/notifications" onClick={closeDropdown}>🔔 Notifications</Link></li>
                      <li className="avatar-dropdown-divider"></li>
                      <li>
                        <button className="logout-btn" onClick={onLogout}>
                          🚪 Logout
                        </button>
                      </li>
                    </>
                  ) : (
                    <>
                      <li><Link to="/login" onClick={closeDropdown}>🔑 Login</Link></li>
                      <li><Link to="/register" onClick={closeDropdown}>📝 Sign Up</Link></li>
                    </>
                  )}
                </ul>
              </div>
            )}
          </li>

          {/* Cart & Wishlist for logged in users */}
          {user && (
            <li className="nav-item dropdown-container">
              <button 
                className="nav-link dropdown-toggle cart-btn"
                onClick={() => toggleDropdown('cart')}
              >
                🛒 Cart {cartCount > 0 && <span className="nav-badge">{cartCount}</span>}
              </button>
              {dropdownOpen === 'cart' && (
                <ul className="dropdown-menu">
                  <li><Link to="/cart" onClick={closeDropdown}>View Cart</Link></li>
                  <li><Link to="/wishlist" onClick={closeDropdown}>Wishlist {wishlistCount > 0 && `(${wishlistCount})`}</Link></li>
                </ul>
              )}
            </li>
          )}

          <li className="nav-item dropdown-container">
            <button 
              className="nav-link dropdown-toggle"
              onClick={() => toggleDropdown('info')}
            >
              INFO ▼
            </button>
            {dropdownOpen === 'info' && (
              <ul className="dropdown-menu">
                <li><Link to="/about" onClick={closeDropdown}>About Us</Link></li>
                <li><Link to="/contact" onClick={closeDropdown}>Contact</Link></li>
                <li><Link to="/help" onClick={closeDropdown}>Help</Link></li>
                <li><Link to="/terms" onClick={closeDropdown}>Terms</Link></li>
                <li><Link to="/privacy" onClick={closeDropdown}>Privacy</Link></li>
              </ul>
            )}
          </li>
        </ul>
      </div>
    </nav>
  );
}

export default Navigation;
