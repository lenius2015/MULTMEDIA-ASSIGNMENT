/**
 * Category Page JavaScript
 * Handles product filtering, sorting, and API interactions
 */

// ============================================
// Configuration & State
// ============================================
const API_BASE_URL = '/api/products';
let currentState = {
    category: 'all',
    minPrice: null,
    maxPrice: null,
    brand: null,
    rating: null,
    sort: 'newest',
    page: 1,
    limit: 12
};

let products = [];
let brands = [];
let cart = [];
let wishlist = [];

// ============================================
// Initialization
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    // Parse URL parameters
    parseURLParams();
    
    // Initialize components
    initCategoryFromURL();
    loadBrands();
    fetchProducts();
    loadCartFromStorage();
    
    // Setup event listeners
    setupEventListeners();
});

// ============================================
// URL Parameter Handling
// ============================================
function parseURLParams() {
    const urlParams = new URLSearchParams(window.location.search);
    
    // Update state from URL
    if (urlParams.has('category')) {
        currentState.category = urlParams.get('category');
    }
    if (urlParams.has('page')) {
        currentState.page = parseInt(urlParams.get('page')) || 1;
    }
}

function updateURL() {
    const url = new URL(window.location);
    url.searchParams.set('category', currentState.category);
    url.searchParams.set('page', currentState.page.toString());
    window.history.pushState({}, '', url);
}

function initCategoryFromURL() {
    // Update category filter radio buttons
    const categoryRadios = document.querySelectorAll('input[name="category"]');
    categoryRadios.forEach(radio => {
        radio.checked = radio.value === currentState.category;
    });

    // Update page title and breadcrumb
    updatePageTitle();
}

function updatePageTitle() {
    const categoryNames = {
        'all': 'All Products',
        'electronics': 'Electronics',
        'fashion': 'Fashion',
        'home': 'Home & Garden',
        'sports': 'Sports',
        'beauty': 'Beauty',
        'books': 'Books',
        'deals': 'Special Deals',
        'new_arrivals': 'New Arrivals'
    };

    const title = categoryNames[currentState.category] || 'Products';
    document.getElementById('categoryTitle').textContent = title;
    document.getElementById('breadcrumbCurrent').textContent = title;
    
    // Update description
    const descriptions = {
        'all': 'Browse our complete collection of products',
        'deals': 'Hot deals and discounts on select items',
        'new_arrivals': 'Check out our latest additions'
    };
    
    const desc = descriptions[currentState.category] || `Shop ${title} at great prices`;
    document.getElementById('categoryDescription').textContent = desc;
}

// ============================================
// Event Listeners
// ============================================
function setupEventListeners() {
    // Category filter
    const categoryRadios = document.querySelectorAll('input[name="category"]');
    categoryRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            currentState.category = e.target.value;
            currentState.page = 1;
            updateURL();
            updatePageTitle();
            fetchProducts();
        });
    });

    // Sort select
    document.getElementById('sortSelect').addEventListener('change', (e) => {
        currentState.sort = e.target.value;
        fetchProducts();
    });

    // Close dropdowns when clicking outside
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.user-dropdown') && !e.target.closest('#accountAction')) {
            closeUserDropdown();
        }
    });
}

// ============================================
// Filter Functions
// ============================================
function toggleFilter(filterName) {
    const title = document.querySelector(`.filter-title[onclick*="${filterName}"]`);
    const options = title.nextElementSibling;
    
    title.classList.toggle('collapsed');
    
    if (title.classList.contains('collapsed')) {
        options.style.display = 'none';
    } else {
        options.style.display = 'block';
    }
}

function applyPriceFilter() {
    const minPrice = document.getElementById('minPrice').value;
    const maxPrice = document.getElementById('maxPrice').value;
    
    currentState.minPrice = minPrice ? parseFloat(minPrice) : null;
    currentState.maxPrice = maxPrice ? parseFloat(maxPrice) : null;
    currentState.page = 1;
    
    fetchProducts();
    showActiveFilters();
}

function filterBrands() {
    const search = document.getElementById('brandSearch').value.toLowerCase();
    const brandItems = document.querySelectorAll('#brandList .filter-option');
    
    brandItems.forEach(item => {
        const brand = item.querySelector('span').textContent.toLowerCase();
        item.style.display = brand.includes(search) ? 'flex' : 'none';
    });
}

