/**
 * Product Quick View Modal
 * Displays product details in a modal with add to cart/wishlist functionality
 */

import React from 'react';
import '../styles/QuickViewModal.css';
import { getDiscountedPrice, getProductImage, hasDiscount, getStockCount } from '../utils/product';

export function QuickViewModal({ 
  product, 
  open, 
  onClose, 
  onAddToCart, 
  onAddToWishlist,
  isWishlisted 
}) {
  if (!open || !product) return null;

  const price = Number(product.price || 0);
  const discountedPrice = getDiscountedPrice(product);
  const stock = getStockCount(product);
  const showDiscount = hasDiscount(product);
  const imageUrl = getProductImage(product);

  const handleClose = (e) => {
    if (e && e.target !== e.currentTarget) return;
    onClose?.();
  };

  const handleAddToCart = () => {
    if (stock > 0) {
      onAddToCart?.(product.id);
    }
  };

  const handleAddToWishlist = () => {
    onAddToWishlist?.(product.id);
  };

  return (
    <div className="quickview-backdrop" onClick={handleClose} role="dialog" aria-modal="true">
      <div className="quickview-modal">
        <button 
          className="quickview-close" 
          onClick={onClose} 
          aria-label="Close modal"
        >
          ×
        </button>
        
        <div className="quickview-content">
          <div className="quickview-image">
            <img src={imageUrl} alt={product.name} />
            {showDiscount && <span className="quickview-badge">-{product.discount}%</span>}
          </div>
          
          <div className="quickview-info">
            <h2 className="quickview-title">{product.name}</h2>
            
            {product.vendor_name && (
              <p className="quickview-vendor">by {product.vendor_name}</p>
            )}
            
            <div className="quickview-price">
              <span className="current-price">${discountedPrice.toFixed(2)}</span>
              {showDiscount && (
                <span className="original-price">${price.toFixed(2)}</span>
              )}
            </div>
            
            <p className="quickview-description">
              {product.description?.substring(0, 200)}
              {product.description?.length > 200 && '...'}
            </p>
            
            <div className="quickview-stock">
              {stock > 0 ? (
                <span className="in-stock">
                  <span className="stock-dot"></span>
                  {stock < 10 ? `Only ${stock} left!` : `${stock} in stock`}
                </span>
              ) : (
                <span className="out-of-stock">Out of stock</span>
              )}
            </div>
            
            <div className="quickview-actions">
              <button 
                className="quickview-add-cart" 
                onClick={handleAddToCart}
                disabled={stock === 0}
              >
                {stock === 0 ? 'Out of Stock' : 'Add to Cart'}
              </button>
              <button 
                className={`quickview-wishlist ${isWishlisted ? 'active' : ''}`}
                onClick={handleAddToWishlist}
              >
                {isWishlisted ? '♥ In Wishlist' : '♡ Add to Wishlist'}
              </button>
            </div>
            
            {product.category && (
              <div className="quickview-meta">
                <span>Category: {product.category}</span>
                {product.sku && <span>SKU: {product.sku}</span>}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default QuickViewModal;
