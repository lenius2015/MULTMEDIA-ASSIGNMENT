/**
 * Auctions Page
 * Real-time bidding with WebSocket support
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { useAuth } from '../hooks/useAuth';
import io from 'socket.io-client';
import auctionAPI from '../services/auctionAPI';
import '../styles/pages/Auctions.css';

function AuctionsPage() {
    const { isAuthenticated, user } = useAuth();
    const [auctions, setAuctions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filter, setFilter] = useState('all');
    const [sort, setSort] = useState('ending_soon');
    const [selectedAuction, setSelectedAuction] = useState(null);
    const [socket, setSocket] = useState(null);

    // Fetch auctions
    const fetchAuctions = useCallback(async () => {
        try {
            setLoading(true);
            const response = await auctionAPI.getAll({ status: 'active', sort });
            
            if (response.success) {
                setAuctions(response.data);
                setError(null);
            }
        } catch (err) {
            setError('Failed to load auctions');
            console.error('Error fetching auctions:', err);
        } finally {
            setLoading(false);
        }
    }, [sort]);

    // Initialize WebSocket connection
    useEffect(() => {
        const newSocket = io(process.env.REACT_APP_API_URL || window.location.origin);
        setSocket(newSocket);

        newSocket.on('connect', () => {
            console.log('Connected to auction server');
        });

        newSocket.on('new_bid', (data) => {
            // Update auctions with new bid data
            setAuctions(prev => prev.map(a => 
                a.id === data.auction_id 
                    ? { 
                        ...a, 
                        current_price: data.bid_amount,
                        total_bids: a.total_bids + 1,
                        time_remaining: a.time_remaining
                      }
                    : a
            ));
        });

        newSocket.on('auction_ended', (data) => {
            setAuctions(prev => prev.filter(a => a.id !== data.auction_id));
            if (selectedAuction?.id === data.auction_id) {
                setSelectedAuction(prev => ({ ...prev, status: 'ended' }));
            }
        });

        newSocket.on('auction_extended', (data) => {
            setAuctions(prev => prev.map(a => 
                a.id === data.auction_id 
                    ? { ...a, end_time: data.new_end_time }
                    : a
            ));
        });

        return () => {
            newSocket.disconnect();
        };
    }, [selectedAuction]);

    useEffect(() => {
        fetchAuctions();
    }, [fetchAuctions]);

    // Update countdown timers every second
    useEffect(() => {
        const interval = setInterval(() => {
            setAuctions(prev => prev.map(a => ({
                ...a,
                time_remaining: calculateTimeRemaining(a.end_time)
            })));
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    if (loading && auctions.length === 0) {
        return (
            <div className="auctions-page">
                <Helmet>
                    <title>Auctions - Loading...</title>
                </Helmet>
                <div className="loading-container">
                    <div className="loading-spinner"></div>
                    <p>Loading auctions...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="auctions-page">
            <Helmet>
                <title>Live Auctions - Shop Bid & Win</title>
                <meta name="description" content="Participate in live auctions and win amazing products at great prices. Real-time bidding with instant updates." />
            </Helmet>

            {/* Hero Section */}
            <section className="auctions-hero">
                <div className="hero-content">
                    <h1>Live Auctions</h1>
                    <p>Bid in real-time and win amazing products at unbeatable prices</p>
                    
                    <div className="auction-stats">
                        <div className="stat">
                            <span className="stat-number">{auctions.length}</span>
                            <span className="stat-label">Active Auctions</span>
                        </div>
                        <div className="stat">
                            <span className="stat-number">
                                {auctions.reduce((sum, a) => sum + (a.total_bids || 0), 0)}
                            </span>
                            <span className="stat-label">Total Bids</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Filters */}
            <section className="auctions-content">
                <div className="filters">
                    <div className="filter-tabs">
                        <button 
                            className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
                            onClick={() => setFilter('all')}
                        >
                            All Auctions
                        </button>
                        <button 
                            className={`filter-tab ${filter === 'ending_soon' ? 'active' : ''}`}
                            onClick={() => setFilter('ending_soon')}
                        >
                            Ending Soon
                        </button>
                        <button 
                            className={`filter-tab ${filter === 'new' ? 'active' : ''}`}
                            onClick={() => setFilter('new')}
                        >
                            Just Started
                        </button>
                        <button 
                            className={`filter-tab ${filter === 'popular' ? 'active' : ''}`}
                            onClick={() => setFilter('popular')}
                        >
                            Most Popular
                        </button>
                    </div>

                    <div className="sort-select">
                        <label>Sort by:</label>
                        <select value={sort} onChange={(e) => setSort(e.target.value)}>
                            <option value="ending_soon">Ending Soon</option>
                            <option value="newest">Newest First</option>
                            <option value="price_low">Price: Low to High</option>
                            <option value="price_high">Price: High to Low</option>
                            <option value="most_bids">Most Bids</option>
                        </select>
                    </div>
                </div>

                {/* Auctions Grid */}
                {error && (
                    <div className="error-message">
                        {error}
                        <button onClick={fetchAuctions}>Retry</button>
                    </div>
                )}

                <div className="auctions-grid">
                    {auctions.length === 0 ? (
                        <div className="no-auctions">
                            <h3>No auctions available</h3>
                            <p>Check back later for new auctions</p>
                        </div>
                    ) : (
                        auctions.map(auction => (
                            <AuctionCard 
                                key={auction.id}
                                auction={auction}
                                socket={socket}
                                isAuthenticated={isAuthenticated}
                                onSelect={() => setSelectedAuction(auction)}
                            />
                        ))
                    )}
                </div>
            </section>

            {/* Auction Detail Modal */}
            {selectedAuction && (
                <AuctionDetailModal
                    auction={selectedAuction}
                    socket={socket}
                    isAuthenticated={isAuthenticated}
                    user={user}
                    onClose={() => setSelectedAuction(null)}
                    onBidPlaced={(data) => {
                        setAuctions(prev => prev.map(a => 
                            a.id === selectedAuction.id 
                                ? { ...a, current_price: data.bid_amount, total_bids: data.total_bids }
                                : a
                        ));
                        setSelectedAuction(prev => ({ ...prev, current_price: data.bid_amount, total_bids: data.total_bids }));
                    }}
                />
            )}
        </div>
    );
}

