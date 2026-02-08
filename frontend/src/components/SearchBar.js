/**
 * Real-time Search Bar with autocomplete suggestions
 * Uses debounce to reduce API calls
 */

import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { homeAPI } from '../services/api';
import { useDebounce } from '../hooks/useDebounce';
import { getDiscountedPrice, getProductImage } from '../utils/product';
import '../styles/SearchBar.css';

export function SearchBar({ 
  placeholder = 'Search products, brands, categories...',
  onSearch,
  showResults = true 
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debouncedQuery = useDebounce(query, 300);
  const navigate = useNavigate();
  const containerRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Perform search when debounced query changes
  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults([]);
      setOpen(false);
      return;
    }

    const performSearch = async () => {
      setLoading(true);
      try {
        const response = await homeAPI.search(debouncedQuery.trim());
        if (response.success) {
          setResults(response.data || []);
          setOpen(true);
        } else {
          setResults([]);
          setOpen(false);
        }
      } catch (error) {
        console.error('Search failed:', error);
        setResults([]);
        setOpen(false);
      } finally {
        setLoading(false);
      }
    };

    performSearch();
  }, [debouncedQuery]);

  // Handle form submission
  const handleSubmit = (event) => {
    event.preventDefault();
    if (!query.trim()) return;
    
    // Call onSearch callback if provided
    onSearch?.(query.trim());
    
    // Navigate to products page with search query
    navigate(`/products?search=${encodeURIComponent(query.trim())}`);
    setOpen(false);
  };

  // Handle selecting a product from results
  const handleSelectProduct = (productId) => {
    setOpen(false);
    setQuery('');
    navigate(`/products/${productId}`);
  };

  return (
    <div className="searchbar" ref={containerRef}>
      <form onSubmit={handleSubmit} className="searchbar-form">
        <input
          type="search"
          placeholder={placeholder}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => query.trim() && setOpen(true)}
          aria-label="Search products"
          className="searchbar-input"
        />
        <button type="submit" className="searchbar-submit" aria-label="Search">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="M21 21l-4.35-4.35"/>
          </svg>
        </button>
      </form>

      {showResults && open && (
        <div className="searchbar-results">
          {loading && (
            <div className="searchbar-loading">
              <span className="loading-spinner"></span>
              Searching...
            </div>
          )}
          
          {!loading && results.length === 0 && query.trim() && (
            <div className="searchbar-empty">
              No products found for "{query}"
            </div>
          )}
          
          {!loading && results.length > 0 && (
            <>
              <div className="searchbar-header">
                {results.length} result{results.length !== 1 ? 's' : ''} found
              </div>
              {results.map((item) => (
                <button
                  key={item.id}
                  className="searchbar-item"
                  onClick={() => handleSelectProduct(item.id)}
                >
                  <img 
                    src={getProductImage(item)} 
                    alt={item.name}
                    className="searchbar-item-image"
                    onError={(e) => {
                      e.target.src = '/images/category-placeholder.jpg';
                    }}
                  />
                  <div className="searchbar-item-info">
                    <span className="searchbar-item-name">{item.name}</span>
                    <span className="searchbar-item-price">
                      ${getDiscountedPrice(item).toFixed(2)}
                      {hasDiscount(item) && (
                        <span className="searchbar-item-original">
                          ${Number(item.price).toFixed(2)}
                        </span>
                      )}
                    </span>
                    {item.category_name && (
                      <span className="searchbar-item-category">{item.category_name}</span>
                    )}
                  </div>
                </button>
              ))}
              <button 
                className="searchbar-view-all"
                onClick={handleSubmit}
              >
                View all results for "{query}"
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// Helper function for discount check
function hasDiscount(product) {
  return product && product.discount > 0;
}

export default SearchBar;
