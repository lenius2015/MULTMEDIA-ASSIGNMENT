/**
 * User Dashboard JavaScript
 * All functionality connected to UI and Database
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
            day: 'numeric'
        });
    }
};

// Navigation Module
function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('.section');
    
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
    
    // Compose message form
    const composeForm = document.getElementById('composeForm');
    if (composeForm) {
        composeForm.addEventListener('submit', sendMessage);
    }
}

// Profile Functions
function updateProfile(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    
    UserUtils.apiRequest('/api/user/profile', {
        method: 'PUT',
        body: JSON.stringify(data)
    })
    .then(result => {
        UserUtils.showToast(result.message, 'success');
        // Update displayed name
        document.querySelector('.user-info h4').textContent = data.name;
        document.querySelector('.section-header h1').textContent = `Welcome back, ${data.name}! 👋`;
    })
    .catch(error => {
        console.error('Profile update error:', error);
    });
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
            }
        };
        reader.readAsDataURL(file);
    }
}

// Password Functions
function changePassword(event) {
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
    
    UserUtils.apiRequest('/api/user/change-password', {
        method: 'POST',
        body: JSON.stringify(data)
    })
    .then(result => {
        UserUtils.showToast(result.message, 'success');
        form.reset();
    })
    .catch(error => {
        console.error('Password change error:', error);
    });
}

// Cart Functions
function updateCartQuantity(productId, change) {
    UserUtils.apiRequest('/api/cart/update', {
        method: 'POST',
        body: JSON.stringify({ productId, quantity: change })
    })
    .then(result => {
        UserUtils.showToast(result.message, 'success');
        setTimeout(() => location.reload(), 1000);
    })
    .catch(error => {
        console.error('Cart update error:', error);
    });
}

function removeFromCart(productId) {
    if (confirm('Remove this item from your cart?')) {
        UserUtils.apiRequest(`/api/cart/${productId}`, {
            method: 'DELETE'
        })
        .then(result => {
            UserUtils.showToast('Item removed from cart', 'success');
            setTimeout(() => location.reload(), 1000);
        })
        .catch(error => {
            console.error('Remove from cart error:', error);
        });
    }
}

// Wishlist Functions
function addToCart(productId) {
    UserUtils.apiRequest('/api/cart/add', {
        method: 'POST',
        body: JSON.stringify({ productId, quantity: 1 })
    })
    .then(result => {
        UserUtils.showToast('Added to cart', 'success');
    })
    .catch(error => {
        console.error('Add to cart error:', error);
    });
}

function removeFromWishlist(productId) {
    UserUtils.apiRequest(`/api/wishlist/${productId}`, {
        method: 'DELETE'
    })
    .then(result => {
        UserUtils.showToast('Removed from wishlist', 'success');
        setTimeout(() => location.reload(), 1000);
    })
    .catch(error => {
        console.error('Remove from wishlist error:', error);
    });
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

function cancelOrder(orderId) {
    if (confirm('Are you sure you want to cancel this order?')) {
        UserUtils.apiRequest(`/api/orders/${orderId}/cancel`, {
            method: 'PUT'
        })
        .then(result => {
            UserUtils.showToast(result.message, 'success');
            setTimeout(() => location.reload(), 1000);
        })
        .catch(error => {
            console.error('Cancel order error:', error);
        });
    }
}

// Messages Functions
function showComposeModal() {
    document.getElementById('compose-modal').classList.add('active');
}

function hideComposeModal() {
    document.getElementById('compose-modal').classList.remove('active');
}

function sendMessage(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    
    UserUtils.apiRequest('/api/inbox/send', {
        method: 'POST',
        body: JSON.stringify(data)
    })
    .then(result => {
        UserUtils.showToast(result.message, 'success');
        hideComposeModal();
        form.reset();
    })
    .catch(error => {
        console.error('Send message error:', error);
    });
}

function openConversation(conversationId) {
    window.location.href = `/inbox?conversation=${conversationId}`;
}

// Address Functions
function showAddressModal() {
    // Implement address modal
    UserUtils.showToast('Address modal coming soon', 'info');
}

function editAddress(addressId) {
    UserUtils.showToast('Edit address coming soon', 'info');
}

function setDefaultAddress(addressId) {
    UserUtils.apiRequest(`/api/user/addresses/${addressId}/default`, {
        method: 'PUT'
    })
    .then(result => {
        UserUtils.showToast(result.message, 'success');
        setTimeout(() => location.reload(), 1000);
    })
    .catch(error => {
        console.error('Set default address error:', error);
    });
}

// Close modal on outside click
document.addEventListener('click', function(event) {
    const composeModal = document.getElementById('compose-modal');
    if (composeModal && !composeModal.contains(event.target)) {
        composeModal.classList.remove('active');
    }
});

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', function() {
    initNavigation();
    initForms();
    console.log('User dashboard initialized');
});

// Export for global access
window.UserUtils = UserUtils;
window.updateProfile = updateProfile;
window.changePassword = changePassword;
window.updateCartQuantity = updateCartQuantity;
window.removeFromCart = removeFromCart;
window.addToCart = addToCart;
window.removeFromWishlist = removeFromWishlist;
window.filterOrders = filterOrders;
window.cancelOrder = cancelOrder;
window.showComposeModal = showComposeModal;
window.hideComposeModal = hideComposeModal;
window.sendMessage = sendMessage;
window.setDefaultAddress = setDefaultAddress;
