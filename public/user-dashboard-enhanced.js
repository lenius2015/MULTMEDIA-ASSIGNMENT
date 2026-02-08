/**
 * Enhanced User Dashboard JavaScript
 * Full functionality with database connections and CRUD operations
 */

// Utility Functions
const UserUtils = {
    showToast: function(message, type = 'info', duration = 3000) {
        const container = document.getElementById('toast-container') || this.createToastContainer();
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icons = {
            success: 'check-circle',
            error: 'exclamation-circle',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        };
        
        toast.innerHTML = `<i class="fas fa-${icons[type] || icons.info}"></i><span>${message}</span>`;
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    },
    
    createToastContainer: function() {
        const container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
        return container;
    },
    
    apiRequest: async function(url, options = {}) {
        try {
            const response = await fetch(url, {
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    ...options.headers
                },
                ...options
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'Request failed');
            }
            
            return data;
        } catch (error) {
            console.error('API Request Error:', error);
            this.showToast(error.message, 'error');
            throw error;
        }
    },
    
    formatCurrency: function(amount) {
        return '$' + parseFloat(amount || 0).toFixed(2);
    },
    
    formatDate: function(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    },
    
    debounce: function(func, wait) {
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
};

// Navigation Module
function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('.section');
    const sidebarToggle = document.querySelector('.sidebar-toggle');
    
    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const sectionId = this.dataset.section;
            
            // Update nav
            navItems.forEach(nav => nav.classList.remove('active'));
            this.classList.add('active');
            
            // Update section
            sections.forEach(section => {
                section.classList.remove('active');
                if (section.id === sectionId) {
                    section.classList.add('active');
                }
            });
            
            // Update URL hash
            window.location.hash = sectionId;
        });
    });
    
    // Handle initial hash
    if (window.location.hash) {
        const hash = window.location.hash.substring(1);
        const navItem = document.querySelector(`.nav-item[data-section="${hash}"]`);
        if (navItem) {
            navItem.click();
        }
    }
    
    // Mobile sidebar toggle
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', function() {
            document.querySelector('.user-sidebar').classList.toggle('active');
        });
    }
}

// Forms Module
function initForms() {
    // Profile form
    const profileForm = document.getElementById('profileForm');
    if (profileForm) {
        profileForm.addEventListener('submit', updateProfile);
    }
    
    // Password form
    const passwordForm = document.getElementById('passwordForm');
    if (passwordForm) {
        passwordForm.addEventListener('submit', changePassword);
    }
    
    // Address form
    const addressForm = document.getElementById('addressForm');
    if (addressForm) {
        addressForm.addEventListener('submit', saveAddress);
    }
    
    // Compose message form
    const composeForm = document.getElementById('composeForm');
    if (composeForm) {
        composeForm.addEventListener('submit', sendMessage);
    }
    
    // Notification preferences
    const notificationInputs = document.querySelectorAll('.setting-item input[type="checkbox"]');
    notificationInputs.forEach(input => {
        input.addEventListener('change', saveNotificationPreferences);
    });
}

// Profile Functions
async function updateProfile(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    
    try {
        const result = await UserUtils.apiRequest('/api/user/profile', {
            method: 'PUT',
            body: JSON.stringify(data)
        });
        
        UserUtils.showToast(result.message, 'success');
        
        // Update displayed name
        const userNameElements = document.querySelectorAll('.user-info h4, .section-header h1');
        userNameElements.forEach(el => {
            if (el.textContent.includes('Welcome back')) {
                el.textContent = `Welcome back, ${data.name}! 👋`;
            } else {
                el.textContent = data.name;
            }
        });
        
        // Update session data
        if (window.sessionData) {
            window.sessionData.userName = data.name;
        }
    } catch (error) {
        console.error('Profile update error:', error);
    }
}

function resetProfileForm() {
    const form = document.getElementById('profileForm');
    if (form) {
        form.reset();
    }
}

function previewProfilePicture(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const preview = document.getElementById('profilePreview');
            if (preview.tagName === 'IMG') {
                preview.src = e.target.result;
            } else {
                preview.innerHTML = '';
                preview.style.backgroundImage = `url(${e.target.result})`;
                preview.style.backgroundSize = 'cover';
                preview.style.backgroundPosition = 'center';
            }
        };
        reader.readAsDataURL(file);
    }
}

