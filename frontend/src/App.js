/**
 * Main App Component
 * Root component with routing
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { useAuth } from './hooks/useAuth';
import { syncCartWithServer, syncWishlistWithServer } from './utils/sync';
import notify from './utils/notify';
import ErrorBoundary from './components/ErrorBoundary';

// Components
import Navigation from './components/Navigation';
import ChatPopup from './components/ChatPopup';

// Pages
import HomePage from './pages/HomePage';
import CategoryPage from './pages/CategoryPage';
import DealsPage from './pages/DealsPage';
import PromotionsPage from './pages/PromotionsPage';
import AuctionsPage from './pages/AuctionsPage';
import ProductsPage from './pages/ProductsPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AboutPage from './pages/AboutPage';
import ContactPage from './pages/ContactPage';
import DashboardPage from './pages/DashboardPage';
import ProfilePage from './pages/ProfilePage';
import OrdersPage from './pages/OrdersPage';
import AdminDashboardPage from './pages/AdminDashboardPage';

import './App.css';

// Protected Route Wrapper
function ProtectedRoute({ children, isAuthenticated, loading }) {
  if (loading) return <div className="loading">Loading...</div>;
  return isAuthenticated ? children : <Navigate to="/login" />;
}

function App() {
  const { user, isAuthenticated, loading, logout } = useAuth();

  // When user becomes authenticated, attempt to sync any localStorage cart/wishlist
  React.useEffect(() => {
    if (!isAuthenticated) return;
    (async () => {
      // signal sync start
      window.dispatchEvent(new CustomEvent('sync-start'));
      try {
        const c = await syncCartWithServer();
        if (c?.synced) notify(`Synced ${c.synced}/${c.total} cart items`, 'success');
      } catch (e) {
        console.error('cart sync failed', e);
        notify('Cart sync failed', 'error');
      }
      try {
        const w = await syncWishlistWithServer();
        if (w?.synced) notify(`Synced ${w.synced}/${w.total} wishlist items`, 'success');
      } catch (e) {
        console.error('wishlist sync failed', e);
        notify('Wishlist sync failed', 'error');
      }
      // notify others and signal sync complete with timestamp
      window.dispatchEvent(new Event('cart-updated'));
      window.dispatchEvent(new Event('wishlist-updated'));
      window.dispatchEvent(new CustomEvent('sync-complete', { detail: { at: Date.now() } }));
    })();
  }, [isAuthenticated]);

  return (
    <HelmetProvider>
      <Router>
        <div className="app">
          <Navigation user={user} onLogout={logout} />
          
          <main className="app-main">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<HomePage />} />
              <Route path="/category/:slug" element={<CategoryPage />} />
              <Route path="/deals" element={<DealsPage />} />
              <Route path="/deals/:slug" element={<DealsPage />} />
              <Route path="/promotions" element={<PromotionsPage />} />
              <Route path="/auctions" element={<AuctionsPage />} />
              <Route path="/auctions/:id" element={<AuctionsPage />} />
              <Route path="/products" element={<ProductsPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/contact" element={<ContactPage />} />
              
              {/* Auth Routes */}
              <Route 
                path="/login" 
                element={isAuthenticated ? <Navigate to="/" /> : <LoginPage />} 
              />
              <Route 
                path="/register" 
                element={isAuthenticated ? <Navigate to="/" /> : <RegisterPage />} 
              />

              {/* Protected Routes */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute isAuthenticated={isAuthenticated} loading={loading}>
                    <DashboardPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/orders"
                element={
                  <ProtectedRoute isAuthenticated={isAuthenticated} loading={loading}>
                    <OrdersPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/cart"
                element={
                  <ProtectedRoute isAuthenticated={isAuthenticated} loading={loading}>
                    <div className="page">
                      <h1>Shopping Cart</h1>
                      <p>Cart feature coming soon...</p>
                    </div>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/wishlist"
                element={
                  <ProtectedRoute isAuthenticated={isAuthenticated} loading={loading}>
                    <div className="page">
                      <h1>My Wishlist</h1>
                      <p>Wishlist feature coming soon...</p>
                    </div>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/notifications"
                element={
                  <ProtectedRoute isAuthenticated={isAuthenticated} loading={loading}>
                    <div className="page">
                      <h1>Notifications</h1>
                      <p>Notifications feature coming soon...</p>
                    </div>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/profile"
                element={
                  <ProtectedRoute isAuthenticated={isAuthenticated} loading={loading}>
                    <ProfilePage />
                  </ProtectedRoute>
                }
              />

              {/* Admin Routes */}
              <Route
                path="/admin/dashboard"
                element={
                  <ProtectedRoute isAuthenticated={isAuthenticated} loading={loading}>
                    <AdminDashboardPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin/products"
                element={
                  <ProtectedRoute isAuthenticated={isAuthenticated} loading={loading}>
                    <div className="page">
                      <h1>Admin Products</h1>
                      <p>Product management coming soon...</p>
                    </div>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin/orders"
                element={
                  <ProtectedRoute isAuthenticated={isAuthenticated} loading={loading}>
                    <div className="page">
                      <h1>Admin Orders</h1>
                      <p>Order management coming soon...</p>
                    </div>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin/users"
                element={
                  <ProtectedRoute isAuthenticated={isAuthenticated} loading={loading}>
                    <div className="page">
                      <h1>Admin Users</h1>
                      <p>User management coming soon...</p>
                    </div>
                  </ProtectedRoute>
                }
              />

              {/* 404 Page */}
              <Route 
                path="*" 
                element={
                  <div className="page">
                    <h1>404 - Page Not Found</h1>
                  </div>
                } 
              />
            </Routes>
          </main>

          {/* Footer */}
          <footer className="app-footer">
            <p>&copy; 2024 OMUNJU SHOPPERS. All rights reserved.</p>
          </footer>

          {/* Chat Popup */}
          <ChatPopup user={user} />
        </div>
      </Router>
    </HelmetProvider>
  );
}

export default App;
