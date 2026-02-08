/**
 * Promotions Page
 * Full promotional campaigns display with coupon codes
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { useAuth } from '../hooks/useAuth';
import promotionsAPI from '../services/promotionsAPI';
import '../styles/pages/Promotions.css';

function PromotionsPage() {
    const { isAuthenticated, user } = useAuth();
    const [activeTab, setActiveTab] = useState('all');
    const [coupons, setCoupons] = useState([]);
    const [banners, setBanners] = useState([]);
    const [categoryPromotions, setCategoryPromotions] = useState([]);
    const [appliedCoupon, setAppliedCoupon] = useState(null);
    const [couponInput, setCouponInput] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [validationResult, setValidationResult] = useState(null);
    const [userHistory, setUserHistory] = useState([]);

    // Fetch promotions
    const fetchPromotions = useCallback(async () => {
        try {
            setLoading(true);
            const response = await promotionsAPI.getAll();
            
            if (response.success) {
                setCoupons(response.data.coupons || []);
                setBanners(response.data.banners || []);
                setCategoryPromotions(response.data.category || []);
                setError(null);
            }
        } catch (err) {
            setError('Failed to load promotions');
            console.error('Error fetching promotions:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    // Fetch user history
    const fetchUserHistory = useCallback(async () => {
        if (!isAuthenticated) return;
        
        try {
            const response = await promotionsAPI.getHistory();
            if (response.success) {
                setUserHistory(response.data || []);
            }
        } catch (err) {
            console.error('Error fetching history:', err);
        }
    }, [isAuthenticated]);

    useEffect(() => {
        fetchPromotions();
        fetchUserHistory();
    }, [fetchPromotions, fetchUserHistory]);

    // Validate coupon code
    const validateCoupon = async () => {
        if (!couponInput.trim()) {
            setValidationResult({ error: 'Please enter a coupon code' });
            return;
        }

        try {
            const response = await promotionsAPI.validateCoupon(couponInput.trim().toUpperCase());
            setValidationResult(response);
            
            if (response.valid) {
                setAppliedCoupon(response);
            }
        } catch (err) {
            setValidationResult({ error: 'Failed to validate coupon' });
        }
    };

    // Apply coupon
    const applyCoupon = async () => {
        if (!validationResult?.valid) return;

        try {
            const response = await promotionsAPI.applyCoupon(couponInput.trim().toUpperCase());
            if (response.success) {
                setAppliedCoupon(response);
                // Store in localStorage for cart persistence
                localStorage.setItem('appliedCoupon', JSON.stringify(response));
            }
        } catch (err) {
            setValidationResult({ error: 'Failed to apply coupon' });
        }
    };

    // Remove coupon
    const removeCoupon = () => {
        setAppliedCoupon(null);
        setCouponInput('');
        setValidationResult(null);
        localStorage.removeItem('appliedCoupon');
    };

    // Copy to clipboard
    const copyToClipboard = (code) => {
        navigator.clipboard.writeText(code);
        // Could add toast notification here
    };

    // Format date
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    // Filter coupons by type
    const filteredCoupons = activeTab === 'all' 
        ? coupons 
        : coupons.filter(c => c.type === activeTab);

    if (loading) {
        return (
            <div className="promotions-page">
                <Helmet>
                    <title>Promotions - Loading...</title>
                </Helmet>
                <div className="loading-container">
                    <div className="loading-spinner"></div>
                    <p>Loading promotions...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="promotions-page">
            <Helmet>
                <title>Promotions & Coupons - Shop the Best Deals</title>
                <meta name="description" content="Discover the latest promotions, coupon codes, and special offers. Save big on your favorite products with our exclusive discounts." />
            </Helmet>

            {/* Hero Banner */}
            <section className="promotions-hero">
                <div className="hero-content">
                    <h1>Exclusive Promotions</h1>
                    <p>Unlock amazing savings with our special offers and coupon codes</p>
                    
                    {/* Coupon Input Section */}
                    <div className="coupon-input-section">
                        <div className="coupon-input-wrapper">
                            <input
                                type="text"
                                placeholder="Enter coupon code"
                                value={couponInput}
                                onChange={(e) => setCouponInput(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && validateCoupon()}
                                className={validationResult?.error ? 'error' : ''}
                            />
                            <button 
                                onClick={validateCoupon}
                                className="btn-validate"
                            >
                                Apply
                            </button>
                        </div>
                        
                        {validationResult && (
                            <div className={`validation-result ${validationResult.error ? 'error' : 'success'}`}>
                                {validationResult.error ? (
                                    <span className="error-message">❌ {validationResult.error}</span>
                                ) : (
                                    <div className="success-message">
                                        <span>✅ Code applied!</span>
                                        <span className="discount-amount">
                                            Save ${validationResult.discount?.toFixed(2)}
                                        </span>
                                        <button onClick={applyCoupon} className="btn-confirm">
                                            Confirm
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {appliedCoupon && (
                            <div className="applied-coupon">
                                <span className="coupon-badge">
                                    🎉 {appliedCoupon.coupon_code} Applied
                                </span>
                                <span className="discount-info">
                                    -${appliedCoupon.discount?.toFixed(2)} saved!
                                </span>
                                <button onClick={removeCoupon} className="btn-remove">
                                    Remove
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* Active Banner Promotions */}
            {banners.length > 0 && (
                <section className="banner-promotions">
                    <h2>Special Offers</h2>
                    <div className="banner-grid">
                        {banners.map(banner => (
                            <div 
                                key={banner.id} 
                                className="banner-card"
                                style={{ backgroundColor: banner.background_color || '#f8f9fa' }}
                            >
                                {banner.image_url && (
                                    <img src={banner.image_url} alt={banner.title} />
                                )}
                                <div className="banner-content">
                                    <h3>{banner.title}</h3>
                                    {banner.subtitle && <p>{banner.subtitle}</p>}
                                    {banner.discount_value && (
                                        <span className="discount-badge">
                                            {banner.discount_type === 'percentage' 
                                                ? `${banner.discount_value}% OFF` 
                                                : `$${banner.discount_value} OFF`}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Tabs */}
            <section className="promotions-content">
                <div className="tabs">
                    <button 
                        className={`tab ${activeTab === 'all' ? 'active' : ''}`}
                        onClick={() => setActiveTab('all')}
                    >
                        All Offers
                    </button>
                    <button 
                        className={`tab ${activeTab === 'coupon' ? 'active' : ''}`}
                        onClick={() => setActiveTab('coupon')}
                    >
                        Coupon Codes
                    </button>
                    <button 
                        className={`tab ${activeTab === 'first_order' ? 'active' : ''}`}
                        onClick={() => setActiveTab('first_order')}
                    >
                        First Order
                    </button>
                    <button 
                        className={`tab ${activeTab === 'cart' ? 'active' : ''}`}
                        onClick={() => setActiveTab('cart')}
                    >
                        Cart Offers
                    </button>
                    <button 
                        className={`tab ${activeTab === 'seasonal' ? 'active' : ''}`}
                        onClick={() => setActiveTab('seasonal')}
                    >
                        Seasonal
                    </button>
                </div>

                {/* Coupon Cards */}
                <div className="coupons-grid">
                    {filteredCoupons.length === 0 ? (
                        <div className="no-promotions">
                            <p>No promotions available in this category.</p>
                        </div>
                    ) : (
                        filteredCoupons.map(promo => (
                            <CouponCard 
                                key={promo.id}
                                promotion={promo}
                                onCopy={copyToClipboard}
                                onApply={(code) => {
                                    setCouponInput(code);
                                    validateCoupon();
                                }}
                            />
                        ))
                    )}
                </div>
            </section>

            {/* Category Promotions */}
            {categoryPromotions.length > 0 && (
                <section className="category-promotions">
                    <h2>Category Deals</h2>
                    <div className="category-grid">
                        {categoryPromotions.map(promo => (
                            <div key={promo.id} className="category-card">
                                <div className="category-icon">
                                    {promo.discount_type === 'percentage' 
                                        ? `🔥 ${promo.discount_value}% OFF`
                                        : `💰 $${promo.discount_value} OFF`}
                                </div>
                                <h3>{promo.name}</h3>
                                <p>{promo.description}</p>
                                <span className="expiry">
                                    Valid until {formatDate(promo.end_date)}
                                </span>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* User Usage History */}
            {isAuthenticated && userHistory.length > 0 && (
                <section className="usage-history">
                    <h2>Your Promotions History</h2>
                    <div className="history-table">
                        <table>
                            <thead>
                                <tr>
                                    <th>Promotion</th>
                                    <th>Discount</th>
                                    <th>Date Used</th>
                                </tr>
                            </thead>
                            <tbody>
                                {userHistory.map((usage, index) => (
                                    <tr key={index}>
                                        <td>{usage.promotion_name}</td>
                                        <td className="discount">-${usage.discount_amount?.toFixed(2)}</td>
                                        <td>{formatDate(usage.used_at)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            )}

            {/* How to Use Section */}
            <section className="how-to-use">
                <h2>How to Use Coupons</h2>
                <div className="steps">
                    <div className="step">
                        <span className="step-number">1</span>
                        <h3>Browse Offers</h3>
                        <p>Explore our collection of coupon codes and promotional offers</p>
                    </div>
                    <div className="step">
                        <span className="step-number">2</span>
                        <h3>Copy Code</h3>
                        <p>Click on any coupon to copy the code to your clipboard</p>
                    </div>
                    <div className="step">
                        <span className="step-number">3</span>
                        <h3>Apply at Checkout</h3>
                        <p>Enter the code in the coupon field during checkout</p>
                    </div>
                    <div className="step">
                        <span className="step-number">4</span>
                        <h3>Enjoy Savings</h3>
                        <p>Your discount will be applied instantly!</p>
                    </div>
                </div>
            </section>
        </div>
    );
}

// Coupon Card Component
function CouponCard({ promotion, onCopy, onApply }) {
    const [copied, setCopied] = useState(false);
    const [isExpired, setIsExpired] = useState(new Date(promotion.end_date) < new Date());
    const [isUpcoming, setIsUpcoming] = useState(new Date(promotion.start_date) > new Date());

    const handleCopy = () => {
        if (promotion.coupon_code) {
            onCopy(promotion.coupon_code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const formatDiscount = () => {
        if (promotion.discount_type === 'percentage') {
            return `${promotion.discount_value}% OFF`;
        } else if (promotion.discount_type === 'fixed') {
            return `$${promotion.discount_value} OFF`;
        }
        return 'SPECIAL OFFER';
    };

    const formatExpiry = () => {
        const endDate = new Date(promotion.end_date);
        return endDate.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    if (isExpired) {
        return (
            <div className="coupon-card expired">
                <div className="coupon-content">
                    <div className="discount-value">
                        <span>{formatDiscount()}</span>
                    </div>
                    <div className="coupon-details">
                        <h3>{promotion.name}</h3>
                        <p>{promotion.description}</p>
                        <span className="expired-badge">Expired</span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="coupon-card">
            <div className="coupon-content">
                <div className="discount-value">
                    <span>{formatDiscount()}</span>
                </div>
                <div className="coupon-details">
                    <h3>{promotion.name}</h3>
                    <p>{promotion.description}</p>
                    {promotion.min_order_amount > 0 && (
                        <span className="min-order">
                            Min. order: ${promotion.min_order_amount}
                        </span>
                    )}
                    <span className="expiry-date">
                        Valid until {formatExpiry()}
                    </span>
                </div>
            </div>
            
            {promotion.coupon_code && (
                <div className="coupon-actions">
                    <div className="code-display">
                        <span className="code">{promotion.coupon_code}</span>
                        <button onClick={handleCopy} className="btn-copy">
                            {copied ? '✓ Copied!' : '📋 Copy'}
                        </button>
                    </div>
                    <button 
                        onClick={() => onApply(promotion.coupon_code)}
                        className="btn-use"
                    >
                        Use This Code
                    </button>
                </div>
            )}
            
            {promotion.usage_limit && (
                <div className="usage-info">
                    {promotion.usage_count >= promotion.usage_limit - 10 
                        ? <span className="limited">⚡ Limited quantity left!</span>
                        : <span>Used {promotion.usage_count || 0} times</span>
                    }
                </div>
            )}
        </div>
    );
}

export default PromotionsPage;