async function removeProfilePicture() {
    try {
        const result = await UserUtils.apiRequest('/api/user/profile-picture', {
            method: 'DELETE'
        });
        
        UserUtils.showToast(result.message, 'success');
        
        // Reset preview
        const preview = document.getElementById('profilePreview');
        if (preview.tagName === 'IMG') {
            preview.src = '';
        } else {
            preview.innerHTML = preview.textContent.charAt(0).toUpperCase();
            preview.style.backgroundImage = 'none';
        }
    } catch (error) {
        console.error('Remove profile picture error:', error);
    }
}

// Password Functions
async function changePassword(event) {
    event.preventDefault();
    const form = event.target;
    const data = {
        currentPassword: form.currentPassword.value,
        newPassword: form.newPassword.value,
        confirmPassword: form.confirmPassword.value
    };
    
    if (data.newPassword !== data.confirmPassword) {
        UserUtils.showToast('New passwords do not match', 'error');
        return;
    }
    
    if (data.newPassword.length < 8) {
        UserUtils.showToast('Password must be at least 8 characters', 'error');
        return;
    }
    
    try {
        const result = await UserUtils.apiRequest('/api/user/change-password', {
            method: 'POST',
            body: JSON.stringify(data)
        });
        
        UserUtils.showToast(result.message, 'success');
        form.reset();
    } catch (error) {
        console.error('Password change error:', error);
    }
}

// Cart Functions
async function updateCartQuantity(productId, change) {
    try {
        const result = await UserUtils.apiRequest('/api/cart/update', {
            method: 'POST',
            body: JSON.stringify({ productId, quantity: change })
        });
        
        UserUtils.showToast(result.message, 'success');
        refreshCartData();
    } catch (error) {
        console.error('Cart update error:', error);
    }
}

async function updateCartQuantityDirect(productId, newQuantity) {
    try {
        const result = await UserUtils.apiRequest('/api/cart/update', {
            method: 'POST',
            body: JSON.stringify({ productId, quantity: parseInt(newQuantity) })
        });
        
        UserUtils.showToast(result.message, 'success');
        refreshCartData();
    } catch (error) {
        console.error('Cart update error:', error);
    }
}

async function removeFromCart(productId) {
    if (confirm('Remove this item from your cart?')) {
        try {
            const result = await UserUtils.apiRequest(`/api/cart/${productId}`, {
                method: 'DELETE'
            });
            
            UserUtils.showToast('Item removed from cart', 'success');
            refreshCartData();
        } catch (error) {
            console.error('Remove from cart error:', error);
        }
    }
}

async function clearCart() {
    if (confirm('Clear all items from your cart?')) {
        try {
            const result = await UserUtils.apiRequest('/api/cart/clear', {
                method: 'DELETE'
            });
            
            UserUtils.showToast('Cart cleared', 'success');
            refreshCartData();
        } catch (error) {
            console.error('Clear cart error:', error);
        }
    }
}

async function moveToWishlist(productId) {
    try {
        const result = await UserUtils.apiRequest('/api/wishlist/move', {
            method: 'POST',
            body: JSON.stringify({ productId })
        });
        
        UserUtils.showToast('Item moved to wishlist', 'success');
        refreshCartData();
    } catch (error) {
        console.error('Move to wishlist error:', error);
    }
}

// Wishlist Functions
async function toggleWishlist(productId) {
    try {
        const result = await UserUtils.apiRequest('/api/wishlist/toggle', {
            method: 'POST',
            body: JSON.stringify({ productId })
        });
        
        UserUtils.showToast(result.message, result.isAdded ? 'success' : 'info');
        refreshWishlistData();
    } catch (error) {
        console.error('Wishlist toggle error:', error);
    }
}

async function addToCart(productId) {
    try {
        const result = await UserUtils.apiRequest('/api/cart/add', {
            method: 'POST',
            body: JSON.stringify({ productId, quantity: 1 })
        });
        
        UserUtils.showToast('Added to cart', 'success');
        refreshCartData();
    } catch (error) {
        console.error('Add to cart error:', error);
    }
}

async function removeFromWishlist(productId) {
    try {
        const result = await UserUtils.apiRequest(`/api/wishlist/${productId}`, {
            method: 'DELETE'
        });
        
        UserUtils.showToast('Removed from wishlist', 'success');
        refreshWishlistData();
    } catch (error) {
        console.error('Remove from wishlist error:', error);
    }
}

