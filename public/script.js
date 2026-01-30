// ========== GLOBAL VARIABLES ==========
let currentSlide = 0;
let cartCount = 0;
let autoSlideInterval;

// ========== DOM CONTENT LOADED ==========
document.addEventListener('DOMContentLoaded', function() {
  initializeSlider();
  initializeNavigation();
  initializeCart();
  initializeScrollToTop();
  initializeCategoryMenu();
  initializeProductCards();
  initializeSearch();
  initializeGlobalSearch();
  syncCartCount();
  syncWishlistCount();

  // Hide logged-in account promo blocks on public pages
  try {
    const path = window.location.pathname;
    const isDashboard = path === '/dashboard';
    if (!isDashboard) {
      document.querySelectorAll('.account-card.logged-in').forEach(el => {
        const section = el.closest('.account-section');
        el.remove();
        // Remove the entire section if it no longer contains any account cards
        if (section && section.querySelectorAll('.account-card').length === 0) {
          section.remove();
        }
      });
    }
  } catch (e) {
    console.warn('Account promo cleanup skipped:', e);
  }
});

// ========== HERO SLIDER ==========
function initializeSlider() {
  const slides = document.querySelectorAll('.slider-item');
  const dots = document.querySelectorAll('.dot');
  const prevBtn = document.querySelector('.slider-prev');
  const nextBtn = document.querySelector('.slider-next');

  if (!slides.length) return;

  // Show first slide
  showSlide(0);

  // Auto slide
  startAutoSlide();

  // Previous button
  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      stopAutoSlide();
      previousSlide();
      startAutoSlide();
    });
  }

  // Next button
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      stopAutoSlide();
      nextSlide();
      startAutoSlide();
    });
  }

  // Dots navigation
  dots.forEach((dot, index) => {
    dot.addEventListener('click', () => {
      stopAutoSlide();
      showSlide(index);
      startAutoSlide();
    });
  });

  // Pause on hover
  const sliderContainer = document.querySelector('.slider-container');
  if (sliderContainer) {
    sliderContainer.addEventListener('mouseenter', stopAutoSlide);
    sliderContainer.addEventListener('mouseleave', startAutoSlide);
  }
}

function showSlide(index) {
  const slides = document.querySelectorAll('.slider-item');
  const dots = document.querySelectorAll('.dot');

  if (!slides.length) return;

  // Wrap around
  if (index >= slides.length) {
    currentSlide = 0;
  } else if (index < 0) {
    currentSlide = slides.length - 1;
  } else {
    currentSlide = index;
  }

  // Remove active class from all
  slides.forEach(slide => slide.classList.remove('active'));
  dots.forEach(dot => dot.classList.remove('active'));

  // Add active class to current
  slides[currentSlide].classList.add('active');
  if (dots[currentSlide]) {
    dots[currentSlide].classList.add('active');
  }
}

function nextSlide() {
  showSlide(currentSlide + 1);
}

function previousSlide() {
  showSlide(currentSlide - 1);
}

function startAutoSlide() {
  autoSlideInterval = setInterval(() => {
    nextSlide();
  }, 5000); // Change slide every 5 seconds
}

function stopAutoSlide() {
  clearInterval(autoSlideInterval);
}

// ========== NAVIGATION ==========
function initializeNavigation() {
  const hamburger = document.getElementById('hamburger');
  const navLinks = document.getElementById('navLinks');

  if (hamburger && navLinks) {
    hamburger.addEventListener('click', () => {
      navLinks.classList.toggle('active');
      hamburger.classList.toggle('active');
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
      if (!hamburger.contains(e.target) && !navLinks.contains(e.target)) {
        navLinks.classList.remove('active');
        hamburger.classList.remove('active');
      }
    });

    // Close menu when clicking on a link
    const links = navLinks.querySelectorAll('a');
    links.forEach(link => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('active');
        hamburger.classList.remove('active');
      });
    });
  }

  // Sticky header on scroll
  let lastScroll = 0;
  const header = document.querySelector('.navbar-header');

  window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;

    if (currentScroll <= 0) {
      header.classList.remove('scroll-up');
      return;
    }

    if (currentScroll > lastScroll && !header.classList.contains('scroll-down')) {
      // Scroll down
      header.classList.remove('scroll-up');
      header.classList.add('scroll-down');
    } else if (currentScroll < lastScroll && header.classList.contains('scroll-down')) {
      // Scroll up
      header.classList.remove('scroll-down');
      header.classList.add('scroll-up');
    }

    lastScroll = currentScroll;
  });
}