function applyRatingFilter(rating) {
    currentState.rating = rating;
    currentState.page = 1;
    fetchProducts();
    showActiveFilters();
}

function applyBrandFilter(brand) {
    currentState.brand = brand;
    currentState.page = 1;
    fetchProducts();
    showActiveFilters();
}

function clearAllFilters() {
    // Reset state
    currentState.category = 'all';
    currentState.minPrice = null;
    currentState.maxPrice = null;
    currentState.brand = null;
    currentState.rating = null;
    currentState.page = 1;

    // Reset UI
    document.querySelectorAll('input[name="category"]').forEach(radio => {
        radio.checked = radio.value === 'all';
    });
    document.getElementById('minPrice').value = '';
    document.getElementById('maxPrice').value = '';
    document.querySelectorAll('input[name="rating"]').forEach(radio => radio.checked = false);
    
    // Clear brand selection
    const brandCheckboxes = document.querySelectorAll('#brandList input[type="checkbox"]');
    brandCheckboxes.forEach(cb => cb.checked = false);
    
    // Hide active filters
    document.getElementById('activeFilters').innerHTML = '';
    
    // Update URL and fetch
    updateURL();
    updatePageTitle();
    fetchProducts();
}

function applySorting() {
    currentState.sort = document.getElementById('sortSelect').value;
    fetchProducts();
}

// ============================================
// Active Filters Display
// ============================================
function showActiveFilters() {
    const container = document.getElementById('activeFilters');
    const filters = [];

    if (currentState.minPrice || currentState.maxPrice) {
        const range = `$${currentState.minPrice || 0} - $${currentState.maxPrice || '∞'}`;
        filters.push({ type: 'price', label: range, value: 'price' });
    }

    if (currentState.rating) {
        filters.push({ type: 'rating', label: `${currentState.rating}+ Stars`, value: currentState.rating });
    }

    if (currentState.brand) {
        filters.push({ type: 'brand', label: currentState.brand, value: currentState.brand });
    }

    container.innerHTML = filters.map(f => `
        <span class="filter-tag">
            ${f.label}
            <button onclick="removeFilter('${f.type}')">&times;</button>
        </span>
    `).join('');
}

function removeFilter(type) {
    switch (type) {
        case 'price':
            currentState.minPrice = null;
            currentState.maxPrice = null;
            document.getElementById('minPrice').value = '';
            document.getElementById('maxPrice').value = '';
            break;
        case 'rating':
            currentState.rating = null;
            document.querySelectorAll('input[name="rating"]').forEach(r => r.checked = false);
            break;
        case 'brand':
            currentState.brand = null;
            const brandCheckboxes = document.querySelectorAll('#brandList input[type="checkbox"]');
            brandCheckboxes.forEach(cb => cb.checked = false);
            break;
    }

    currentState.page = 1;
    fetchProducts();
    showActiveFilters();
}