// Order Functions
function filterOrders() {
    const filter = document.getElementById('orderFilter').value;
    const rows = document.querySelectorAll('.order-row');
    
    rows.forEach(row => {
        if (filter === 'all' || row.dataset.status === filter) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

async function cancelOrder(orderId) {
    if (confirm('Are you sure you want to cancel this order?')) {
        try {
            const result = await UserUtils.apiRequest(`/api/orders/${orderId}/cancel`, {
                method: 'PUT'
            });
            
            UserUtils.showToast(result.message, 'success');
            refreshOrdersData();
        } catch (error) {
            console.error('Cancel order error:', error);
        }
    }
}

async function buyAgain(orderId) {
    try {
        const result = await UserUtils.apiRequest(`/api/orders/${orderId}/buy-again`, {
            method: 'POST'
        });
        
        UserUtils.showToast('Items added to cart', 'success');
        refreshCartData();
    } catch (error) {
        console.error('Buy again error:', error);
    }
}

async function writeReview(orderId) {
    // Implement review writing functionality
    UserUtils.showToast('Review feature coming soon', 'info');
}

async function requestRefund(orderId) {
    if (confirm('Request a refund for this order?')) {
        try {
            const result = await UserUtils.apiRequest(`/api/orders/${orderId}/refund`, {
                method: 'POST'
            });
            
            UserUtils.showToast(result.message, 'success');
            refreshOrdersData();
        } catch (error) {
            console.error('Refund request error:', error);
        }
    }
}

// Messages Functions
function showComposeModal() {
    document.getElementById('compose-modal').classList.add('active');
}

function hideComposeModal() {
    document.getElementById('compose-modal').classList.remove('active');
    document.getElementById('composeForm').reset();
}

async function sendMessage(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    
    try {
        const result = await UserUtils.apiRequest('/api/inbox/send', {
            method: 'POST',
            body: JSON.stringify(data)
        });
        
        UserUtils.showToast(result.message, 'success');
        hideComposeModal();
        form.reset();
        refreshConversationsData();
    } catch (error) {
        console.error('Send message error:', error);
    }
}

function openConversation(conversationId) {
    window.location.href = `/inbox?conversation=${conversationId}`;
}

// Address Functions
function showAddressModal(addressId = null) {
    const modal = document.getElementById('address-modal');
    const title = document.getElementById('addressModalTitle');
    const form = document.getElementById('addressForm');
    const addressIdInput = document.getElementById('addressId');
    
    if (addressId) {
        title.textContent = 'Edit Address';
        addressIdInput.value = addressId;
        loadAddressData(addressId);
    } else {
        title.textContent = 'Add Address';
        addressIdInput.value = '';
        form.reset();
    }
    
    modal.classList.add('active');
}

function hideAddressModal() {
    document.getElementById('address-modal').classList.remove('active');
}

async function loadAddressData(addressId) {
    try {
        const result = await UserUtils.apiRequest(`/api/user/addresses/${addressId}`);
        const form = document.getElementById('addressForm');
        const data = result.address;
        
        form.full_name.value = data.full_name;
        form.phone.value = data.phone;
        form.alternate_phone.value = data.alternate_phone || '';
        form.address_line1.value = data.address_line1;
        form.address_line2.value = data.address_line2 || '';
        form.city.value = data.city;
        form.state.value = data.state || '';
        form.postal_code.value = data.postal_code;
        form.country.value = data.country || 'Kenya';
        form.delivery_instructions.value = data.delivery_instructions || '';
        form.is_default.checked = data.is_default;
        form.label.value = data.label || 'home';
    } catch (error) {
        console.error('Load address error:', error);
    }
}

async function saveAddress(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    const addressId = data.addressId || null;
    
    try {
        const method = addressId ? 'PUT' : 'POST';
        const url = addressId ? `/api/user/addresses/${addressId}` : '/api/user/addresses';
        
        const result = await UserUtils.apiRequest(url, {
            method: method,
            body: JSON.stringify(data)
        });
        
        UserUtils.showToast(result.message, 'success');
        hideAddressModal();
        refreshAddressesData();
    } catch (error) {
        console.error('Save address error:', error);
    }
}

async function editAddress(addressId) {
    showAddressModal(addressId);
}

async function setDefaultAddress(addressId) {
    try {
        const result = await UserUtils.apiRequest(`/api/user/addresses/${addressId}/default`, {
            method: 'PUT'
        });
        
        UserUtils.showToast(result.message, 'success');
        refreshAddressesData();
    } catch (error) {
        console.error('Set default address error:', error);
    }
}

async function deleteAddress(addressId) {
    if (confirm('Delete this address?')) {
        try {
            const result = await UserUtils.apiRequest(`/api/user/addresses/${addressId}`, {
                method: 'DELETE'
            });
            
            UserUtils.showToast(result.message, 'success');
            refreshAddressesData();
        } catch (error) {
            console.error('Delete address error:', error);
        }
    }
}

// Notifications Functions
async function saveNotificationPreferences() {
    const preferences = {};
    const inputs = document.querySelectorAll('.setting-item input[type="checkbox"]');
    
    inputs.forEach(input => {
        preferences[input.id] = input.checked;
    });
    
    try {
        const result = await UserUtils.apiRequest('/api/user/notifications/preferences', {
            method: 'PUT',
            body: JSON.stringify(preferences)
        });
        
        UserUtils.showToast(result.message, 'success');
    } catch (error) {
        console.error('Save preferences error:', error);
    }
}

async function markAllNotificationsAsRead() {
    try {
        const result = await UserUtils.apiRequest('/api/user/notifications/mark-all-read', {
            method: 'PUT'
        });
        
        UserUtils.showToast(result.message, 'success');
        refreshNotificationsData();
    } catch (error) {
        console.error('Mark all read error:', error);
    }
}

async function markNotificationAsRead(notificationId) {
    try {
        const result = await UserUtils.apiRequest(`/api/user/notifications/${notificationId}/read`, {
            method: 'PUT'
        });
        
        UserUtils.showToast(result.message, 'success');
        refreshNotificationsData();
    } catch (error) {
        console.error('Mark read error:', error);
    }
}

async function deleteNotification(notificationId) {
    if (confirm('Delete this notification?')) {
        try {
            const result = await UserUtils.apiRequest(`/api/user/notifications/${notificationId}`, {
                method: 'DELETE'
            });
            
            UserUtils.showToast(result.message, 'success');
            refreshNotificationsData();
        } catch (error) {
            console.error('Delete notification error:', error);
        }
    }
}

// Reviews Functions
async function editReview(reviewId) {
    // Implement review editing
    UserUtils.showToast('Review editing coming soon', 'info');
}

async function deleteReview(reviewId) {
    if (confirm('Delete this review?')) {
        try {
            const result = await UserUtils.apiRequest(`/api/user/reviews/${reviewId}`, {
                method: 'DELETE'
            });
            
            UserUtils.showToast(result.message, 'success');
            refreshReviewsData();
        } catch (error) {
            console.error('Delete review error:', error);
        }
    }
}

// Real-time Updates
function initRealTimeUpdates() {
    // Refresh data periodically
    const refreshInterval = setInterval(() => {
        refreshCartData();
        refreshWishlistData();
        refreshNotificationsData();
    }, 30000); // Every 30 seconds
    
    // Listen for visibility change to refresh when tab becomes active
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            refreshCartData();
            refreshWishlistData();
            refreshNotificationsData();
        }
    });
}