// Calculate time remaining
function calculateTimeRemaining(endTime) {
    const now = new Date();
    const end = new Date(endTime);
    const diff = end - now;

    if (diff <= 0) {
        return { ended: true, days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 };
    }

    return {
        ended: false,
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
        total: diff
    };
}

// Auction Card Component
function AuctionCard({ auction, socket, isAuthenticated, onSelect }) {
    const [timeRemaining, setTimeRemaining] = useState(auction.time_remaining);
    const [isWatched, setIsWatched] = useState(auction.is_watching);

    // Update countdown
    useEffect(() => {
        const interval = setInterval(() => {
            setTimeRemaining(calculateTimeRemaining(auction.end_time));
        }, 1000);
        return () => clearInterval(interval);
    }, [auction.end_time]);

    // Listen for bid updates
    useEffect(() => {
        if (!socket) return;
        
        socket.on('new_bid', (data) => {
            if (data.auction_id === auction.id) {
                setTimeRemaining(prev => prev); // Force re-render
            }
        });

        return () => {
            socket.off('new_bid');
        };
    }, [socket, auction.id]);

    const handleWatch = async (e) => {
        e.stopPropagation();
        if (!isAuthenticated) return;
        
        try {
            if (isWatched) {
                await auctionAPI.removeFromWatchlist(auction.id);
            } else {
                await auctionAPI.addToWatchlist(auction.id);
            }
            setIsWatched(!isWatched);
        } catch (err) {
            console.error('Error updating watchlist:', err);
        }
    };

    const formatPrice = (price) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(price);
    };

    const currentBid = auction.current_price || auction.starting_price;
    const bidCount = auction.total_bids || 0;

    return (
        <div className={`auction-card ${timeRemaining.ended ? 'ended' : ''}`} onClick={onSelect}>
            <div className="auction-image">
                {auction.product_images ? (
                    <img src={JSON.parse(auction.product_images)[0]} alt={auction.product_name || auction.title} />
                ) : (
                    <div className="no-image">No Image</div>
                )}
                {auction.buy_now_price && (
                    <span className="buy-now-badge">Buy Now: {formatPrice(auction.buy_now_price)}</span>
                )}
            </div>

            <div className="auction-content">
                <h3>{auction.product_name || auction.title}</h3>
                
                <div className="current-bid">
                    <span className="label">Current Bid</span>
                    <span className="price">{formatPrice(currentBid)}</span>
                </div>

                <div className="bid-count">
                    <span>{bidCount} bids</span>
                </div>

                <div className={`countdown ${timeRemaining.total < 3600000 ? 'urgent' : ''}`}>
                    {timeRemaining.ended ? (
                        <span className="ended-text">Auction Ended</span>
                    ) : (
                        <>
                            <span className="time-part">
                                {String(timeRemaining.days).padStart(2, '0')}d
                            </span>
                            <span className="separator">:</span>
                            <span className="time-part">
                                {String(timeRemaining.hours).padStart(2, '0')}h
                            </span>
                            <span className="separator">:</span>
                            <span className="time-part">
                                {String(timeRemaining.minutes).padStart(2, '0')}m
                            </span>
                            <span className="separator">:</span>
                            <span className="time-part">
                                {String(timeRemaining.seconds).padStart(2, '0')}s
                            </span>
                        </>
                    )}
                </div>

                <div className="auction-actions">
                    <button className="btn-bid">Place Bid</button>
                    <button 
                        className={`btn-watch ${isWatched ? 'watching' : ''}`}
                        onClick={handleWatch}
                    >
                        {isWatched ? '❤️ Watching' : '♡ Watch'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// Auction Detail Modal
function AuctionDetailModal({ auction, socket, isAuthenticated, user, onClose, onBidPlaced }) {
    const [auctionDetails, setAuctionDetails] = useState(auction);
    const [bids, setBids] = useState([]);
    const [bidAmount, setBidAmount] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [isWatched, setIsWatched] = useState(auction.is_watching);

    // Fetch bid history
    useEffect(() => {
        const fetchBids = async () => {
            const response = await auctionAPI.getBids(auction.id);
            if (response.success) {
                setBids(response.data);
            }
        };
        fetchBids();
    }, [auction.id]);

    // Listen for real-time updates
    useEffect(() => {
        if (!socket) return;

        socket.emit('join_auction', auction.id);

        socket.on('new_bid', (data) => {
            if (data.auction_id === auction.id) {
                setAuctionDetails(prev => ({
                    ...prev,
                    current_price: data.bid_amount,
                    total_bids: prev.total_bids + 1
                }));
                
                // Update bids list
                setBids(prev => [{
                    ...data,
                    user_name: data.user_name || 'Anonymous',
                    bid_time: new Date().toISOString()
                }, ...prev]);

                // Notify parent
                onBidPlaced(data);
            }
        });

        socket.on('auction_ended', (data) => {
            if (data.auction_id === auction.id) {
                setAuctionDetails(prev => ({ ...prev, status: 'ended' }));
            }
        });

        return () => {
            socket.emit('leave_auction', auction.id);
            socket.off('new_bid');
            socket.off('auction_ended');
        };
    }, [socket, auction.id, onBidPlaced]);

    const handleBid = async () => {
        if (!isAuthenticated) {
            setError('Please log in to place a bid');
            return;
        }

        const amount = parseFloat(bidAmount);
        if (!amount || isNaN(amount)) {
            setError('Please enter a valid bid amount');
            return;
        }

        const minBid = auctionDetails.current_price + (auctionDetails.min_bid_increment || 1);
        if (amount < minBid) {
            setError(`Minimum bid is $${minBid.toFixed(2)}`);
            return;
        }

        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            const response = await auctionAPI.placeBid(auction.id, amount);
            
            if (response.success) {
                setSuccess('Bid placed successfully!');
                setBidAmount('');
                setTimeout(() => setSuccess(null), 3000);
            } else {
                setError(response.error || 'Failed to place bid');
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to place bid');
        } finally {
            setLoading(false);
        }
    };

    const handleWatch = async () => {
        if (!isAuthenticated) return;
        
        try {
            if (isWatched) {
                await auctionAPI.removeFromWatchlist(auction.id);
            } else {
                await auctionAPI.addToWatchlist(auction.id);
            }
            setIsWatched(!isWatched);
        } catch (err) {
            console.error('Error updating watchlist:', err);
        }
    };

    const formatPrice = (price) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(price);
    };

    const formatTime = (timeString) => {
        return new Date(timeString).toLocaleString();
    };

    const minBid = auctionDetails.current_price + (auctionDetails.min_bid_increment || 1);

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="auction-modal" onClick={(e) => e.stopPropagation()}>
                <button className="close-btn" onClick={onClose}>×</button>
                
                <div className="modal-content">
                    <div className="modal-left">
                        <div className="auction-image-large">
                            {auction.product_images ? (
                                <img src={JSON.parse(auction.product_images)[0]} alt={auction.product_name} />
                            ) : (
                                <div className="no-image">No Image</div>
                            )}
                        </div>
                    </div>

                    <div className="modal-right">
                        <h2>{auction.product_name || auction.title}</h2>
                        
                        <div className="seller-info">
                            <span>Sold by: {auction.seller_name}</span>
                        </div>

                        <div className="bidding-info">
                            <div className="current-bid-large">
                                <span className="label">Current Bid</span>
                                <span className="price">{formatPrice(auctionDetails.current_price)}</span>
                            </div>
                            
                            <div className="bid-stats">
                                <div className="stat">
                                    <span className="value">{auctionDetails.total_bids}</span>
                                    <span className="label">Total Bids</span>
                                </div>
                                <div className="stat">
                                    <span className="value">{formatPrice(auction.starting_price)}</span>
                                    <span className="label">Starting</span>
                                </div>
                                {auction.buy_now_price && (
                                    <div className="stat">
                                        <span className="value">{formatPrice(auction.buy_now_price)}</span>
                                        <span className="label">Buy Now</span>
                                    </div>
                                )}
                            </div>

                            <div className="countdown-large">
                                <span className="label">Time Remaining</span>
                                <AuctionCountdown endTime={auction.end_time} socket={socket} auctionId={auction.id} />
                            </div>
                        </div>

                        {auctionDetails.status === 'active' ? (
                            <div className="bid-form">
                                <div className="bid-input-group">
                                    <span className="currency">$</span>
                                    <input
                                        type="number"
                                        value={bidAmount}
                                        onChange={(e) => setBidAmount(e.target.value)}
                                        placeholder={`Min: ${minBid.toFixed(2)}`}
                                        step="0.01"
                                        min={minBid}
                                    />
                                </div>
                                <p className="min-bid-hint">Minimum bid: {formatPrice(minBid)}</p>
                                
                                {error && <div className="error-message">{error}</div>}
                                {success && <div className="success-message">{success}</div>}
                                
                                <button 
                                    className="btn-place-bid"
                                    onClick={handleBid}
                                    disabled={loading || !bidAmount}
                                >
                                    {loading ? 'Placing Bid...' : 'Place Bid'}
                                </button>

                                <button 
                                    className={`btn-watch ${isWatched ? 'watching' : ''}`}
                                    onClick={handleWatch}
                                >
                                    {isWatched ? '❤️ Remove from Watchlist' : '♡ Add to Watchlist'}
                                </button>
                            </div>
                        ) : (
                            <div className="auction-ended-message">
                                {auctionDetails.status === 'sold' ? (
                                    <>
                                        <span className="sold-badge">SOLD!</span>
                                        <p>Winner: {auctionDetails.winner_id === user?.id ? 'You!' : 'Another bidder'}</p>
                                    </>
                                ) : (
                                    <span className="ended-badge">Auction Ended</span>
                                )}
                            </div>
                        )}

                        {auction.reserve_price && (
                            <div className="reserve-status">
                                {auctionDetails.is_reserve_met ? (
                                    <span className="reserve-met">✓ Reserve price met</span>
                                ) : (
                                    <span className="reserve-not-met">Reserve not yet met</span>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Bid History */}
                <div className="bid-history">
                    <h3>Bid History</h3>
                    {bids.length === 0 ? (
                        <p className="no-bids">No bids yet. Be the first!</p>
                    ) : (
                        <div className="bids-list">
                            {bids.map((bid, index) => (
                                <div key={bid.id || index} className={`bid-item ${bid.user_id === (user && user.id) ? 'own-bid' : ''}`}>
                                    <div className="bid-info">
                                        <span className="bidder">{bid.user_name}</span>
                                        <span className="bid-amount">{formatPrice(bid.bid_amount)}</span>
                                    </div>
                                    <span className="bid-time">{formatTime(bid.bid_time)}</span>
                                    {index === 0 && <span className="winning-badge">Winning</span>}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// Countdown Component
function AuctionCountdown({ endTime, socket, auctionId }) {
    const [timeRemaining, setTimeRemaining] = useState(calculateTimeRemaining(endTime));

    useEffect(() => {
        const interval = setInterval(() => {
            const remaining = calculateTimeRemaining(endTime);
            setTimeRemaining(remaining);
        }, 1000);

        return () => clearInterval(interval);
    }, [endTime]);

    useEffect(() => {
        if (!socket) return;
        
        socket.on('auction_extended', (data) => {
            if (data.auction_id === auctionId) {
                setTimeRemaining(calculateTimeRemaining(data.new_end_time));
            }
        });

        return () => {
            socket.off('auction_extended');
        };
    }, [socket, auctionId]);

    if (timeRemaining.ended) {
        return <span className="ended">Auction Ended</span>;
    }

    return (
        <div className={`countdown-display ${timeRemaining.total < 300000 ? 'urgent' : ''}`}>
            <div className="time-unit">
                <span className="value">{String(timeRemaining.days).padStart(2, '0')}</span>
                <span className="label">Days</span>
            </div>
            <span className="separator">:</span>
            <div className="time-unit">
                <span className="value">{String(timeRemaining.hours).padStart(2, '0')}</span>
                <span className="label">Hours</span>
            </div>
            <span className="separator">:</span>
            <div className="time-unit">
                <span className="value">{String(timeRemaining.minutes).padStart(2, '0')}</span>
                <span className="label">Min</span>
            </div>
            <span className="separator">:</span>
            <div className="time-unit">
                <span className="value">{String(timeRemaining.seconds).padStart(2, '0')}</span>
                <span className="label">Sec</span>
            </div>
        </div>
    );
}

export default AuctionsPage;
