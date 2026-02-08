/**
 * Auction Preview Section
 * Displays live auctions with real-time bid information
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/AuctionPreview.css';

// Calculate remaining time
function getRemainingTime(endDate) {
  const now = Date.now();
  const end = new Date(endDate).getTime();
  const diff = end - now;
  
  if (diff <= 0) return 'Ended';
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }
  
  return `${hours}h ${minutes}m ${seconds}s`;
}

// Auction Card Component
function AuctionCard({ auction, onPlaceBid }) {
  const [timeLeft, setTimeLeft] = useState(() => getRemainingTime(auction.end_date));
  const navigate = useNavigate();
  
  // Update countdown every second
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(getRemainingTime(auction.end_date));
    }, 1000);
    
    return () => clearInterval(timer);
  }, [auction.end_date]);

  const handleViewDetails = () => {
    navigate(`/auctions/${auction.id}`);
  };

  return (
    <article className="auction-card">
      <div className="auction-card-image">
        <img 
          src={auction.product_image || auction.image_url || '/images/category-placeholder.jpg'} 
          alt={auction.title || auction.product_name}
          onError={(e) => {
            e.target.src = '/images/category-placeholder.jpg';
          }}
        />
        {auction.status === 'active' && <span className="auction-live-badge">LIVE</span>}
      </div>
      
      <div className="auction-card-content">
        <h3 className="auction-card-title">
          {auction.title || auction.product_name}
        </h3>
        
        {auction.description && (
          <p className="auction-card-description">
            {auction.description.substring(0, 80)}...
          </p>
        )}
        
        <div className="auction-card-bid">
          <span className="bid-label">Current Bid</span>
          <span className="bid-amount">
            ${Number(auction.current_bid || auction.starting_bid || 0).toFixed(2)}
          </span>
        </div>
        
        <div className="auction-card-ends">
          <span className="ends-label">Ends in:</span>
          <span className={`ends-time ${timeLeft === 'Ended' ? 'ended' : ''}`}>
            {timeLeft}
          </span>
        </div>
        
        <div className="auction-card-actions">
          <button className="auction-bid-btn" onClick={() => onPlaceBid?.(auction)}>
            Place Bid
          </button>
          <button className="auction-view-btn" onClick={handleViewDetails}>
            View Details
          </button>
        </div>
      </div>
    </article>
  );
}

// Main AuctionPreview Component
export function AuctionPreview({ 
  auctions = [], 
  onPlaceBid,
  title = "Live Auctions",
  subtitle = "Bid in real-time on curated, limited-run pieces"
}) {
  const navigate = useNavigate();

  if (!auctions || auctions.length === 0) {
    return (
      <section className="auction-preview" aria-label="Auction preview">
        <div className="auction-preview-header">
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
        <div className="auction-empty">
          <p>No live auctions at the moment. Check back soon!</p>
        </div>
      </section>
    );
  }

  const handleViewAll = () => {
    navigate('/auctions');
  };

  return (
    <section className="auction-preview" aria-label="Auction preview">
      <div className="auction-preview-header">
        <div className="auction-header-text">
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
        <button className="auction-view-all" onClick={handleViewAll}>
          View All Auctions →
        </button>
      </div>

      <div className="auction-preview-grid">
        {auctions.map((auction) => (
          <AuctionCard 
            key={auction.id} 
            auction={auction}
            onPlaceBid={onPlaceBid}
          />
        ))}
      </div>
    </section>
  );
}

export default AuctionPreview;