// ========== CATEGORY MENU ==========
function initializeCategoryMenu() {
  const categoryCards = document.querySelectorAll('.category-card');

  categoryCards.forEach(card => {
    card.addEventListener('click', function() {
      const categoryName = this.querySelector('h3').textContent;
      console.log('Category clicked:', categoryName);
      // Add your category filtering logic here
      showNotification(`Browsing ${categoryName}`, 'info');
    });
  });
}

// ========== SHOPPING CART ==========
async function initializeCart() {
  const cartBtn = document.getElementById('cartBtn');
  const addToCartBtns = document.querySelectorAll('.add-to-cart-btn');

  // Add to cart buttons
  addToCartBtns.forEach(btn => {
    btn.addEventListener('click', async function(e) {
      e.stopPropagation();
      
      // Try to get product ID from button first, then from parent card
      let productId = this.dataset.productId;
      if (!productId) {
        const productCard = this.closest('.product-card');
        productId = productCard?.dataset.productId;
      }
      
      if (productId) {
        await addToCart(productId, 1, this);
      } else {
        // Fallback for static products without ID
        const productCard = this.closest('.product-card');
        const productTitle = productCard?.querySelector('.product-title')?.textContent || 'Product';
        const productPrice = productCard?.querySelector('.price-current')?.textContent || 'Tsh 0';
        addToCartFallback(productTitle, productPrice, this);
      }
    });
  });

  // Cart button click
  if (cartBtn) {
    cartBtn.addEventListener('click', () => {
      window.location.href = '/cart';
    });
  }

  // Sync cart count from server
  await syncCartCount();
}

async function addToCart(productId, quantity = 1, button = null) {
  // Check if user is logged in
  const userData = document.body.getAttribute('data-user');
  const isLoggedIn = userData && userData !== 'null' && userData !== '{"id":null}';
  
  if (!isLoggedIn) {
    // Guest user - use localStorage
    addToCartGuest(productId, quantity, button);
    return;
  }
  
  try {
    const response = await fetch('/api/cart', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ productId, quantity })
    });

    const result = await response.json();

    if (result.success) {
      // Prefer server truth for item count when available
      if (typeof result.itemCount === 'number') {
        cartCount = result.itemCount;
      } else {
        cartCount++;
      }
      updateCartBadge();
      showNotification('Item added to cart!', 'success');
      if (button) {
        animateAddToCart(button);
      }
    } else if (result.message?.toLowerCase().includes('login')) {
      showNotification('Please login to add items to cart', 'warning');
      setTimeout(() => {
        window.location.href = '/login';
      }, 1500);
    } else {
      showNotification(result.message || 'Failed to add to cart', 'error');
    }
  } catch (error) {
    console.error('Add to cart error:', error);
    showNotification('Failed to add to cart. Please try again.', 'error');
  }
}

function addToCartGuest(productId, quantity = 1, button = null) {
  // Get existing guest cart from localStorage
  let guestCart = JSON.parse(localStorage.getItem('guestCart') || '[]');
  
  // Check if product already in cart
  const existingItem = guestCart.find(item => item.productId === productId);
  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    guestCart.push({ productId, quantity });
  }
  
  // Save to localStorage
  localStorage.setItem('guestCart', JSON.stringify(guestCart));
  
  // Update cart count
  cartCount = guestCart.reduce((sum, item) => sum + item.quantity, 0);
  updateCartBadge();
  
  showNotification('Item added to cart!', 'success');
  if (button) {
    animateAddToCart(button);
  }
}