// Data Refresh Functions
async function refreshCartData() {
    try {
        const result = await UserUtils.apiRequest('/api/user/cart');
        updateCartUI(result);
    } catch (error) {
        console.error('Refresh cart error:', error);
    }
}

async function refreshWishlistData() {
    try {
        const result = await UserUtils.apiRequest('/api/user/wishlist');
        updateWishlistUI(result);
    } catch (error) {
        console.error('Refresh wishlist error:', error);
    }
}

async function refreshOrdersData() {
    try {
        const result = await UserUtils.apiRequest('/api/user/orders');
        updateOrdersUI(result);
    } catch (error) {
        console.error('Refresh orders error:', error);
    }
}

async function refreshAddressesData() {
    try {
        const result = await UserUtils.apiRequest('/api/user/addresses');
        updateAddressesUI(result);
    } catch (error) {
        console.error('Refresh addresses error:', error);
    }
}

async function refreshConversationsData() {
    try {
        const result = await UserUtils.apiRequest('/api/user/conversations');
        updateConversationsUI(result);
    } catch (error) {
        console.error('Refresh conversations error:', error);
    }
}

async function refreshNotificationsData() {
    try {
        const result = await UserUtils.apiRequest('/api/user/notifications');
        updateNotificationsUI(result);
    } catch (error) {
        console.error('Refresh notifications error:', error);
    }
}

