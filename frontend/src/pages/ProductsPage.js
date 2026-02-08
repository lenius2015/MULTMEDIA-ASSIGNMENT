/**
 * Products Page
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { cartAPI, productAPI, wishlistAPI } from '../services/api';
import ProductCard from '../components/ProductCard';
import '../styles/pages/Products.css';
import { addToCartStorage, addToWishlistStorage, getWishlistItems, removeFromWishlistStorage } from '../utils/storage';

export function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [filters, setFilters] = useState({
    category: '',
    search: '',
    minPrice: '',
    maxPrice: ''
  });
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [wishlistIds, setWishlistIds] = useState(new Set());
  const navigate = useNavigate();

  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await productAPI.getAll(filters, page);
      if (response.success) {
        setProducts(response.data);
        setTotal(response.pagination?.total || response.data.length);
      }
    } catch (error) {
      console.error('Failed to load products:', error);
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  const loadCategories = useCallback(async () => {
    try {
      const response = await productAPI.getCategories();
      if (response.success) {
        setCategories(response.data);
      }
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  }, []);

  useEffect(() => {
    loadProducts();
    loadCategories();
  }, [loadProducts, loadCategories]);

  useEffect(() => {
    const storedWishlist = getWishlistItems().map((item) => item.productId);
    setWishlistIds(new Set(storedWishlist));
  }, []);

  

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
    setPage(1);
  };

  const handleAddToCart = async (productId) => {
    addToCartStorage(productId, 1);
    window.dispatchEvent(new Event('cart-updated'));
    try {
      await cartAPI.addToCart(productId, 1);
    } catch (error) {
      console.error('Add to cart failed:', error);
    }
  };

  const handleWishlist = async (productId) => {
    const next = new Set(wishlistIds);
    if (next.has(productId)) {
      next.delete(productId);
      removeFromWishlistStorage(productId);
      try {
        await wishlistAPI.removeFromWishlist(productId);
      } catch (error) {
        console.error('Remove wishlist failed:', error);
      }
    } else {
      next.add(productId);
      addToWishlistStorage(productId);
      try {
        await wishlistAPI.addToWishlist(productId);
      } catch (error) {
        console.error('Add wishlist failed:', error);
      }
    }
    setWishlistIds(next);
    window.dispatchEvent(new Event('wishlist-updated'));
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="products-page">
      <div className="products-container">
        {/* Filters Sidebar */}
        <aside className="filters-sidebar">
          <h3>Filters</h3>
          
          <div className="filter-group">
            <label>Search</label>
            <input
              type="text"
              name="search"
              value={filters.search}
              onChange={handleFilterChange}
              placeholder="Search products..."
            />
          </div>

          <div className="filter-group">
            <label>Category</label>
            <select
              name="category"
              value={filters.category}
              onChange={handleFilterChange}
            >
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat.id || cat.name || cat} value={cat.name || cat}>
                  {cat.name || cat}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Min Price</label>
            <input
              type="number"
              name="minPrice"
              value={filters.minPrice}
              onChange={handleFilterChange}
              placeholder="0"
            />
          </div>

          <div className="filter-group">
            <label>Max Price</label>
            <input
              type="number"
              name="maxPrice"
              value={filters.maxPrice}
              onChange={handleFilterChange}
              placeholder="999999"
            />
          </div>
        </aside>

        {/* Products Grid */}
        <main className="products-main">
          <div className="products-count">
            Showing {products.length} of {total} products
          </div>

          <div className="products-grid">
            {products.map(product => (
              <ProductCard
                key={product.id}
                product={product}
                onBuy={handleAddToCart}
                onViewDetails={(id) => navigate(`/products/${id}`)}
                onWishlist={handleWishlist}
                isWishlisted={wishlistIds.has(product.id)}
              />
            ))}
          </div>

          {/* Pagination */}
          <div className="pagination">
            <button
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
            >
              Previous
            </button>
            <span>{page}</span>
            <button
              disabled={products.length === 0}
              onClick={() => setPage(p => p + 1)}
            >
              Next
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}

export default ProductsPage;