// Update item quantity in cart
async function updateCartItem(productId, quantity) {
  try {
    const response = await fetch(`/api/cart/${productId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quantity: parseInt(quantity, 10) })
    });
    const result = await response.json();

    if (result.success) {
      if (typeof result.itemCount === 'number') {
        cartCount = result.itemCount;
        updateCartBadge();
      } else {
        await syncCartCount();
      }
      showNotification('Quantity updated', 'success');
      return true;
    } else {
      showNotification(result.message || 'Failed to update quantity', 'error');
      return false;
    }
  } catch (error) {
    console.error('Update cart item error:', error);
    showNotification('Failed to update quantity', 'error');
    return false;
  }
}

// Remove item from cart
async function removeFromCart(productId) {
  try {
    const response = await fetch(`/api/cart/${productId}`, { method: 'DELETE' });
    const result = await response.json();

    if (result.success) {
      if (typeof result.itemCount === 'number') {
        cartCount = result.itemCount;
        updateCartBadge();
      } else {
        await syncCartCount();
      }
      showNotification('Item removed from cart', 'success');
      return true;
    } else {
      showNotification(result.message || 'Failed to remove item', 'error');
      return false;
    }
  } catch (error) {
    console.error('Remove from cart error:', error);
    showNotification('Failed to remove item', 'error');
    return false;
  }
}

function addToCartFallback(title, price, button) {
  // Fallback for products without database ID - just show notification
  cartCount++;
  updateCartBadge();
  showNotification(`${title} added to cart!`, 'success');
  console.log('Added to cart (fallback):', { title, price });
  if (button) {
    animateAddToCart(button);
  }
}

function updateCartBadge() {
  const cartBadge = document.querySelector('.cart-badge');
  if (cartBadge) {
    cartBadge.textContent = cartCount;
    cartBadge.style.animation = 'none';
    setTimeout(() => {
      cartBadge.style.animation = 'pulse 0.5s ease';
    }, 10);
  }
}

async function syncCartCount() {
  // Check if user is logged in
  const userData = document.body.getAttribute('data-user');
  const isLoggedIn = userData && userData !== 'null' && userData !== '{"id":null}';
  
  if (!isLoggedIn) {
    // Guest user - load from localStorage
    const guestCart = JSON.parse(localStorage.getItem('guestCart') || '[]');
    cartCount = guestCart.reduce((sum, item) => sum + (item.quantity || 0), 0);
    updateCartBadge();
    return;
  }
  
  try {
    const response = await fetch('/api/cart');
    const result = await response.json();
    if (result.success) {
      cartCount = typeof result.itemCount === 'number' ? result.itemCount : (result.cart?.reduce((sum, it) => sum + (it.quantity || 0), 0) || 0);
      updateCartBadge();
    }
  } catch (error) {
    console.error('Failed to sync cart count:', error);
  }
}

async function syncWishlistCount() {
  const wishlistBadge = document.querySelector('.wishlist-badge');
  if (!wishlistBadge) return;
  
  try {
    const response = await fetch('/api/wishlist/count');
    const result = await response.json();
    if (result.success && result.count > 0) {
      wishlistBadge.textContent = result.count;
      wishlistBadge.style.display = 'inline-block';
    } else {
      wishlistBadge.style.display = 'none';
    }
  } catch (error) {
    console.error('Failed to sync wishlist count:', error);
  }
}

async function toggleWishlist(productId, button) {
  // Check if user is logged in
  const userData = document.body.getAttribute('data-user');
  if (!userData || userData === 'null' || userData === '{"id":null}') {
    showNotification('Please login to save items to your wishlist', 'warning');
    setTimeout(() => {
      window.location.href = '/login';
    }, 1500);
    return;
  }

  try {
    const response = await fetch('/api/wishlist', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ productId })
    });

    const result = await response.json();

    if (result.success) {
      // Toggle heart icon
      const icon = button.querySelector('i');
      if (icon.classList.contains('far')) {
        icon.classList.remove('far');
        icon.classList.add('fas');
        icon.style.color = '#ff6b35';
        showNotification('Added to wishlist!', 'success');
      } else {
        icon.classList.remove('fas');
        icon.classList.add('far');
        icon.style.color = '';
        showNotification('Removed from wishlist', 'info');
      }
      // Update wishlist count
      syncWishlistCount();
    } else {
      showNotification(result.message || 'Failed to update wishlist', 'error');
    }
  } catch (error) {
    console.error('Error updating wishlist:', error);
    showNotification('Error updating wishlist', 'error');
  }
}

function animateAddToCart(button) {
  const originalText = button.innerHTML;
  button.innerHTML = '<i class="fas fa-check"></i> Added!';
  button.style.backgroundColor = '#28a745';

  setTimeout(() => {
    button.innerHTML = originalText;
    button.style.backgroundColor = '';
  }, 2000);
}

// ========== PRODUCT CARDS ==========
function initializeProductCards() {
  const quickViewBtns = document.querySelectorAll('.quick-view-btn');

  quickViewBtns.forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      const productCard = this.closest('.product-card');
      const productTitle = productCard.querySelector('.product-title').textContent;
      showNotification(`Quick view: ${productTitle}`, 'info');
      // Add your quick view modal logic here
    });
  });

  // Product card click
  const productCards = document.querySelectorAll('.product-card');
  productCards.forEach(card => {
    card.addEventListener('click', function() {
      const productTitle = this.querySelector('.product-title').textContent;
      console.log('Product clicked:', productTitle);
      // Add your product detail page navigation here
    });
  });
}

// ========== SEARCH FUNCTIONALITY ==========
function initializeSearch() {
  const searchBtn = document.getElementById('searchBtn');
  const searchInput = document.getElementById('globalSearch');

  if (searchBtn && searchInput) {
    searchBtn.addEventListener('click', performSearch);

    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        performSearch();
      }
    });

    // Search suggestions (optional)
    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.trim();
      if (query.length > 2) {
        // Add your search suggestions logic here
        console.log('Searching for:', query);
      }
    });
  }
}

function performSearch() {
  const searchInput = document.getElementById('globalSearch');
  const searchCategory = document.querySelector('.search-category');
  
  if (searchInput) {
    const query = searchInput.value.trim();
    const category = searchCategory ? searchCategory.value : 'all';

    if (query) {
      console.log('Search:', { query, category });
      showNotification(`Searching for "${query}" in ${category}...`, 'info');
      // Add your search logic here
    } else {
      showNotification('Please enter a search term', 'warning');
    }
  }
}

// ========== SCROLL TO TOP ==========
function initializeScrollToTop() {
  const scrollBtn = document.getElementById('scrollToTop');

  if (scrollBtn) {
    // Show/hide button based on scroll position
    window.addEventListener('scroll', () => {
      if (window.pageYOffset > 300) {
        scrollBtn.classList.add('visible');
      } else {
        scrollBtn.classList.remove('visible');
      }
    });

    // Scroll to top on click
    scrollBtn.addEventListener('click', () => {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    });
  }
}

// ========== PROMOTIONAL COUNTDOWN ==========
function initializeCountdown() {
  const countdownElements = document.querySelectorAll('.countdown');

  countdownElements.forEach(countdown => {
    // Set target date (24 hours from now)
    const targetDate = new Date();
    targetDate.setHours(targetDate.getHours() + 24);

    updateCountdown(countdown, targetDate);

    // Update every second
    setInterval(() => {
      updateCountdown(countdown, targetDate);
    }, 1000);
  });
}

function updateCountdown(element, targetDate) {
  const now = new Date().getTime();
  const distance = targetDate - now;

  if (distance < 0) {
    element.innerHTML = '<p>Deal Ended!</p>';
    return;
  }

  const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((distance % (1000 * 60)) / 1000);

  const hoursEl = element.querySelector('.countdown-item:nth-child(1) .countdown-value');
  const minutesEl = element.querySelector('.countdown-item:nth-child(2) .countdown-value');
  const secondsEl = element.querySelector('.countdown-item:nth-child(3) .countdown-value');

  if (hoursEl) hoursEl.textContent = String(hours).padStart(2, '0');
  if (minutesEl) minutesEl.textContent = String(minutes).padStart(2, '0');
  if (secondsEl) secondsEl.textContent = String(seconds).padStart(2, '0');
}

// Initialize countdown
setTimeout(initializeCountdown, 100);

// ========== NOTIFICATION SYSTEM ==========
function showNotification(message, type = 'info') {
  // Remove existing notifications
  const existingNotification = document.querySelector('.custom-notification');
  if (existingNotification) {
    existingNotification.remove();
  }

  // Create notification element
  const notification = document.createElement('div');
  notification.className = `custom-notification ${type}`;
  
  // Icon based on type
  let icon = 'fa-info-circle';
  if (type === 'success') icon = 'fa-check-circle';
  if (type === 'warning') icon = 'fa-exclamation-triangle';
  if (type === 'error') icon = 'fa-times-circle';

  notification.innerHTML = `
    <i class="fas ${icon}"></i>
    <span>${message}</span>
  `;

  // Add to body
  document.body.appendChild(notification);

  // Show notification
  setTimeout(() => {
    notification.classList.add('show');
  }, 10);

  // Remove after 3 seconds
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => {
      notification.remove();
    }, 300);
  }, 3000);
}

// Add notification styles dynamically
const notificationStyles = document.createElement('style');
notificationStyles.textContent = `
  .custom-notification {
    position: fixed;
    top: 100px;
    right: 20px;
    background-color: #fff;
    padding: 15px 25px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    display: flex;
    align-items: center;
    gap: 12px;
    z-index: 10000;
    transform: translateX(400px);
    transition: transform 0.3s ease;
    min-width: 250px;
  }

  .custom-notification.show {
    transform: translateX(0);
  }

  .custom-notification i {
    font-size: 1.5rem;
  }

  .custom-notification.success {
    border-left: 4px solid #28a745;
  }

  .custom-notification.success i {
    color: #28a745;
  }

  .custom-notification.error {
    border-left: 4px solid #dc3545;
  }

  .custom-notification.error i {
    color: #dc3545;
  }

  .custom-notification.warning {
    border-left: 4px solid #ffc107;
  }

  .custom-notification.warning i {
    color: #ffc107;
  }

  .custom-notification.info {
    border-left: 4px solid #17a2b8;
  }

  .custom-notification.info i {
    color: #17a2b8;
  }

  .custom-notification span {
    font-weight: 500;
    color: #333;
  }

  @media (max-width: 768px) {
    .custom-notification {
      right: 10px;
      left: 10px;
      min-width: auto;
    }
  }
`;
document.head.appendChild(notificationStyles);

// ========== SMOOTH SCROLL FOR ANCHOR LINKS ==========
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function(e) {
    const href = this.getAttribute('href');
    if (href !== '#' && href !== '') {
      e.preventDefault();
      const target = document.querySelector(href);
      if (target) {
        const headerOffset = 100;
        const elementPosition = target.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
      }
    }
  });
});

// ========== LAZY LOADING IMAGES ==========
if ('IntersectionObserver' in window) {
  const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        if (img.dataset.src) {
          img.src = img.dataset.src;
          img.removeAttribute('data-src');
          observer.unobserve(img);
        }
      }
    });
  });

  document.querySelectorAll('img[data-src]').forEach(img => {
    imageObserver.observe(img);
  });
}

// ========== NEWSLETTER FORM ==========
const newsletterForm = document.querySelector('.newsletter-form');
if (newsletterForm) {
  newsletterForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const emailInput = this.querySelector('input[type="email"]');
    const email = emailInput.value.trim();

    if (email) {
      showNotification('Thank you for subscribing!', 'success');
      emailInput.value = '';
      console.log('Newsletter subscription:', email);
      // Add your newsletter subscription logic here
    }
  });
}

// ========== VIEW ALL BUTTONS ==========
const viewAllBtns = document.querySelectorAll('.view-all-btn, .view-all-categories');
viewAllBtns.forEach(btn => {
  btn.addEventListener('click', function(e) {
    e.preventDefault();
    showNotification('Loading more products...', 'info');
    // Add your load more logic here
  });
});

// ========== PROMO BUTTONS ==========
const promoBtns = document.querySelectorAll('.promo-btn, .promo-btn-small');
promoBtns.forEach(btn => {
  btn.addEventListener('click', function() {
    const promoCard = this.closest('.promo-card');
    const promoTitle = promoCard.querySelector('h2, h3').textContent;
    showNotification(`Viewing ${promoTitle}`, 'info');
    // Add your promo navigation logic here
  });
});

// ========== ADD TO CART FOR INDIVIDUAL PRODUCTS ==========
function addToCart(productId) {
    const productCard = document.querySelector(`[data-product-id="${productId}"]`) || document.querySelectorAll('.product-card')[0];
    if (productCard) {
        const productTitle = productCard.querySelector('.product-title')?.textContent || 'Product';
        const productPrice = productCard.querySelector('.product-price')?.textContent || 'Tsh 0';
        addToCart(productTitle, productPrice);
    } else {
        addToCart('Product added to cart', 'N/A');
    }
}

// Initialize category page buttons
function initializeCategoryButtons() {
  // Deprecated fallback; global initializeCart now handles .add-to-cart-btn clicks
}

// ========== CATEGORY EXPLORE FUNCTIONALITY ==========
function exploreCategory(categoryName) {
  // Convert category name to URL-friendly format
  const categorySlug = categoryName.toLowerCase().replace(/\s+/g, '-');
  
  // Navigate to category page
  window.location.href = `/category/${categorySlug}`;
}

// ========== LOGOUT FUNCTIONALITY ==========
async function logout() {
  try {
    showNotification('Logging out...', 'info');
    
    const response = await fetch('/api/auth/logout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    if (data.success) {
      showNotification('Logged out successfully!', 'success');
      
      setTimeout(() => {
        window.location.href = '/login';
      }, 1000);
    } else {
      showNotification('Logout failed. Please try again.', 'error');
    }
  } catch (error) {
    console.error('Logout error:', error);
    showNotification('An error occurred during logout.', 'error');
  }
}

// ========== CATEGORY EXPLORE BUTTONS ==========
const categoryBtns = document.querySelectorAll('.category-btn');
categoryBtns.forEach(btn => {
  btn.addEventListener('click', function(e) {
    e.stopPropagation();
    const categoryCard = this.closest('.category-card');
    const categoryName = categoryCard.querySelector('h3').textContent;
    exploreCategory(categoryName);
  });
});

// ========== GLOBAL SEARCH FUNCTIONALITY ==========
function initializeGlobalSearch() {
  // Get all search inputs and buttons across pages
  const searchInputs = document.querySelectorAll('#globalSearch, #searchInput');
  const searchButtons = document.querySelectorAll('#searchBtn, .search-btn');

  // Add event listeners to all search inputs
  searchInputs.forEach(input => {
    input.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        performGlobalSearch(this.value.trim());
      }
    });
  });

  // Add event listeners to all search buttons
  searchButtons.forEach(button => {
    button.addEventListener('click', function() {
      const searchInput = this.closest('.search-bar, .search-wrapper')?.querySelector('input');
      if (searchInput) {
        performGlobalSearch(searchInput.value.trim());
      }
    });
  });
}

// Perform global search
function performGlobalSearch(searchTerm) {
  if (!searchTerm) {
    showNotification('Please enter a search term', 'warning');
    return;
  }

  // Show loading notification
  showNotification('Searching for products...', 'info');

  // Redirect to search results page
  window.location.href = `/search?q=${encodeURIComponent(searchTerm)}`;
}

// Add to DOM content loaded
document.addEventListener('DOMContentLoaded', function() {
  // ... existing code ...
  initializeGlobalSearch();
  initializeCategoryButtons();
  initializeCtaButtons();
  initializeCategoryMenuButton();
});

// ========== PERFORMANCE OPTIMIZATION ==========
// Debounce function for scroll events
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

// ========== CTA BUTTONS ==========
function initializeCtaButtons() {
  const ctaButtons = document.querySelectorAll('.cta-button');
  
  ctaButtons.forEach(btn => {
    btn.addEventListener('click', function() {
      const btnText = this.textContent.trim().toLowerCase();
      
      if (btnText.includes('shop') || btnText.includes('deals')) {
        // Go to deals or products page
        window.location.href = '/products';
      } else if (btnText.includes('explore')) {
        // Go to categories or products
        window.location.href = '/categories';
      }
    });
  });
}

// ========== CATEGORY MENU BUTTON ==========
function initializeCategoryMenuButton() {
  const categoryMenuBtn = document.querySelector('.category-menu-btn');
  const categoryDropdown = document.querySelector('.category-dropdown');
  
  if (categoryMenuBtn && categoryDropdown) {
    categoryMenuBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      categoryDropdown.classList.toggle('show');
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', function(e) {
      if (!categoryMenuBtn.contains(e.target) && !categoryDropdown.contains(e.target)) {
        categoryDropdown.classList.remove('show');
      }
    });
  }
}

// ========== QUICK VIEW MODAL ==========
function initializeQuickView() {
  const quickViewBtns = document.querySelectorAll('.quick-view-btn');
  
  quickViewBtns.forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      const productCard = this.closest('.product-card');
      const productTitle = productCard?.querySelector('.product-title')?.textContent || 'Product';
      const productPrice = productCard?.querySelector('.price-current')?.textContent || 'Tsh 0';
      const productImage = productCard?.querySelector('.product-image img')?.src || '';
      
      // Show quick view modal
      showQuickViewModal(productTitle, productPrice, productImage);
    });
  });
}

function showQuickViewModal(title, price, image) {
  // Create modal if it doesn't exist
  let modal = document.getElementById('quickViewModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'quickViewModal';
    modal.className = 'quick-view-modal';
    modal.innerHTML = `
      <div class="modal-content">
        <button class="modal-close">&times;</button>
        <div class="modal-body">
          <img src="${image}" alt="${title}" class="modal-product-image">
          <div class="modal-product-info">
            <h3>${title}</h3>
            <p class="modal-price">${price}</p>
            <button class="add-to-cart-btn">Add to Cart</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    
    // Add styles
    const styles = document.createElement('style');
    styles.textContent = `
      .quick-view-modal {
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        z-index: 10000;
        justify-content: center;
        align-items: center;
      }
      .quick-view-modal.show {
        display: flex;
      }
      .modal-content {
        background: white;
        padding: 20px;
        border-radius: 8px;
        max-width: 500px;
        width: 90%;
        position: relative;
      }
      .modal-close {
        position: absolute;
        top: 10px;
        right: 10px;
        font-size: 24px;
        border: none;
        background: none;
        cursor: pointer;
      }
      .modal-body {
        display: flex;
        gap: 20px;
      }
      .modal-product-image {
        width: 150px;
        height: 150px;
        object-fit: cover;
      }
      @media (max-width: 500px) {
        .modal-body {
          flex-direction: column;
          align-items: center;
        }
      }
    `;
    document.head.appendChild(styles);
    
    // Close modal handler
    modal.querySelector('.modal-close').addEventListener('click', () => {
      modal.classList.remove('show');
    });
    
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('show');
      }
    });
  }
  
  // Update modal content
  modal.querySelector('.modal-product-image').src = image;
  modal.querySelector('.modal-product-image').alt = title;
  modal.querySelector('h3').textContent = title;
  modal.querySelector('.modal-price').textContent = price;
  
  // Show modal
  modal.classList.add('show');
}

