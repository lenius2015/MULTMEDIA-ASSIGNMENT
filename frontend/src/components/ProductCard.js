/**
 * Product Card Component
 * Displays product information
 */

import React from 'react';
import '../styles/ProductCard.css';
import Button from './Button';
import { getDiscountedPrice, getProductImage, hasDiscount, getStockCount, isLowStock } from '../utils/product';

export function ProductCard({
  product,
  onBuy,
  onViewDetails,
  onQuickView,
  onWishlist,
  isWishlisted
}) {
  const price = Number(product.price || 0);
  const discountedPrice = getDiscountedPrice(product);
  const stock = getStockCount(product);
  const showDiscount = hasDiscount(product);

  return (
    <div className="product-card">
      <div className="product-image">
        <img src={getProductImage(product)} alt={product.name} />
        {showDiscount && <span className="sale-badge">-{product.discount}%</span>}
        <button
          className={`wishlist-btn ${isWishlisted ? 'active' : ''}`}
          onClick={() => onWishlist?.(product.id)}
          aria-label="Add to wishlist"
        >
          ♥
        </button>
        <button
          className="quick-view-btn"
          onClick={() => onQuickView?.(product)}
        >
          Quick View
        </button>
      </div>
      
      <div className="product-info">
        <h3 className="product-name">{product.name}</h3>
        
        {product.vendor && (
          <p className="product-vendor">by {product.vendor.name}</p>
        )}
        
        <p className="product-description">
          {product.description?.substring(0, 100)}...
        </p>

        <div className="product-footer">
          <div className="product-price">
            <span className="price">${discountedPrice.toFixed(2)}</span>
            {showDiscount && (
              <span className="original-price">${price.toFixed(2)}</span>
            )}
          </div>

          <div className="product-actions">
            <Button
              variant="primary"
              size="sm"
              onClick={() => onBuy(product.id)}
              disabled={stock === 0}
            >
              {stock === 0 ? 'Out of Stock' : 'Add to Cart'}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onViewDetails(product.id)}
            >
              View
            </Button>
          </div>
        </div>

        {isLowStock(product) && (
          <p className="low-stock">Only {stock} left!</p>
        )}
        {stock === 0 && <p className="out-of-stock">Out of Stock</p>}
      </div>
    </div>
  );
}

export default ProductCard;