async function refreshReviewsData() {
    try {
        const result = await UserUtils.apiRequest('/api/user/reviews');
        updateReviewsUI(result);
    } catch (error) {
        console.error('Refresh reviews error:', error);
    }
}

// UI Update Functions
function updateCartUI(data) {
    // Update cart count in navbar
    const cartBadge = document.querySelector('.nav-item[data-section="cart"] .nav-badge');
    if (cartBadge) {
        cartBadge.textContent = data.count || 0;
    }
    
    // Update cart items in cart section if visible
    const cartSection = document.getElementById('cart');
    if (cartSection.classList.contains('active')) {
        location.reload(); // Simple refresh for now
    }
}

function updateWishlistUI(data) {
    // Update wishlist count in navbar
    const wishlistBadge = document.querySelector('.nav-item[data-section="wishlist"] .nav-badge');
    if (wishlistBadge) {
        wishlistBadge.textContent = data.count || 0;
    }
}

function updateOrdersUI(data) {
    // Update order stats in overview
    const orderStats = document.querySelectorAll('.stat-content h3');
    if (orderStats.length >= 2) {
        orderStats[0].textContent = data.total || 0;
        orderStats[1].textContent = data.pending || 0;
    }
}

function updateAddressesUI(data) {
    // Refresh addresses section if visible
    const addressesSection = document.getElementById('addresses');
    if (addressesSection.classList.contains('active')) {
        location.reload(); // Simple refresh for now
    }
}

function updateConversationsUI(data) {
    // Update unread messages count in navbar
    const messagesBadge = document.querySelector('.nav-item[data-section="inbox"] .nav-badge');
    if (messagesBadge) {
        messagesBadge.textContent = data.unreadCount || 0;
    }
}

function updateNotificationsUI(data) {
    // Update unread notifications count in navbar
    const notificationsBadge = document.querySelector('.nav-item[data-section="notifications"] .nav-badge');
    if (notificationsBadge) {
        notificationsBadge.textContent = data.unreadCount || 0;
    }
}

// Close modal on outside click
document.addEventListener('click', function(event) {
    const composeModal = document.getElementById('compose-modal');
    const addressModal = document.getElementById('address-modal');
    
    if (composeModal && !composeModal.contains(event.target) && event.target !== document.querySelector('[onclick*="showComposeModal"]')) {
        composeModal.classList.remove('active');
    }
    
    if (addressModal && !addressModal.contains(event.target) && event.target !== document.querySelector('[onclick*="showAddressModal"]')) {
        addressModal.classList.remove('active');
    }
});

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', function() {
    initNavigation();
    initForms();
    initRealTimeUpdates();
    console.log('Enhanced user dashboard initialized');
});

// Export for global access
window.UserUtils = UserUtils;
window.updateProfile = updateProfile;
window.changePassword = changePassword;
window.updateCartQuantity = updateCartQuantity;
window.updateCartQuantityDirect = updateCartQuantityDirect;
window.removeFromCart = removeFromCart;
window.clearCart = clearCart;
window.moveToWishlist = moveToWishlist;
window.toggleWishlist = toggleWishlist;
window.addToCart = addToCart;
window.removeFromWishlist = removeFromWishlist;
window.filterOrders = filterOrders;
window.cancelOrder = cancelOrder;
window.buyAgain = buyAgain;
window.writeReview = writeReview;
window.requestRefund = requestRefund;
window.showComposeModal = showComposeModal;
window.hideComposeModal = hideComposeModal;
window.sendMessage = sendMessage;
window.openConversation = openConversation;
window.showAddressModal = showAddressModal;
window.hideAddressModal = hideAddressModal;
window.saveAddress = saveAddress;
window.editAddress = editAddress;
window.setDefaultAddress = setDefaultAddress;
window.deleteAddress = deleteAddress;
window.saveNotificationPreferences = saveNotificationPreferences;
window.markAllNotificationsAsRead = markAllNotificationsAsRead;
window.markNotificationAsRead = markNotificationAsRead;
window.deleteNotification = deleteNotification;
window.editReview = editReview;
window.deleteReview = deleteReview;
window.refreshCartData = refreshCartData;
window.refreshWishlistData = refreshWishlistData;
window.refreshOrdersData = refreshOrdersData;
window.refreshAddressesData = refreshAddressesData;
window.refreshConversationsData = refreshConversationsData;
window.refreshNotificationsData = refreshNotificationsData;
window.refreshReviewsData = refreshReviewsData;