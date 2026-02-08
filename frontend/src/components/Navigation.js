/**
 * Navigation Component
 */

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import '../styles/Navigation.css';
import SearchBar from './SearchBar';


export function Navigation({ user, onLogout }) {
  const [cartCount, setCartCount] = useState(Number(localStorage.getItem('cartCount') || 0));
  const [wishlistCount, setWishlistCount] = useState(Number(localStorage.getItem('wishlistCount') || 0));
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

    // Close dropdowns when clicking outside
    const handleClickOutside = (event) => {
      if (!event.target.closest('.dropdown-container')) {
        setDropdownOpen(null);
      }
      if (!event.target.closest('.nav-menu') && !event.target.closest('.nav-logo')) {
        setMobileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      window.removeEventListener('storage', syncCounts);
      window.removeEventListener('cart-updated', syncCounts);
      window.removeEventListener('wishlist-updated', syncCounts);
      window.removeEventListener('sync-start', onStart);
      window.removeEventListener('sync-complete', onComplete);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const toggleDropdown = (dropdownName) => {
    setDropdownOpen(dropdownOpen === dropdownName ? null : dropdownName);
  };

  const closeDropdown = () => {
    setDropdownOpen(null);
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
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
            <Link to="/" className="nav-link">
              HOME
            </Link>
          </li>
          
          {/* Shop Dropdown */}
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
                <li><Link to="/deals" className="dropdown-link" onClick={closeDropdown}>Deals of the Day</Link></li>
                <li><Link to="/promotions" className="dropdown-link" onClick={closeDropdown}>Special Promotions</Link></li>
                <li><Link to="/auctions" className="dropdown-link" onClick={closeDropdown}>Live Auctions</Link></li>
              </ul>
            )}
          </li>

          {/* Account Dropdown */}
          {user ? (
            <li className="nav-item dropdown-container">
              <button 
                className="nav-link dropdown-toggle"
                onClick={() => toggleDropdown('account')}
              >
                ACCOUNT ▼
              </button>
              {dropdownOpen === 'account' && (
                <ul className="dropdown-menu">
                  <li><Link to="/dashboard" className="dropdown-link" onClick={closeDropdown}>My Dashboard</Link></li>
                  <li><Link to="/orders" className="dropdown-link" onClick={closeDropdown}>Order History</Link></li>
                  <li><Link to="/profile" className="dropdown-link" onClick={closeDropdown}>Account Settings</Link></li>
                  <li><Link to="/notifications" className="dropdown-link" onClick={closeDropdown}>Notifications</Link></li>
                </ul>
              )}
            </li>
          ) : (
            <li className="nav-item dropdown-container">
              <button 
                className="nav-link dropdown-toggle"
                onClick={() => toggleDropdown('auth')}
              >
                ACCOUNT ▼
              </button>
              {dropdownOpen === 'auth' && (
                <ul className="dropdown-menu">
                  <li><Link to="/login" className="dropdown-link" onClick={closeDropdown}>Login</Link></li>
                  <li><Link to="/register" className="dropdown-link" onClick={closeDropdown}>Sign Up</Link></li>
                </ul>
              )}
            </li>
          )}

          {/* My Stuff Dropdown */}
          {user && (
            <li className="nav-item dropdown-container">
              <button 
                className="nav-link dropdown-toggle"
                onClick={() => toggleDropdown('mystuff')}
              >
                MY STUFF ▼
              </button>
              {dropdownOpen === 'mystuff' && (
                <ul className="dropdown-menu">
                  <li><Link to="/cart" className="dropdown-link" onClick={closeDropdown}>
                    Cart {cartCount > 0 && <span className="nav-badge">{cartCount}</span>}
                  </Link></li>
                  <li><Link to="/wishlist" className="dropdown-link" onClick={closeDropdown}>
                    Wishlist {wishlistCount > 0 && <span className="nav-badge">{wishlistCount}</span>}
                  </Link></li>
                </ul>
              )}
            </li>
          )}

          {/* Info Dropdown */}
          <li className="nav-item dropdown-container">
            <button 
              className="nav-link dropdown-toggle"
              onClick={() => toggleDropdown('info')}
            >
              INFO ▼
            </button>
            {dropdownOpen === 'info' && (
              <ul className="dropdown-menu">
                <li><Link to="/about" className="dropdown-link" onClick={closeDropdown}>About Us</Link></li>
                <li><Link to="/contact" className="dropdown-link" onClick={closeDropdown}>Contact Us</Link></li>
                <li><Link to="/help" className="dropdown-link" onClick={closeDropdown}>Help & Support</Link></li>
                <li><Link to="/terms" className="dropdown-link" onClick={closeDropdown}>Terms of Service</Link></li>
                <li><Link to="/privacy" className="dropdown-link" onClick={closeDropdown}>Privacy Policy</Link></li>
              </ul>
            )}
          </li>

          {/* User Actions */}
          {user ? (
            <>
              <li className="nav-item nav-sync">
                {syncing ? (
                  <span className="sync-dot sync-dot--active" title="Syncing…">●</span>
                ) : lastSync ? (
                  <span className="sync-dot" title={`Last sync: ${new Date(lastSync).toLocaleTimeString()}`}>●</span>
                ) : null}
              </li>
              <li className="nav-item">
                <button className="nav-logout" onClick={onLogout}>
                  LOGOUT
                </button>
              </li>
            </>
          ) : null}
        </ul>
      </div>
    </nav>
  );
}

export default Navigation;
