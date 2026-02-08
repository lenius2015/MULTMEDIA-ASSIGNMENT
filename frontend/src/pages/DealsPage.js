/**
 * Advanced Deals Page
 * Real-time deals with countdown, stock tracking, and purchase validation
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { dealsAPI, cartAPI } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import ProductCard from '../components/ProductCard';
import { addToCartStorage } from '../utils/storage';
import '../styles/pages/Deals.css';

export function DealsPage() {
    const navigate = useNavigate();
    const { isAuthenticated } = useAuth();

    // State
    const [deals, setDeals] = useState([]);
    const [featuredDeal, setFeaturedDeal] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filter, setFilter] = useState('all'); // all, flash_sale, daily_deal, clearance, bundle
    const [sortBy, setSortBy] = useState('ending_soon');
    const [serverTime, setServerTime] = useState(null);
    
    // Real-time update interval
    const countdownInterval = useRef(null);
    const pollInterval = useRef(null);

    // Load deals on mount
    useEffect(() => {
        loadDeals();
        
        // Start real-time updates
        startRealTimeUpdates();

        return () => {
            stopRealTimeUpdates();
        };
    }, []);

    // Reload when filter changes
    useEffect(() => {
        loadDeals();
    }, [filter]);

    // Start real-time countdown updates
    const startRealTimeUpdates = () => {
        // Update countdowns every second
        countdownInterval.current = setInterval(() => {
            setDeals(prev => prev.map(deal => updateCountdown(deal)));
            if (featuredDeal) {
                setFeaturedDeal(prev => prev ? updateCountdown(prev) : null);
            }
        }, 1000);

        // Poll server for stock updates every 5 seconds
        pollInterval.current = setInterval(async () => {
            await syncDealsWithServer();
        }, 5000);
    };

    // Stop real-time updates
    const stopRealTimeUpdates = () => {
        if (countdownInterval.current) {
            clearInterval(countdownInterval.current);
        }
        if (pollInterval.current) {
            clearInterval(pollInterval.current);
        }
    };

    // Sync deals with server for stock updates
    const syncDealsWithServer = async () => {
        try {
            const response = await dealsAPI.getActive();
            if (response.success) {
                setServerTime(response.serverTime);
                setDeals(prev => mergeDeals(prev, response.deals));
            }
        } catch (err) {
            console.error('Sync error:', err);
        }
    };

    // Merge local deals with server data
    const mergeDeals = (local, server) => {
        const serverMap = new Map(server.map(d => [d.id, d]));
        return local.map(localDeal => {
            const serverDeal = serverMap.get(localDeal.id);
            if (serverDeal) {
                return {
                    ...localDeal,
                    available_stock: serverDeal.available_stock,
                    seconds_remaining: serverDeal.seconds_remaining,
                    status: serverDeal.status
                };
            }
            return localDeal;
        });
    };

    // Update countdown for a deal
    const updateCountdown = (deal) => {
        if (!deal.end_date) return deal;
        
        const endTime = new Date(deal.end_date).getTime();
        const now = serverTime || Date.now();
        const secondsRemaining = Math.max(0, (endTime - now) / 1000);
        
        return {
            ...deal,
            seconds_remaining: secondsRemaining,
            is_expired: secondsRemaining <= 0
        };
    };

    // Load deals from API
    const loadDeals = async () => {
        try {
            setLoading(true);
            setError(null);

            const params = { status: 'active' };
            if (filter !== 'all') {
                params.type = filter;
            }

            const response = await dealsAPI.getDeals(params);
            
            if (response.success) {
                let dealsData = response.deals || [];
                
                // Get featured deal (first one with is_featured)
                const featured = dealsData.find(d => d.is_featured);
                if (featured) {
                    setFeaturedDeal(featured);
                    dealsData = dealsData.filter(d => d.id !== featured.id);
                } else {
                    setFeaturedDeal(null);
                }

                // Sort deals
                dealsData = sortDeals(dealsData, sortBy);
                
                setDeals(dealsData);
            } else {
                setDeals([]);
            }
        } catch (err) {
            console.error('Error loading deals:', err);
            setError('Failed to load deals');
        } finally {
            setLoading(false);
        }
    };

    // Sort deals
    const sortDeals = (dealsList, sort) => {
        return [...dealsList].sort((a, b) => {
            switch (sort) {
                case 'ending_soon':
                    return (a.seconds_remaining || 0) - (b.seconds_remaining || 0);
                case 'discount':
                    return (b.discount_percent || 0) - (a.discount_percent || 0);
                case 'price_low':
                    return (a.deal_price || 0) - (b.deal_price || 0);
                case 'price_high':
                    return (b.deal_price || 0) - (a.deal_price || 0);
                case 'stock':
                    return (b.available_stock || 0) - (a.available_stock || 0);
                default:
                    return 0;
            }
        });
    };

    // Handle purchase
    const handlePurchase = async (deal, product) => {
        if (!isAuthenticated) {
            navigate('/login');
            return;
        }

        try {
            // Validate purchase
            const validateRes = await dealsAPI.validatePurchase(deal.id, product.id, 1);
            
            if (!validateRes.success || !validateRes.valid) {
                alert(validateRes.message || 'Cannot purchase deal');
                return;
            }

            // Process purchase
            const purchaseRes = await dealsAPI.purchase(deal.id, product.id, 1);
            
            if (purchaseRes.success) {
                alert('Deal purchased successfully!');
                
                // Add to cart
                addToCartStorage(product.id, 1);
                window.dispatchEvent(new Event('cart-updated'));
                
                // Sync with server
                await syncDealsWithServer();
            } else {
                alert(purchaseRes.message || 'Purchase failed');
            }
        } catch (err) {
            console.error('Purchase error:', err);
            alert('Purchase failed. Please try again.');
        }
    };

    // Format countdown time
    const formatCountdown = (seconds) => {
        if (seconds <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, text: 'Ended' };
        
        const days = Math.floor(seconds / (24 * 3600));
        const hours = Math.floor((seconds % (24 * 3600)) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        if (days > 0) {
            return { days, hours, minutes, seconds: secs, text: `${days}d ${hours}h` };
        }
        return { days, hours, minutes, seconds: secs, text: `${hours}h ${minutes}m ${secs}s` };
    };

    // Filter options
    const filterOptions = [
        { value: 'all', label: 'All Deals' },
        { value: 'flash_sale', label: 'Flash Sales' },
        { value: 'daily_deal', label: 'Daily Deals' },
        { value: 'clearance', label: 'Clearance' },
        { value: 'bundle', label: 'Bundles' }
    ];

    // Sort options
    const sortOptions = [
        { value: 'ending_soon', label: 'Ending Soon' },
        { value: 'discount', label: 'Highest Discount' },
        { value: 'price_low', label: 'Price: Low to High' },
        { value: 'price_high', label: 'Price: High to Low' },
        { value: 'stock', label: 'Most Stock' }
    ];

    if (loading && deals.length === 0) {
        return (
            <div className="deals-page">
                <div className="deals-loading">
                    <div className="loading-spinner"></div>
                    <p>Loading amazing deals...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="deals-page">
            <Helmet>
                <title>Hot Deals & Flash Sales | OMUNJU SHOPPERS</title>
                <meta name="description" content="Save big on flash sales, daily deals, and clearance items. Limited time offers with massive discounts." />
                <meta property="og:title" content="Hot Deals & Flash Sales | OMUNJU SHOPPERS" />
                <meta property="og:description" content="Don't miss out! Limited time deals with up to 70% off." />
            </Helmet>

            {/* Featured Deal Banner */}
            {featuredDeal && !featuredDeal.is_expired && (
                <section className="featured-deal-banner">
                    <div className="featured-content">
                        <span className="featured-badge">FEATURED DEAL</span>
                        <h1>{featuredDeal.name}</h1>
                        <p>{featuredDeal.description}</p>
                        <div className="featured-price">
                            <span className="original">${Number(featuredDeal.original_price).toFixed(2)}</span>
                            <span className="deal">${Number(featuredDeal.deal_price).toFixed(2)}</span>
                            <span className="discount">-{featuredDeal.discount_percent?.toFixed(0)}% OFF</span>
                        </div>
                        <div className="featured-countdown">
                            <CountdownDisplay seconds={featuredDeal.seconds_remaining || 0} />
                        </div>
                        <button className="featured-cta" onClick={() => navigate(`/deals/${featuredDeal.slug}`)}>
                            Shop This Deal
                        </button>
                    </div>
                    <div className="featured-progress">
                        <div className="progress-bar">
                            <div 
                                className="progress-fill" 
                                style={{ width: `${100 - (featuredDeal.stock_percentage || 0)}%` }}
                            ></div>
                        </div>
                        <span className="progress-text">
                            {featuredDeal.available_stock} of {featuredDeal.total_stock} left
                        </span>
                    </div>
                </section>
            )}

            {/* Header */}
            <header className="deals-header">
                <h1>🔥 Hot Deals</h1>
                <p>Limited time offers. Grab them before they're gone!</p>
            </header>

            {/* Filters */}
            <div className="deals-toolbar">
                <div className="filter-tabs">
                    {filterOptions.map(option => (
                        <button
                            key={option.value}
                            className={`filter-tab ${filter === option.value ? 'active' : ''}`}
                            onClick={() => setFilter(option.value)}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
                <div className="sort-select-wrapper">
                    <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                        {sortOptions.map(option => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Error State */}
            {error && (
                <div className="deals-error">
                    <p>{error}</p>
                    <button onClick={loadDeals}>Retry</button>
                </div>
            )}

            {/* Deals Grid */}
            {deals.length > 0 ? (
                <div className="deals-grid">
                    {deals.map(deal => (
                        <DealCard 
                            key={deal.id} 
                            deal={deal}
                            onPurchase={handlePurchase}
                        />
                    ))}
                </div>
            ) : (
                <div className="deals-empty">
                    <h2>No active deals</h2>
                    <p>Check back soon for amazing deals!</p>
                    <button onClick={() => navigate('/products')}>Browse Products</button>
                </div>
            )}

            {/* Live Stats Bar */}
            <div className="deals-stats">
                <div className="stat">
                    <span className="stat-value">{deals.length}</span>
                    <span className="stat-label">Active Deals</span>
                </div>
                <div className="stat">
                    <span className="stat-value">
                        {deals.filter(d => d.seconds_remaining < 3600).length}
                    </span>
                    <span className="stat-label">Ending Soon</span>
                </div>
                <div className="stat">
                    <span className="stat-value">
                        {deals.reduce((sum, d) => sum + (d.available_stock || 0), 0)}
                    </span>
                    <span className="stat-label">Items Left</span>
                </div>
            </div>
        </div>
    );
}

// Countdown Display Component
function CountdownDisplay({ seconds, size = 'normal' }) {
    const [timeLeft, setTimeLeft] = useState(() => formatTime(seconds));

    useEffect(() => {
        setTimeLeft(formatTime(seconds));
    }, [seconds]);

    if (timeLeft.ended) {
        return <span className="countdown-ended">Deal Ended</span>;
    }

    return (
        <div className={`countdown-display countdown-${size}`}>
            {timeLeft.days > 0 && (
                <div className="countdown-unit">
                    <span className="value">{timeLeft.days}</span>
                    <span className="label">Days</span>
                </div>
            )}
            <div className="countdown-unit">
                <span className="value">{String(timeLeft.hours).padStart(2, '0')}</span>
                <span className="label">Hrs</span>
            </div>
            <div className="countdown-separator">:</div>
            <div className="countdown-unit">
                <span className="value">{String(timeLeft.minutes).padStart(2, '0')}</span>
                <span className="label">Min</span>
            </div>
            <div className="countdown-separator">:</div>
            <div className="countdown-unit">
                <span className="value">{String(timeLeft.seconds).padStart(2, '0')}</span>
                <span className="label">Sec</span>
            </div>
        </div>
    );
}

// Format countdown time
function formatTime(seconds) {
    if (seconds <= 0) {
        return { days: 0, hours: 0, minutes: 0, seconds: 0, ended: true };
    }
    
    const days = Math.floor(seconds / (24 * 3600));
    const hours = Math.floor((seconds % (24 * 3600)) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    return { days, hours, minutes, seconds: secs, ended: false };
}

// Deal Card Component
function DealCard({ deal, onPurchase }) {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    
    const countdown = formatTime(deal.seconds_remaining || 0);
    const isLowStock = deal.available_stock < 10;
    const isExpiringSoon = deal.seconds_remaining < 3600;

    // Load deal products on mount
    useEffect(() => {
        const loadProducts = async () => {
            setLoading(true);
            try {
                const response = await dealsAPI.getDeal(deal.slug);
                if (response.success) {
                    setProducts(response.products || []);
                }
            } catch (err) {
                console.error('Error loading products:', err);
            } finally {
                setLoading(false);
            }
        };
        loadProducts();
    }, [deal.slug]);

    if (deal.is_expired || deal.status === 'expired') {
        return (
            <div className="deal-card deal-expired">
                <div className="deal-badge expired">ENDED</div>
                <h3>{deal.name}</h3>
                <p>This deal has ended</p>
            </div>
        );
    }

    return (
        <article className={`deal-card ${isExpiringSoon ? 'expiring-soon' : ''}`}>
            {/* Deal Header */}
            <div className="deal-header">
                <span className={`deal-type deal-${deal.type}`}>
                    {deal.type.replace('_', ' ')}
                </span>
                {isExpiringSoon && <span className="urgent-badge">Ending Soon!</span>}
                {isLowStock && <span className="stock-badge">Only {deal.available_stock} left!</span>}
            </div>

            {/* Deal Info */}
            <div className="deal-info">
                <h3 onClick={() => navigate(`/deals/${deal.slug}`)}>{deal.name}</h3>
                <p>{deal.description?.substring(0, 80)}...</p>
            </div>

            {/* Countdown */}
            <div className="deal-countdown">
                <CountdownDisplay seconds={deal.seconds_remaining || 0} size="small" />
            </div>

            {/* Stock Progress */}
            <div className="deal-stock">
                <div className="stock-bar">
                    <div 
                        className="stock-fill" 
                        style={{ width: `${deal.stock_percentage || 100}%` }}
                    ></div>
                </div>
                <span className="stock-text">
                    {deal.available_stock} of {deal.total_stock} available
                </span>
            </div>

            {/* Pricing */}
            <div className="deal-pricing">
                <span className="deal-price">${Number(deal.deal_price).toFixed(2)}</span>
                <span className="original-price">${Number(deal.original_price).toFixed(2)}</span>
                <span className="discount-badge">-{deal.discount_percent?.toFixed(0)}%</span>
            </div>

            {/* Products Preview */}
            {products.length > 0 && (
                <div className="deal-products">
                    {products.slice(0, 3).map(product => (
                        <div key={product.id} className="deal-product-item">
                            <img src={product.image_url || '/images/category-placeholder.jpg'} alt={product.name} />
                            <div className="product-info">
                                <span className="name">{product.name}</span>
                                <span className="price">${Number(product.deal_price).toFixed(2)}</span>
                            </div>
                            <button 
                                className="quick-buy"
                                onClick={() => onPurchase(deal, product)}
                            >
                                Buy
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Actions */}
            <div className="deal-actions">
                <button 
                    className="view-deal"
                    onClick={() => navigate(`/deals/${deal.slug}`)}
                >
                    View Deal
                </button>
            </div>
        </article>
    );
}

export default DealsPage;