// ============================================
// View Toggle
// ============================================
function setGridView() {
    document.getElementById('productsGrid').classList.remove('list-view');
    document.querySelectorAll('.view-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector('.view-btn:first-child').classList.add('active');
}

function setListView() {
    document.getElementById('productsGrid').classList.add('list-view');
    document.querySelectorAll('.view-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector('.view-btn:last-child').classList.add('active');
}

// ============================================
// API Functions
// ============================================
async function fetchProducts() {
    showLoading(true);

    try {
        // Build query parameters
        const params = new URLSearchParams();
        
        if (currentState.category && currentState.category !== 'all') {
            params.append('category', currentState.category);
        }
        
        if (currentState.minPrice) params.append('minPrice', currentState.minPrice);
        if (currentState.maxPrice) params.append('maxPrice', currentState.maxPrice);
        if (currentState.brand) params.append('brand', currentState.brand);
        if (currentState.rating) params.append('rating', currentState.rating);
        if (currentState.sort) params.append('sort', currentState.sort);
        if (currentState.page) params.append('page', currentState.page);
        params.append('limit', currentState.limit);

        // For demo, use mock data if API not available
        const response = await fetch(`${API_BASE_URL}?${params}`);
        
        if (!response.ok) {
            throw new Error('API request failed');
        }

        const data = await response.json();
        
        if (data.success) {
            products = data.products;
            renderProducts();
            renderPagination(data.totalPages);
            document.getElementById('productCount').textContent = `${data.total} products found`;
        } else {
            throw new Error(data.message || 'Failed to fetch products');
        }
    } catch (error) {
        console.log('Using mock data:', error.message);
        // Use mock data for demo
        products = getMockProducts();
        renderProducts();
        renderPagination(5);
        document.getElementById('productCount').textContent = `${products.length} products found`;
    } finally {
        showLoading(false);
    }
}

async function loadBrands() {
    // Load brands from API or use mock data
    const mockBrands = [
        'Apple', 'Samsung', 'Sony', 'Nike', 'Adidas',
        'Puma', 'LG', 'Dell', 'HP', 'Bose',
        'Canon', 'Nikon', 'Dyson', 'KitchenAid', 'Philips'
    ];
    
    const container = document.getElementById('brandList');
    
    // Try to fetch from API
    try {
        const response = await fetch('/api/brands');
        if (response.ok) {
            const data = await response.json();
            brands = data.brands;
        } else {
            brands = mockBrands;
        }
    } catch (error) {
        brands = mockBrands;
    }

    // Render brand list
    container.innerHTML = brands.map(brand => `
        <label class="filter-option">
            <input type="checkbox" name="brand" value="${brand}" onchange="applyBrandFilter('${brand}')">
            <span>${brand}</span>
        </label>
    `).join('');
}

// ============================================
// Render Functions
// ============================================
function renderProducts() {
    const grid = document.getElementById('productsGrid');
    const emptyState = document.getElementById('emptyState');

    if (products.length === 0) {
        grid.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }

    emptyState.style.display = 'none';
    
    grid.innerHTML = products.map(product => createProductCard(product)).join('');
}

function createProductCard(product) {
    const inWishlist = wishlist.includes(product.id);
    const discount = product.oldPrice 
        ? Math.round((1 - product.price / product.oldPrice) * 100) 
        : 0;
    
    return `
        <div class="product-card" data-product-id="${product.id}">
            ${discount > 0 ? `<span class="product-badge">-${discount}%</span>` : ''}
            <div class="product-wishlist ${inWishlist ? 'active' : ''}" onclick="toggleWishlistItem(${product.id})">
                <i class="${inWishlist ? 'fas' : 'far'} fa-heart"></i>
            </div>
            <div class="product-image" onclick="viewProduct(${product.id})">
                <img src="${product.image || 'https://via.placeholder.com/200'}" alt="${product.name}">
            </div>
            <div class="product-info">
                <div class="product-category">${product.category || 'General'}</div>
                <h3 class="product-name" onclick="viewProduct(${product.id})">${product.name}</h3>
                <div class="product-rating">
                    <span class="stars">${getStars(product.rating)}</span>
                    <span class="rating-count">(${product.reviews || 0})</span>
                </div>
                <div class="product-pricing">
                    <span class="current-price">$${(product.price || 0).toFixed(2)}</span>
                    ${product.oldPrice ? `
                        <span class="old-price">$${product.oldPrice.toFixed(2)}</span>
                        <span class="discount-percent">${discount}% OFF</span>
                    ` : ''}
                </div>
                <button class="add-to-cart" onclick="addToCart(${product.id})">
                    <i class="fas fa-shopping-cart"></i> Add to Cart
                </button>
            </div>
        </div>
    `;
}

function getStars(rating) {
    const fullStars = Math.floor(rating || 0);
    const halfStar = (rating || 0) % 1 >= 0.5;
    let stars = '';
    
    for (let i = 0; i < fullStars; i++) stars += '<i class="fas fa-star"></i>';
    if (halfStar) stars += '<i class="fas fa-star-half-alt"></i>';
    
    const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);
    for (let i = 0; i < emptyStars; i++) stars += '<i class="far fa-star"></i>';
    
    return stars;
}

function renderPagination(totalPages) {
    const container = document.getElementById('pagination');
    
    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }

    let html = `
        <button class="pagination-btn" ${currentState.page === 1 ? 'disabled' : ''} 
                onclick="goToPage(${currentState.page - 1})">
            <i class="fas fa-chevron-left"></i>
        </button>
    `;

    // Generate page numbers
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentState.page - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage < maxVisiblePages - 1) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    if (startPage > 1) {
        html += `<button class="pagination-btn" onclick="goToPage(1)">1</button>`;
        if (startPage > 2) html += `<span class="pagination-ellipsis">...</span>`;
    }

    for (let i = startPage; i <= endPage; i++) {
        html += `
            <button class="pagination-btn ${i === currentState.page ? 'active' : ''}" 
                    onclick="goToPage(${i})">${i}</button>
        `;
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) html += `<span class="pagination-ellipsis">...</span>`;
        html += `<button class="pagination-btn" onclick="goToPage(${totalPages})">${totalPages}</button>`;
    }

    html += `
        <button class="pagination-btn" ${currentState.page === totalPages ? 'disabled' : ''} 
                onclick="goToPage(${currentState.page + 1})">
            <i class="fas fa-chevron-right"></i>
        </button>
    `;

    container.innerHTML = html;
}