// ========== EXIT-INTENT POPUP ==========
let exitIntentShown = false;
let exitIntentSubscribed = false;

function initializeExitIntent() {
  // Don't show on cart, checkout, login, signup pages
  const path = window.location.pathname;
  if (path.includes('/cart') || path.includes('/checkout') || path.includes('/login') || path.includes('/signup')) {
    return;
  }

  // Check if already subscribed
  const email = localStorage.getItem('exitPopupSubscribed');
  if (email === 'true') {
    exitIntentSubscribed = true;
    return;
  }

  // Exit intent detection
  document.addEventListener('mouseout', function(e) {
    if (!e.toElement && !e.relatedTarget && !exitIntentShown && !exitIntentSubscribed) {
      // Mouse left the viewport
      exitIntentShown = true;
      setTimeout(showExitIntentPopup, 100);
    }
  });

  // Also detect when user is about to close tab (key combination)
  document.addEventListener('keydown', function(e) {
    if (e.key === 'F4' || (e.ctrlKey && e.key === 'w') || (e.metaKey && e.key === 'w')) {
      if (!exitIntentShown && !exitIntentSubscribed) {
        exitIntentShown = true;
        showExitIntentPopup();
      }
    }
  });
}

function showExitIntentPopup() {
  if (exitIntentSubscribed) return;

  const popup = document.createElement('div');
  popup.className = 'exit-intent-popup';
  popup.id = 'exitIntentPopup';
  popup.innerHTML = `
    <div class="exit-popup-overlay" onclick="closeExitIntentPopup()"></div>
    <div class="exit-popup-content">
      <button class="exit-popup-close" onclick="closeExitIntentPopup()">
        <i class="fas fa-times"></i>
      </button>
      <div class="exit-popup-header">
        <i class="fas fa-gift"></i>
      </div>
      <h2>Wait! Don't Leave Yet!</h2>
      <p>Get <strong>10% OFF</strong> your first order when you subscribe to our newsletter.</p>
      <p class="exit-popup-subtitle">Plus, get free shipping on your first purchase!</p>
      <form class="exit-popup-form" onsubmit="submitExitIntentEmail(event)">
        <input type="email" id="exitPopupEmail" placeholder="Enter your email address" required>
        <button type="submit">
          <i class="fas fa-envelope"></i> Get My 10% OFF
        </button>
      </form>
      <p class="exit-popup-note">We respect your privacy. Unsubscribe anytime.</p>
      <button class="exit-popup-skip" onclick="closeExitIntentPopup()">
        No thanks, I'd rather pay full price
      </button>
    </div>
  `;

  // Add styles
  const styles = document.createElement('style');
  styles.textContent = `
    .exit-intent-popup {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      visibility: hidden;
      transition: all 0.3s ease;
    }
    .exit-intent-popup.show {
      opacity: 1;
      visibility: visible;
    }
    .exit-popup-overlay {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(5px);
    }
    .exit-popup-content {
      position: relative;
      background: white;
      padding: 50px 40px;
      border-radius: 20px;
      text-align: center;
      max-width: 450px;
      width: 90%;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      transform: scale(0.8);
      transition: transform 0.3s ease;
    }
    .exit-intent-popup.show .exit-popup-content {
      transform: scale(1);
    }
    .exit-popup-close {
      position: absolute;
      top: 15px;
      right: 15px;
      background: none;
      border: none;
      font-size: 24px;
      color: #999;
      cursor: pointer;
      transition: color 0.3s ease;
    }
    .exit-popup-close:hover {
      color: #ff6b35;
    }
    .exit-popup-header {
      width: 80px;
      height: 80px;
      background: linear-gradient(135deg, #ff6b35, #f77f00);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 20px;
    }
    .exit-popup-header i {
      font-size: 36px;
      color: white;
    }
    .exit-popup-content h2 {
      color: #004e89;
      font-size: 1.8rem;
      margin-bottom: 15px;
    }
    .exit-popup-content p {
      color: #666;
      font-size: 1rem;
      line-height: 1.6;
      margin-bottom: 15px;
    }
    .exit-popup-subtitle {
      color: #28a745 !important;
      font-weight: 500;
    }
    .exit-popup-form {
      display: flex;
      gap: 10px;
      margin: 25px 0;
    }
    .exit-popup-form input {
      flex: 1;
      padding: 15px 20px;
      border: 2px solid #e0e0e0;
      border-radius: 10px;
      font-size: 1rem;
      transition: border-color 0.3s ease;
    }
    .exit-popup-form input:focus {
      outline: none;
      border-color: #ff6b35;
    }
    .exit-popup-form button {
      padding: 15px 25px;
      background: linear-gradient(135deg, #ff6b35, #f77f00);
      color: white;
      border: none;
      border-radius: 10px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.3s ease, box-shadow 0.3s ease;
      white-space: nowrap;
    }
    .exit-popup-form button:hover {
      transform: translateY(-2px);
      box-shadow: 0 5px 20px rgba(255, 107, 53, 0.4);
    }
    .exit-popup-note {
      font-size: 0.85rem !important;
      color: #999 !important;
      margin-bottom: 20px !important;
    }
    .exit-popup-skip {
      background: none;
      border: none;
      color: #999;
      font-size: 0.9rem;
      cursor: pointer;
      text-decoration: underline;
      transition: color 0.3s ease;
    }
    .exit-popup-skip:hover {
      color: #ff6b35;
    }
    @media (max-width: 480px) {
      .exit-popup-form {
        flex-direction: column;
      }
      .exit-popup-content {
        padding: 40px 25px;
      }
    }
  `;
  document.head.appendChild(styles);
  document.body.appendChild(popup);

  // Show popup with animation
  setTimeout(() => {
    popup.classList.add('show');
  }, 100);
}

