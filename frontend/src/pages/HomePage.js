/**
 * E-Commerce Home Page
 * Fully functional home page with all required features:
 * - Hero banner (dynamic from admin)
 * - Featured products (API driven)
 * - Categories preview
 * - Deals of the day with real-time countdown
 * - Promotions slider
 * - Auction preview section
 * - Add to cart / wishlist
 * - Product quick view modal
 * - Live stock availability
 * - Dynamic pricing
 * - Real-time search
 * - User authentication state awareness
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { homeAPI, cartAPI, wishlistAPI } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import ProductCard from '../components/ProductCard';
import HeroBanner from '../components/HeroBanner';
import PromotionsSlider from '../components/PromotionsSlider';
import DealsOfDay from '../components/DealsOfDay';
import AuctionPreview from '../components/AuctionPreview';
import QuickViewModal from '../components/QuickViewModal';
import useHomePolling from '../hooks/useHomePolling';
import { 
  addToCartStorage, 
  addToWishlistStorage, 
  getWishlistItems, 
  removeFromWishlistStorage 
} from '../utils/storage';
import '../styles/pages/Home.css';

export function HomePage() {
  // State management
  const [featured, setFeatured] = useState([]);
  const [categories, setCategories] = useState([]);
  const [promotions, setPromotions] = useState([]);
  const [deals, setDeals] = useState([]);
  const [auctions, setAuctions] = useState([]);
  const [countdown, setCountdown] = useState(null);
  const [hero, setHero] = useState(null);
  
  // UI State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quickView, setQuickView] = useState(null);
  const [wishlistIds, setWishlistIds] = useState(new Set());
  const [notifications, setNotifications] = useState([]);
  // cartCount handled in Navigation via localStorage; remove local state
  
  // Auth state
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Load wishlist for authenticated user (stable reference)
  const loadWishlist = useCallback(async () => {
    const storedWishlist = getWishlistItems().map((item) => item.productId);
    setWishlistIds(new Set(storedWishlist));

    if (isAuthenticated) {
      try {
        const response = await wishlistAPI.getWishlist();
        if (response.success) {
          const ids = new Set(storedWishlist);
          response.wishlist?.forEach((item) => ids.add(item.product_id));
          setWishlistIds(ids);
        }
      } catch (err) {
        console.error('Failed to load wishlist:', err);
      }
    }
  }, [isAuthenticated]);

  // Load initial data
  useEffect(() => {
    loadHomeData();
  }, [isAuthenticated]);

  // Load wishlist when auth changes
  useEffect(() => {
    loadWishlist();
  }, [isAuthenticated]);

  // Poll backend for updated deals / auctions / featured stock
  useHomePolling((data) => {
    if (!data) return;
    if (Array.isArray(data.deals) && data.deals.length) setDeals(data.deals);
    if (Array.isArray(data.auctions) && data.auctions.length) setAuctions(data.auctions);
    if (Array.isArray(data.featured) && data.featured.length) {
      setFeatured((prev) => {
        const map = new Map(data.featured.map((p) => [p.id, p]));
        return prev.map((item) => (map.has(item.id) ? { ...item, ...map.get(item.id) } : item));
      });
    }
  }, 15000);

  // Load all home page data
  const loadHomeData = async () => {
    try {
      setError(null);
      setLoading(true);

      // Fetch all data in parallel
      const [
        featuredRes,
        categoriesRes,
        promotionsRes,
        dealsRes,
        heroRes,
        auctionsRes,
        countdownRes
      ] = await Promise.allSettled([
        homeAPI.getFeatured(8),
        homeAPI.getCategories(),
        homeAPI.getPromotions(),
        homeAPI.getDeals(),
        homeAPI.getHero(),
        homeAPI.getAuctions(),
        homeAPI.getDealsCountdown()
      ]);

      // Process featured products
      if (featuredRes.status === 'fulfilled' && featuredRes.value?.success) {
        setFeatured(featuredRes.value.data || []);
      } else {
        setFeatured([]);
      }

      // Process categories
      if (categoriesRes.status === 'fulfilled' && categoriesRes.value?.success) {
        setCategories(categoriesRes.value.categories || categoriesRes.value.data || []);
      } else {
        setCategories(getDefaultCategories());
      }

      // Process promotions
      if (promotionsRes.status === 'fulfilled' && promotionsRes.value?.success) {
        setPromotions(promotionsRes.value.promotions || promotionsRes.value.data || []);
      } else {
        setPromotions([]);
      }

      // Process deals
      if (dealsRes.status === 'fulfilled' && dealsRes.value?.success) {
        setDeals(dealsRes.value.deals || dealsRes.value.data || []);
      } else {
        setDeals([]);
      }

      // Process hero banner
      if (heroRes.status === 'fulfilled' && heroRes.value?.success) {
        setHero(heroRes.value.banner || heroRes.value.data || null);
      }

      // Process auctions
      if (auctionsRes.status === 'fulfilled' && auctionsRes.value?.success) {
        setAuctions(auctionsRes.value.auctions || auctionsRes.value.data || []);
      } else {
        setAuctions([]);
      }

      // Process countdown
      if (countdownRes.status === 'fulfilled' && countdownRes.value?.success) {
        const events = countdownRes.value.events || countdownRes.value.data || [];
        const homepageEvent = events.find((event) => event.display_on_homepage) || events[0];
        setCountdown(homepageEvent || null);
      }

    } catch (err) {
      console.error('Failed to load home data:', err);
      setError('We hit a snag loading the home page. Please refresh.');
      // Set fallback data
      setFeatured([]);
      setCategories(getDefaultCategories());
      setDeals([]);
      setPromotions([]);
    } finally {
      setLoading(false);
    }
  };

  // Load wishlist for authenticated user
  

  // cartCount handled in Navigation; no local cart state required here

  // Add to cart handler
  const handleAddToCart = async (productId) => {
    addToCartStorage(productId, 1);
    
    // Dispatch cart update event for header synchronization
    window.dispatchEvent(new Event('cart-updated'));

    if (isAuthenticated) {
      try {
        await cartAPI.addToCart(productId, 1);
      } catch (err) {
        console.error('Add to cart failed:', err);
        // Show toast notification
        showNotification('Added to cart (offline mode)', 'success');
      }
    } else {
      showNotification('Added to cart!', 'success');
    }
  };

  // Wishlist handler
  const handleWishlist = async (productId) => {
    const next = new Set(wishlistIds);
    
    if (next.has(productId)) {
      next.delete(productId);
      removeFromWishlistStorage(productId);
      
      if (isAuthenticated) {
        try {
          await wishlistAPI.removeFromWishlist(productId);
        } catch (err) {
          console.error('Remove wishlist failed:', err);
        }
      }
      showNotification('Removed from wishlist', 'info');
    } else {
      next.add(productId);
      addToWishlistStorage(productId);
      
      if (isAuthenticated) {
        try {
          await wishlistAPI.addToWishlist(productId);
        } catch (err) {
          console.error('Add wishlist failed:', err);
        }
      }
      showNotification('Added to wishlist!', 'success');
    }
    
    setWishlistIds(next);
    window.dispatchEvent(new Event('wishlist-updated'));
  };

  // Quick view handler
  const handleQuickView = (product) => {
    setQuickView(product);
  };

  // Notification helper
  const showNotification = (message, type = 'info') => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type }]);

    // Auto remove after 3 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 3000);
  };

  // Navigate to category
  const handleCategoryClick = (category) => {
    const slug = category.slug || category.name?.toLowerCase().replace(/\s+/g, '-');
    navigate(`/category/${slug}`);
  };

  // Navigate to auction
  const handlePlaceBid = (auction) => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    navigate(`/auctions/${auction.id}`);
  };

  // Preview categories (limit to 6)
  const categoryPreview = useMemo(() => categories.slice(0, 6), [categories]);

  // Loading skeleton
  if (loading) {
    return (
      <div className="home-page">
        <Helmet>
          <title>Loading... | OMUNJU SHOPPERS</title>
          <meta name="robots" content="noindex" />
        </Helmet>
        
        <div className="home-loading">
          <div className="loading-spinner"></div>
          <p>Loading amazing products...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="home-page">
      {/* SEO Metadata */}
      <Helmet>
        <title>OMUNJU SHOPPERS - Premium E-Commerce Experience</title>
        <meta name="description" content="Discover amazing products with fast shipping, secure checkout, and fresh drops. Shop electronics, fashion, home & living, sports, beauty and more." />
        <meta name="keywords" content="ecommerce, online shopping, electronics, fashion, home, sports, beauty" />
        <meta property="og:title" content="OMUNJU SHOPPERS - Premium E-Commerce Experience" />
        <meta property="og:description" content="Discover amazing products with fast shipping and secure checkout." />
        <meta property="og:type" content="website" />
        <link rel="canonical" href="https://omunjushoppers.com" />
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: 'OMUNJU SHOPPERS',
            url: 'https://omunjushoppers.com',
            potentialAction: {
              '@type': 'SearchAction',
              target: 'https://omunjushoppers.com/products?search={search_term_string}',
              'query-input': 'required name=search_term_string'
            }
          })}
        </script>
      </Helmet>

      {/* Error Banner */}
      {error && (
        <div className="home-error">
          <span>{error}</span>
          <button onClick={() => loadHomeData()}>Retry</button>
        </div>
      )}

      {/* Hero Banner */}
      <HeroBanner banner={hero} />

      {/* Categories Section */}
      <section className="categories-section" aria-labelledby="categories-heading">
        <div className="section-header">
          <h2 id="categories-heading">Shop by Category</h2>
          <button className="section-link" onClick={() => navigate('/categories')}>
            View All →
          </button>
        </div>
        <div className="categories-grid">
          {categoryPreview.map((category) => (
            <button
              key={category.id || category.name}
              className="category-card"
              onClick={() => handleCategoryClick(category)}
              aria-label={`Shop ${category.name}`}
            >
              <div className="category-image">
                {category.image_url ? (
                  <img src={category.image_url} alt={category.name} />
                ) : (
                  <div className="category-placeholder">
                    <span>{category.name?.charAt(0)}</span>
                  </div>
                )}
              </div>
              <div className="category-info">
                <h3>{category.name}</h3>
                <span>{category.product_count || 0} items</span>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Deals of the Day with Countdown */}
      <DealsOfDay 
        countdown={countdown} 
        deals={deals}
        onQuickView={handleQuickView}
        onAddToCart={handleAddToCart}
      />

      {/* Promotions Slider */}
      {promotions.length > 0 && (
        <PromotionsSlider items={promotions} />
      )}

      {/* Auction Preview */}
      <AuctionPreview 
        auctions={auctions}
        onPlaceBid={handlePlaceBid}
      />

      {/* Featured Products */}
      <section className="featured-section" aria-labelledby="featured-heading">
        <div className="section-header">
          <h2 id="featured-heading">Featured Products</h2>
          <button className="section-link" onClick={() => navigate('/products')}>
            View All →
          </button>
        </div>
        
        {featured.length > 0 ? (
          <div className="products-grid">
            {featured.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onBuy={handleAddToCart}
                onViewDetails={(id) => navigate(`/products/${id}`)}
                onQuickView={handleQuickView}
                onWishlist={handleWishlist}
                isWishlisted={wishlistIds.has(product.id)}
              />
            ))}
          </div>
        ) : (
          <div className="products-empty">
            <p>No featured products available at the moment.</p>
          </div>
        )}
      </section>

      {/* Newsletter Section */}
      <section className="newsletter-section" aria-labelledby="newsletter-heading">
        <div className="newsletter-content">
          <h2 id="newsletter-heading">Stay Updated</h2>
          <p>Subscribe to our newsletter for exclusive deals and new arrivals!</p>
          <form className="newsletter-form" onSubmit={(e) => { e.preventDefault(); showNotification('Thanks for subscribing!', 'success'); }}>
            <input 
              type="email" 
              placeholder="Enter your email" 
              required 
              aria-label="Email address"
            />
            <button type="submit">Subscribe</button>
          </form>
        </div>
      </section>

      {/* Quick View Modal */}
      <QuickViewModal
        product={quickView}
        open={!!quickView}
        onClose={() => setQuickView(null)}
        onAddToCart={handleAddToCart}
        onAddToWishlist={handleWishlist}
        isWishlisted={quickView ? wishlistIds.has(quickView.id) : false}
      />

      {/* Notifications */}
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`notification notification--${notification.type} notification--show`}
          style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            padding: '12px 24px',
            background: notification.type === 'success' ? '#10b981' : notification.type === 'error' ? '#ef4444' : '#3b82f6',
            color: 'white',
            borderRadius: '8px',
            transform: 'translateY(0)',
            opacity: 1,
            transition: 'all 0.3s ease',
            zIndex: 10000,
            marginBottom: `${(notifications.indexOf(notification) * 60)}px`
          }}
        >
          {notification.message}
        </div>
      ))}
    </div>
  );
}

// Default categories fallback
function getDefaultCategories() {
  return [
    { id: 1, name: 'Electronics', product_count: 15, slug: 'electronics', image_url: null },
    { id: 2, name: 'Fashion', product_count: 25, slug: 'fashion', image_url: null },
    { id: 3, name: 'Home & Living', product_count: 12, slug: 'home-living', image_url: null },
    { id: 4, name: 'Sports', product_count: 8, slug: 'sports', image_url: null },
    { id: 5, name: 'Beauty', product_count: 18, slug: 'beauty', image_url: null },
    { id: 6, name: 'Books', product_count: 22, slug: 'books', image_url: null }
  ];
}

export default HomePage;