function goToPage(page) {
    currentState.page = page;
    updateURL();
    fetchProducts();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ============================================
// Loading States
// ============================================
function showLoading(show) {
    const skeleton = document.getElementById('loadingSkeleton');
    
    if (show) {
        skeleton.style.display = 'block';
        // Show multiple skeleton cards
        const grid = document.getElementById('productsGrid');
        const existingSkeletons = grid.querySelectorAll('.product-skeleton');
        if (existingSkeletons.length < 4) {
            for (let i = 0; i < 4; i++) {
                const clone = skeleton.cloneNode(true);
                clone.style.display = 'block';
                grid.appendChild(clone);
            }
        }
    } else {
        skeleton.style.display = 'none';
        // Remove all skeleton cards
        const grid = document.getElementById('productsGrid');
        grid.querySelectorAll('.product-skeleton').forEach(s => s.remove());
    }
}

// ============================================
// Cart Functions
// ============================================
function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const existingItem = cart.find(item => item.id === productId);
    if (existingItem) {
        existingItem.quantity++;
    } else {
        cart.push({ ...product, quantity: 1 });
    }

    updateCartUI();
    showToast(`${product.name} added to cart!`, 'success');
    saveCartToStorage();
}

function updateCartUI() {
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    document.getElementById('cartCount').textContent = totalItems;

    const cartItemsEl = document.getElementById('cartItems');
    if (cart.length === 0) {
        cartItemsEl.innerHTML = '<p style="text-align: center; padding: 40px; color: #6c757d;">Your cart is empty</p>';
    } else {
        cartItemsEl.innerHTML = cart.map(item => `
            <div class="cart-item">
                <div class="cart-item-image">
                    <img src="${item.image || 'https://via.placeholder.com/50'}" alt="${item.name}">
                </div>
                <div class="cart-item-info">
                    <div class="cart-item-name">${item.name}</div>
                    <div class="cart-item-price">$${(item.price || 0).toFixed(2)}</div>
                    <div class="cart-item-quantity">
                        <button class="qty-btn" onclick="updateCartQuantity(${item.id}, -1)">-</button>
                        <span class="cart-item-qty">${item.quantity}</span>
                        <button class="qty-btn" onclick="updateCartQuantity(${item.id}, 1)">+</button>
                    </div>
                </div>
                <button onclick="removeFromCart(${item.id})" style="background: none; border: none; cursor: pointer; color: #dc3545;">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `).join('');
    }

    const total = cart.reduce((sum, item) => sum + ((item.price || 0) * item.quantity), 0);
    document.getElementById('cartTotal').textContent = `$${total.toFixed(2)}`;
}

function updateCartQuantity(productId, delta) {
    const item = cart.find(item => item.id === productId);
    if (item) {
        item.quantity += delta;
        if (item.quantity <= 0) {
            removeFromCart(productId);
        } else {
            updateCartUI();
            saveCartToStorage();
        }
    }
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    updateCartUI();
    saveCartToStorage();
}

function toggleCart() {
    const sidebar = document.getElementById('cartSidebar');
    const overlay = document.getElementById('overlay');
    sidebar.classList.toggle('open');
    overlay.classList.toggle('active');
}

function checkout() {
    if (cart.length === 0) {
        showToast('Your cart is empty!', 'error');
        return;
    }
    showToast('Redirecting to checkout...', 'success');
}

function saveCartToStorage() {
    localStorage.setItem('shopease_cart', JSON.stringify(cart));
}

function loadCartFromStorage() {
    const savedCart = localStorage.getItem('shopease_cart');
    if (savedCart) {
        cart = JSON.parse(savedCart);
        updateCartUI();
    }
}

// ============================================
// Wishlist Functions
// ============================================
function toggleWishlist() {
    showToast('Wishlist feature coming soon!', 'success');
}

