/**
 * Production Category Page
 * Full-featured category page with filters, sorting, pagination, and SEO
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { categoryAPI, cartAPI, wishlistAPI } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import ProductCard from '../components/ProductCard';
import QuickViewModal from '../components/QuickViewModal';
import { 
  addToCartStorage, 
  addToWishlistStorage, 
  getWishlistItems, 
  removeFromWishlistStorage 
} from '../utils/storage';
import '../styles/pages/Category.css';

export function CategoryPage() {
  const { slug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  // State
  const [category, setCategory] = useState(null);
  const [subcategories, setSubcategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [filters, setFilters] = useState(null);
  const [sortOptions, setSortOptions] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quickView, setQuickView] = useState(null);
  const [wishlistIds, setWishlistIds] = useState(new Set());
  
  // Filter state
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [selectedBrands, setSelectedBrands] = useState([]);
  const [selectedRating, setSelectedRating] = useState(null);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [currentSort, setCurrentSort] = useState('newest');

  const loadWishlist = useCallback(() => {
    const stored = getWishlistItems().map(item => item.productId);
    setWishlistIds(new Set(stored));
  }, []);

  // Load category data
  const loadCategory = useCallback(async () => {
    try {
      setError(null);
      const response = await categoryAPI.getCategory(slug);
      if (response.success) {
        setCategory(response.category);
        setSubcategories(response.subcategories || []);
      } else {
        setError('Category not found');
      }
    } catch (err) {
      console.error('Error loading category:', err);
      setError('Failed to load category');
    }
  }, [slug]);

  // Load products when filters change
  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      
      const params = {
        page: searchParams.get('page') || 1,
        limit: 12,
        sortBy: searchParams.get('sort') || 'newest',
        minPrice: priceRange.min || searchParams.get('minPrice'),
        maxPrice: priceRange.max || searchParams.get('maxPrice'),
        brand: selectedBrands.length === 1 ? selectedBrands[0] : undefined,
        rating: selectedRating || searchParams.get('rating'),
        inStock: inStockOnly || searchParams.get('inStock') === 'true' ? 'true' : undefined,
        search: searchParams.get('search')
      };

      const response = await categoryAPI.getProducts(slug, params);
      
      if (response.success) {
        setProducts(response.products);
        setFilters(response.filters);
        setSortOptions(response.sortOptions || []);
        setPagination(response.pagination);
        setCurrentSort(params.sortBy);
      } else {
        setProducts([]);
      }
    } catch (err) {
      console.error('Error loading products:', err);
      setError('Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [slug, searchParams, priceRange, selectedBrands, selectedRating, inStockOnly]);

  useEffect(() => {
    loadCategory();
    loadWishlist();
  }, [loadCategory, loadWishlist]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Filter handlers
  const handleSortChange = (sortBy) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('sort', sortBy);
    newParams.set('page', '1'); // Reset to first page
    setSearchParams(newParams);
  };

  const handlePriceChange = (type, value) => {
    setPriceRange(prev => ({ ...prev, [type]: value }));
  };

  const applyPriceFilter = () => {
    const newParams = new URLSearchParams(searchParams);
    if (priceRange.min) newParams.set('minPrice', priceRange.min);
    else newParams.delete('minPrice');
    if (priceRange.max) newParams.set('maxPrice', priceRange.max);
    else newParams.delete('maxPrice');
    newParams.set('page', '1');
    setSearchParams(newParams);
  };

  const clearPriceFilter = () => {
    setPriceRange({ min: '', max: '' });
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('minPrice');
    newParams.delete('maxPrice');
    newParams.set('page', '1');
    setSearchParams(newParams);
  };

  const handleBrandToggle = (brandSlug) => {
    const newBrands = selectedBrands.includes(brandSlug)
      ? selectedBrands.filter(b => b !== brandSlug)
      : [...selectedBrands, brandSlug];
    setSelectedBrands(newBrands);
    
    const newParams = new URLSearchParams(searchParams);
    if (newBrands.length === 1) {
      newParams.set('brand', newBrands[0]);
    } else {
      newParams.delete('brand');
    }
    newParams.set('page', '1');
    setSearchParams(newParams);
  };

  const handleRatingChange = (rating) => {
    setSelectedRating(rating === selectedRating ? null : rating);
    const newParams = new URLSearchParams(searchParams);
    if (rating !== selectedRating) {
      newParams.set('rating', rating.toString());
    } else {
      newParams.delete('rating');
    }
    newParams.set('page', '1');
    setSearchParams(newParams);
  };

  const handleStockChange = (e) => {
    const checked = e.target.checked;
    setInStockOnly(checked);
    const newParams = new URLSearchParams(searchParams);
    if (checked) {
      newParams.set('inStock', 'true');
    } else {
      newParams.delete('inStock');
    }
    newParams.set('page', '1');
    setSearchParams(newParams);
  };

  const clearAllFilters = () => {
    setPriceRange({ min: '', max: '' });
    setSelectedBrands([]);
    setSelectedRating(null);
    setInStockOnly(false);
    setSearchParams({ sort: currentSort, page: '1' });
  };

  // Pagination handlers
  const handlePageChange = (page) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('page', page.toString());
    setSearchParams(newParams);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Cart & Wishlist handlers
  const handleAddToCart = async (productId) => {
    addToCartStorage(productId, 1);
    window.dispatchEvent(new Event('cart-updated'));
    
    if (isAuthenticated) {
      try {
        await cartAPI.addToCart(productId, 1);
      } catch (err) {
        console.error('Cart sync failed:', err);
      }
    }
  };

  const handleWishlist = async (productId) => {
    const next = new Set(wishlistIds);
    if (next.has(productId)) {
      next.delete(productId);
      removeFromWishlistStorage(productId);
      if (isAuthenticated) {
        try {
          await wishlistAPI.removeFromWishlist(productId);
        } catch (err) {
          console.error('Wishlist sync failed:', err);
        }
      }
    } else {
      next.add(productId);
      addToWishlistStorage(productId);
      if (isAuthenticated) {
        try {
          await wishlistAPI.addToWishlist(productId);
        } catch (err) {
          console.error('Wishlist sync failed:', err);
        }
      }
    }
    setWishlistIds(next);
    window.dispatchEvent(new Event('wishlist-updated'));
  };

  // Generate breadcrumb
  const breadcrumb = useMemo(() => {
    if (!category) return [];
    const items = [
      { name: 'Home', path: '/' },
      ...(category.breadcrumb || [])
    ];
    return items;
  }, [category]);

  // SEO metadata
  const pageTitle = category?.meta_title || `${category?.name || 'Category'} | OMUNJU SHOPPERS`;
  const pageDescription = category?.meta_description || `Shop ${category?.name || 'products'} at OMUNJU SHOPPERS. Best prices and quality.`;

  if (error && !category) {
    return (
      <div className="category-page">
        <Helmet>
          <title>Page Not Found | OMUNJU SHOPPERS</title>
        </Helmet>
        <div className="category-error">
          <h2>Category Not Found</h2>
          <p>{error}</p>
          <Link to="/products" className="btn-primary">Browse All Products</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="category-page">
      {/* SEO Metadata */}
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href={`https://omunjushoppers.com/category/${slug}`} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:type" content="website" />
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: breadcrumb.map((item, index) => ({
              '@type': 'ListItem',
              position: index + 1,
              name: item.name,
              item: item.path.startsWith('http') ? item.path : `https://omunjushoppers.com${item.path}`
            }))
          })}
        </script>
      </Helmet>

      {/* Breadcrumb */}
      <nav className="category-breadcrumb" aria-label="Breadcrumb">
        <div className="breadcrumb-container">
          <ol className="breadcrumb-list">
            {breadcrumb.map((item, index) => (
              <li key={index} className="breadcrumb-item">
                {index < breadcrumb.length - 1 ? (
                  <Link to={item.path}>{item.name}</Link>
                ) : (
                  <span current>{item.name}</span>
                )}
                {index < breadcrumb.length - 1 && (
                  <span className="breadcrumb-separator">/</span>
                )}
              </li>
            ))}
          </ol>
        </div>
      </nav>

      {/* Category Header */}
      <header className="category-header">
        <div className="header-content">
          <h1>{category?.name || 'Products'}</h1>
          {category?.description && (
            <p className="category-description">{category.description}</p>
          )}
        </div>
      </header>

      {/* Subcategories */}
      {subcategories.length > 0 && (
        <section className="subcategories-section">
          <div className="subcategories-grid">
            {subcategories.map((sub) => (
              <button
                key={sub.id}
                className="subcategory-card"
                onClick={() => navigate(`/category/${sub.slug}`)}
              >
                {sub.image_url && (
                  <img src={sub.image_url} alt={sub.name} />
                )}
                <span>{sub.name}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Toolbar */}
      <div className="category-toolbar">
        <div className="toolbar-left">
          <button 
            className="filter-toggle"
            onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="4" y1="21" x2="4" y2="14"></line>
              <line x1="4" y1="10" x2="4" y2="3"></line>
              <line x1="12" y1="21" x2="12" y2="12"></line>
              <line x1="12" y1="8" x2="12" y2="3"></line>
              <line x1="20" y1="21" x2="20" y2="16"></line>
              <line x1="20" y1="12" x2="20" y2="3"></line>
              <line x1="1" y1="14" x2="7" y2="14"></line>
              <line x1="9" y1="8" x2="15" y2="8"></line>
              <line x1="17" y1="16" x2="23" y2="16"></line>
            </svg>
            Filters
          </button>
          
          <span className="results-count">
            {pagination?.totalProducts || 0} products
          </span>
        </div>

        <div className="toolbar-right">
          <select 
            className="sort-select"
            value={currentSort}
            onChange={(e) => handleSortChange(e.target.value)}
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Content */}
      <div className="category-content">
        {/* Filters Sidebar */}
        <aside className={`filters-sidebar ${mobileFiltersOpen ? 'open' : ''}`}>
          <div className="filters-header">
            <h3>Filters</h3>
            <button className="close-filters" onClick={() => setMobileFiltersOpen(false)}>
              ×
            </button>
          </div>

          <div className="filter-sections">
            {/* Price Filter */}
            <div className="filter-section">
              <h4>Price Range</h4>
              <div className="price-inputs">
                <input
                  type="number"
                  placeholder="Min"
                  value={priceRange.min}
                  onChange={(e) => handlePriceChange('min', e.target.value)}
                />
                <span>-</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={priceRange.max}
                  onChange={(e) => handlePriceChange('max', e.target.value)}
                />
              </div>
              <button className="apply-price" onClick={applyPriceFilter}>
                Apply
              </button>
              {(priceRange.min || priceRange.max) && (
                <button className="clear-price" onClick={clearPriceFilter}>
                  Clear
                </button>
              )}
            </div>

            {/* Brands Filter */}
            {filters?.brands && filters.brands.length > 0 && (
              <div className="filter-section">
                <h4>Brands</h4>
                <div className="checkbox-list">
                  {filters.brands.map((brand) => (
                    <label key={brand.id} className="checkbox-item">
                      <input
                        type="checkbox"
                        checked={selectedBrands.includes(brand.slug)}
                        onChange={() => handleBrandToggle(brand.slug)}
                      />
                      <span>{brand.name}</span>
                      <span className="count">({brand.product_count})</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Rating Filter */}
            <div className="filter-section">
              <h4>Rating</h4>
              <div className="rating-options">
                {[4, 3, 2, 1].map((rating) => (
                  <button
                    key={rating}
                    className={`rating-option ${selectedRating === rating ? 'active' : ''}`}
                    onClick={() => handleRatingChange(rating)}
                  >
                    <span className="stars">
                      {'★'.repeat(rating)}{'☆'.repeat(5 - rating)}
                    </span>
                    <span>& up</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Availability Filter */}
            <div className="filter-section">
              <h4>Availability</h4>
              <label className="checkbox-item">
                <input
                  type="checkbox"
                  checked={inStockOnly}
                  onChange={handleStockChange}
                />
                <span>In Stock Only</span>
              </label>
            </div>

            {/* Clear Filters */}
            <button className="clear-all-filters" onClick={clearAllFilters}>
              Clear All Filters
            </button>
          </div>
        </aside>

        {/* Products Grid */}
        <main className="products-main">
          {loading ? (
            <div className="products-loading">
              <div className="loading-spinner"></div>
              <p>Loading products...</p>
            </div>
          ) : products.length > 0 ? (
            <>
              <div className="products-grid">
                {products.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onBuy={handleAddToCart}
                    onViewDetails={(id) => navigate(`/products/${id}`)}
                    onQuickView={setQuickView}
                    onWishlist={handleWishlist}
                    isWishlisted={wishlistIds.has(product.id)}
                  />
                ))}
              </div>

              {/* Pagination */}
              {pagination && pagination.totalPages > 1 && (
                <nav className="pagination" aria-label="Product pagination">
                  <button
                    className="page-btn"
                    disabled={!pagination.hasPrev}
                    onClick={() => handlePageChange(pagination.page - 1)}
                  >
                    Previous
                  </button>
                  
                  {generatePaginationNumbers(pagination.page, pagination.totalPages).map((page, i) => (
                    page === '...' ? (
                      <span key={i} className="page-ellipsis">...</span>
                    ) : (
                      <button
                        key={page}
                        className={`page-btn ${page === pagination.page ? 'active' : ''}`}
                        onClick={() => handlePageChange(page)}
                      >
                        {page}
                      </button>
                    )
                  ))}
                  
                  <button
                    className="page-btn"
                    disabled={!pagination.hasNext}
                    onClick={() => handlePageChange(pagination.page + 1)}
                  >
                    Next
                  </button>
                </nav>
              )}
            </>
          ) : (
            <div className="products-empty">
              <h3>No products found</h3>
              <p>Try adjusting your filters or browse other categories.</p>
              <button className="btn-primary" onClick={clearAllFilters}>
                Clear All Filters
              </button>
            </div>
          )}
        </main>
      </div>

      {/* Quick View Modal */}
      <QuickViewModal
        product={quickView}
        open={!!quickView}
        onClose={() => setQuickView(null)}
        onAddToCart={handleAddToCart}
        onAddToWishlist={handleWishlist}
        isWishlisted={quickView ? wishlistIds.has(quickView.id) : false}
      />
    </div>
  );
}

// Generate pagination numbers with ellipsis
function generatePaginationNumbers(current, total) {
  const delta = 2;
  const range = [];
  const rangeWithDots = [];
  let l;

  for (let i = 1; i <= total; i++) {
    if (i === 1 || i === total || (i >= current - delta && i <= current + delta)) {
      range.push(i);
    }
  }

  range.forEach(i => {
    if (l) {
      if (i - l === 2) {
        rangeWithDots.push(l + 1);
      } else if (i - l !== 1) {
        rangeWithDots.push('...');
      }
    }
    rangeWithDots.push(i);
    l = i;
  });

  return rangeWithDots;
}

export default CategoryPage;