function closeExitIntentPopup() {
  const popup = document.getElementById('exitIntentPopup');
  if (popup) {
    popup.classList.remove('show');
    setTimeout(() => {
      popup.remove();
    }, 300);
  }
}

async function submitExitIntentEmail(event) {
  event.preventDefault();

  const email = document.getElementById('exitPopupEmail').value;

  try {
    const response = await fetch('/api/newsletter/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, coupon: 'WELCOME10' })
    });

    const result = await response.json();

    if (result.success) {
      // Store subscription status
      localStorage.setItem('exitPopupSubscribed', 'true');
      exitIntentSubscribed = true;

      // Show success
      showNotification('🎉 10% discount code: ' + result.couponCode, 'success');

      // Close popup
      closeExitIntentPopup();
    } else {
      showNotification(result.message || 'Failed to subscribe', 'error');
    }
  } catch (error) {
    console.error('Subscribe error:', error);
    showNotification('Error subscribing. Please try again.', 'error');
  }
}

// Initialize exit intent on page load
document.addEventListener('DOMContentLoaded', initializeExitIntent);

// ========== CONSOLE WELCOME MESSAGE ==========
console.log('%c🛍️ Welcome to OMUNJU SHOPPERS! ', 'background: #ff6b35; color: white; font-size: 20px; padding: 10px; border-radius: 5px;');
console.log('%cYour Premier E-Commerce Destination', 'color: #004e89; font-size: 14px; font-weight: bold;');
