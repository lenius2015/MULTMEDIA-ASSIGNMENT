import React, { useEffect, useState } from 'react';
import { getDiscountedPrice, getProductImage, hasDiscount } from '../utils/product';
import '../styles/PromotionsSlider.css';

export default function PromotionsSlider({ items = [] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!items.length) return undefined;
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % items.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [items.length]);

  if (!items.length) return null;

  const active = items[index];

  return (
    <section className="promotions-slider" aria-label="Promotions">
      <div className="promotions-slider__card">
        <div className="promotions-slider__text">
          <span className="promotions-slider__tag">Limited Offer</span>
          <h3>{active.name}</h3>
          <p>{active.description?.substring(0, 120)}...</p>
          <div className="promotions-slider__price">
            <span>${getDiscountedPrice(active).toFixed(2)}</span>
            {hasDiscount(active) && (
              <em>${Number(active.price).toFixed(2)}</em>
            )}
          </div>
        </div>
        <img src={getProductImage(active)} alt={active.name} />
      </div>

      <div className="promotions-slider__dots">
        {items.map((_, idx) => (
          <button
            key={`dot-${idx}`}
            className={idx === index ? 'active' : ''}
            onClick={() => setIndex(idx)}
            aria-label={`Show promotion ${idx + 1}`}
          />
        ))}
      </div>
    </section>
  );
}
