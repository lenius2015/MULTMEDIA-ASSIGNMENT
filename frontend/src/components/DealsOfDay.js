/**
 * Deals of the Day Section with Real-time Countdown
 * Displays deals with a countdown timer synced with server time
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDiscountedPrice, getProductImage } from '../utils/product';
import '../styles/DealsOfDay.css';

// Calculate time remaining until end date
function getTimeRemaining(endDate) {
  const now = Date.now();
  const end = new Date(endDate).getTime();
  const diff = end - now;
  
  if (diff <= 0) {
    return { done: true, days: 0, hours: 0, minutes: 0, seconds: 0 };
  }
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  
  return { done: false, days, hours, minutes, seconds };
}

// Countdown Timer Component
function CountdownTimer({ endDate, onComplete }) {
  const [timeLeft, setTimeLeft] = useState(() => getTimeRemaining(endDate));

  useEffect(() => {
    const timer = setInterval(() => {
      const newTime = getTimeRemaining(endDate);
      setTimeLeft(newTime);
      
      if (newTime.done) {
        clearInterval(timer);
        onComplete?.();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [endDate, onComplete]);

  if (timeLeft.done) {
    return (
      <div className="countdown-ended">
        <span>Deal Ended</span>
      </div>
    );
  }

  return (
    <div className="countdown-timer">
      {timeLeft.days > 0 && (
        <div className="countdown-unit">
          <span className="countdown-value">{String(timeLeft.days).padStart(2, '0')}</span>
          <span className="countdown-label">Days</span>
        </div>
      )}
      <div className="countdown-unit">
        <span className="countdown-value">{String(timeLeft.hours).padStart(2, '0')}</span>
        <span className="countdown-label">Hrs</span>
      </div>
      <div className="countdown-separator">:</div>
      <div className="countdown-unit">
        <span className="countdown-value">{String(timeLeft.minutes).padStart(2, '0')}</span>
        <span className="countdown-label">Min</span>
      </div>
      <div className="countdown-separator">:</div>
      <div className="countdown-unit">
        <span className="countdown-value">{String(timeLeft.seconds).padStart(2, '0')}</span>
        <span className="countdown-label">Sec</span>
      </div>
    </div>
  );
}

// Deal Card Component
function DealCard({ deal, onQuickView, onAddToCart }) {
  const price = Number(deal.price || 0);
  const discountedPrice = getDiscountedPrice(deal);
  const showDiscount = deal.discount > 0;
  const imageUrl = getProductImage(deal);

  return (
    <div className="deal-card">
      <div className="deal-card-image">
        <img src={imageUrl} alt={deal.name} />
        {showDiscount && <span className="deal-badge">-{deal.discount}%</span>}
      </div>
      <div className="deal-card-content">
        <h4 className="deal-card-title">{deal.name}</h4>
        <div className="deal-card-price">
          <span className="deal-current">${discountedPrice.toFixed(2)}</span>
          {showDiscount && (
            <span className="deal-original">${price.toFixed(2)}</span>
          )}
        </div>
        <div className="deal-card-actions">
          <button 
            className="deal-quick-view"
            onClick={() => onQuickView?.(deal)}
          >
            Quick View
          </button>
          <button 
            className="deal-add-cart"
            onClick={() => onAddToCart?.(deal.id)}
          >
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
}

// Main DealsOfDay Component
export function DealsOfDay({ countdown, deals = [], onQuickView, onAddToCart }) {
  const navigate = useNavigate();
  const endDate = countdown?.end_date;
  const activeDeal = useMemo(() => deals[0], [deals]);
  const remainingDeals = useMemo(() => deals.slice(1, 5), [deals]);

  const handleViewAll = () => {
    navigate('/products?hasDiscount=true');
  };

  return (
    <section className="deals-section" aria-label="Deals of the day">
      <div className="deals-header">
        <div className="deals-title">
          <h2>🔥 Deals of the Day</h2>
          <p>Fresh discounts, refreshed daily. Grab them before they end!</p>
        </div>
        
        {endDate && (
          <div className="deals-countdown">
            <span className="countdown-label">Ends in:</span>
            <CountdownTimer 
              endDate={endDate} 
              onComplete={() => console.log('Deal ended')}
            />
          </div>
        )}
        
        <button className="deals-view-all" onClick={handleViewAll}>
          View All Deals →
        </button>
      </div>

      <div className="deals-grid">
        {/* Featured Deal */}
        {activeDeal && (
          <div className="deal-featured">
            <div className="deal-featured-image">
              <img src={getProductImage(activeDeal)} alt={activeDeal.name} />
              {activeDeal.discount > 0 && (
                <span className="deal-featured-badge">-{activeDeal.discount}% OFF</span>
              )}
            </div>
            <div className="deal-featured-content">
              <h3>{activeDeal.name}</h3>
              <p>{activeDeal.description?.substring(0, 120)}...</p>
              <div className="deal-featured-price">
                <span className="price">${getDiscountedPrice(activeDeal).toFixed(2)}</span>
                {activeDeal.discount > 0 && (
                  <span className="original">${Number(activeDeal.price).toFixed(2)}</span>
                )}
              </div>
              <div className="deal-featured-actions">
                <button 
                  className="btn-primary"
                  onClick={() => onAddToCart?.(activeDeal.id)}
                >
                  Add to Cart
                </button>
                <button 
                  className="btn-secondary"
                  onClick={() => onQuickView?.(activeDeal)}
                >
                  Quick View
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Other Deals */}
        <div className="deals-list">
          {remainingDeals.map((deal) => (
            <DealCard 
              key={deal.id} 
              deal={deal}
              onQuickView={onQuickView}
              onAddToCart={onAddToCart}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

export default DealsOfDay;
