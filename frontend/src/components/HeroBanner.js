/**
 * Hero Banner Component
 * Dynamic hero section for the home page, configurable from admin
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/HeroBanner.css';

export function HeroBanner({ 
  banner,
  defaultTitle = 'Discover Bold New Arrivals',
  defaultSubtitle = 'Premium picks curated weekly. Fast shipping, secure checkout, fresh drops.',
  defaultCtaText = 'Shop the Drop',
  defaultCtaLink = '/products'
}) {
  const navigate = useNavigate();
  
  const {
    title = defaultTitle,
    subtitle = defaultSubtitle,
    cta_text = defaultCtaText,
    cta_link = defaultCtaLink,
    background_image = null,
    badge = null,
    badge_color = null
  } = banner || {};

  const handleCtaClick = () => {
    if (cta_link) {
      navigate(cta_link);
    }
  };

  // Default hero styles if no custom banner
  const defaultHeroContent = !banner || !background_image;

  return (
    <section 
      className={`hero-banner ${defaultHeroContent ? 'hero-banner--default' : ''}`}
      aria-label="Hero banner"
    >
      <div className="hero-banner__content">
        {badge && (
          <span 
            className="hero-banner__badge" 
            style={badge_color ? { backgroundColor: badge_color } : {}}
          >
            {badge}
          </span>
        )}
        <h1 className="hero-banner__title">{title}</h1>
        <p className="hero-banner__subtitle">{subtitle}</p>
        <button 
          className="hero-banner__cta" 
          onClick={handleCtaClick}
        >
          {cta_text}
        </button>
      </div>
      
      {background_image && (
        <div 
          className="hero-banner__media"
          style={{ backgroundImage: `url(${background_image})` }}
          aria-hidden="true"
        />
      )}
    </section>
  );
}

export default HeroBanner;
