import React, { useEffect, useState } from 'react';
import ProductCard from './ProductCard';
import '../styles/DealsCarousel.css';

function Countdown({ endAt }) {
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    if (!endAt) return;
    const target = new Date(endAt).getTime();
    const tick = () => {
      const now = Date.now();
      const diff = Math.max(0, target - now);
      setTimeLeft(diff);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [endAt]);

  if (!timeLeft) return <span className="countdown">Ended</span>;

  const secs = Math.floor(timeLeft / 1000) % 60;
  const mins = Math.floor(timeLeft / (1000 * 60)) % 60;
  const hours = Math.floor(timeLeft / (1000 * 60 * 60)) % 24;
  const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));

  return (
    <span className="countdown">{days}d {hours}h {mins}m {secs}s</span>
  );
}

export default function DealsCarousel({ deals = [], onQuickView, onBuy, onWishlist }) {
  if (!deals.length) return null;
  return (
    <section className="deals-carousel">
      <div className="deals-header">
        <h2>Deals of the Day</h2>
      </div>
      <div className="deals-grid">
        {deals.map((d) => (
          <div key={d.product?.id || d.id} className="deal-item">
            <ProductCard
              product={d.product}
              onQuickView={onQuickView}
              onBuy={onBuy}
              onWishlist={onWishlist}
            />
            <div className="deal-footer">
              <Countdown endAt={d.end_at} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