function toggleWishlistItem(productId) {
    const index = wishlist.indexOf(productId);
    if (index > -1) {
        wishlist.splice(index, 1);
        showToast('Removed from wishlist', 'success');
    } else {
        wishlist.push(productId);
        showToast('Added to wishlist!', 'success');
    }
    renderProducts();
    localStorage.setItem('shopease_wishlist', JSON.stringify(wishlist));
}

// ============================================
// Auth Functions - Using existing login.html
// ============================================
function handleAccountClick() {
    window.location.href = '/login';
}

function openLoginModal() {
    window.location.href = '/login';
}

function closeLoginModal() { }
function toggleUserDropdown() { }
function closeUserDropdown() { }
function closeAllModals() { toggleCart(); }
function handleLogin(event) { event.preventDefault(); window.location.href = '/login'; }
function handleLogout() { window.location.href = '/login'; }
function socialLogin(provider) { window.location.href = '/login'; }
function switchToRegister() { window.location.href = '/signup'; }
function updateUIForLoggedInUser() { }
function updateUIForLoggedOutUser() { }
function loadAuthState() { }

// ============================================
// Search & Navigation
// ============================================
function performSearch() {
    const query = document.getElementById('searchInput').value.trim();
    if (query) {
        window.location.href = `category.html?category=all&search=${encodeURIComponent(query)}`;
    }
}

function viewProduct(productId) {
    window.location.href = `/product/${productId}`;
}

// ============================================
// Toast Notification
// ============================================
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// ============================================
// Mock Data (for demo purposes)
// ============================================
function getMockProducts() {
    const categories = ['Electronics', 'Fashion', 'Home', 'Sports', 'Beauty'];
    const productNames = {
        'Electronics': ['Wireless Headphones', 'Smart Watch', 'Laptop', 'Tablet', 'Camera', 'Speaker'],
        'Fashion': ['T-Shirt', 'Jeans', 'Sneakers', 'Jacket', 'Dress', 'Sweater'],
        'Home': ['Lamp', 'Vase', 'Cushion', 'Rug', 'Mirror', 'Clock'],
        'Sports': ['Running Shoes', 'Yoga Mat', 'Dumbbells', 'Bike', 'Tennis Racket', 'Backpack'],
        'Beauty': ['Moisturizer', 'Lipstick', 'Perfume', 'Shampoo', 'Face Cream', 'Nail Polish']
    };

    const products = [];
    const totalProducts = 24;

    for (let i = 1; i <= totalProducts; i++) {
        const category = categories[Math.floor(Math.random() * categories.length)];
        const names = productNames[category];
        const name = names[Math.floor(Math.random() * names.length)];
        const price = Math.floor(Math.random() * 200) + 20;
        const oldPrice = Math.random() > 0.5 ? price + Math.floor(Math.random() * 50) + 10 : null;
        const rating = (Math.random() * 2 + 3).toFixed(1);

        products.push({
            id: i,
            name: `${name} ${i}`,
            category: category,
            price: price,
            oldPrice: oldPrice,
            rating: parseFloat(rating),
            reviews: Math.floor(Math.random() * 500) + 10,
            image: `https://via.placeholder.com/200x200?text=${encodeURIComponent(name)}`,
            brand: ['Apple', 'Samsung', 'Nike', 'Adidas'][Math.floor(Math.random() * 4)]
        });
    }

    // Filter by category if specified
    if (currentState.category && currentState.category !== 'all') {
        const categoryMap = {
            'electronics': 'Electronics',
            'fashion': 'Fashion',
            'home': 'Home',
            'sports': 'Sports',
            'beauty': 'Beauty'
        };
        
        const targetCategory = categoryMap[currentState.category];
        if (targetCategory) {
            return products.filter(p => p.category === targetCategory);
        }
    }

    // Filter deals
    if (currentState.category === 'deals') {
        return products.filter(p => p.oldPrice !== null);
    }

    // Sort products
    switch (currentState.sort) {
        case 'price_low':
            products.sort((a, b) => a.price - b.price);
            break;
        case 'price_high':
            products.sort((a, b) => b.price - a.price);
            break;
        case 'bestselling':
            products.sort((a, b) => b.reviews - a.reviews);
            break;
        case 'rating':
            products.sort((a, b) => b.rating - a.rating);
            break;
    }

    return products;
}

// ============================================
// Utility Functions
// ============================================
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
