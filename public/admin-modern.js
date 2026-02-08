/**
 * Modern Admin Dashboard JavaScript
 * All functionality connected to UI and Database
 */

// Utility Functions
const AdminUtils = {
    // Show toast notification
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
            toast.style.transform = 'translateX(100%)';
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
    
    // Show modal
    showModal: function(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    },
    
    // Hide modal
    hideModal: function(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    },
    
    // Confirm action
    confirmAction: function(message, onConfirm) {
        if (confirm(message)) {
            onConfirm();
        }
    },
    
    // Format currency
    formatCurrency: function(amount) {
        return '$' + parseFloat(amount || 0).toFixed(2);
    },
    
    // Format date
    formatDate: function(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    },
    
    // Format datetime
    formatDateTime: function(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    },
    
    // API request helper
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
    }
};

// Dashboard Module
const Dashboard = {
    init: function() {
        this.initCharts();
        this.initRealTimeUpdates();
        this.initQuickActions();
    },
    
    initCharts: function() {
        // Charts are initialized in the EJS template
        // This is a fallback initialization
        if (typeof Chart !== 'undefined') {
            console.log('Chart.js is available');
        }
    },
    
    initRealTimeUpdates: function() {
        // Update stats every 30 seconds
        setInterval(() => {
            this.loadStats();
        }, 30000);
    },
    
    initQuickActions: function() {
        // Quick action buttons are handled by links
        console.log('Quick actions initialized');
    },
    
    loadStats: async function() {
        try {
            const data = await AdminUtils.apiRequest('/admin/api/dashboard/stats');
            if (data.success) {
                this.updateStatsDisplay(data.stats);
            }
        } catch (error) {
            console.error('Failed to load stats:', error);
        }
    },
    
    updateStatsDisplay: function(stats) {
        const elements = {
            'total-orders': stats.totalOrders,
            'total-users': stats.totalUsers,
            'total-products': stats.totalProducts,
            'total-messages': stats.totalMessages,
            'active-auctions': stats.activeAuctions,
            'active-events': stats.activeCountdowns
        };
        
        for (const [id, value] of Object.entries(elements)) {
            const element = document.getElementById(id);
            if (element && parseInt(element.textContent) !== value) {
                element.style.transform = 'scale(1.1)';
                element.style.transition = 'transform 0.2s';
                setTimeout(() => {
                    element.textContent = value;
                    element.style.transform = 'scale(1)';
                }, 100);
            }
        }
    }
};

// Products Module
const Products = {
    init: function() {
        this.bindEvents();
        this.initDataTable();
    },
    
    bindEvents: function() {
        // Add product form
        const productForm = document.getElementById('product-form');
        if (productForm) {
            productForm.addEventListener('submit', (e) => this.handleSubmit(e));
        }
        
        // Edit buttons
        document.querySelectorAll('[onclick^="editProduct"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.closest('[onclick]').getAttribute('onclick').match(/'(\d+)'/)[1];
                this.edit(id);
            });
        });
        
        // Delete buttons
        document.querySelectorAll('[onclick^="deleteProduct"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.closest('[onclick]').getAttribute('onclick').match(/'(\d+)'/)[1];
                this.delete(id);
            });
        });
    },
    
    initDataTable: function() {
        // Initialize data table if using DataTables
        console.log('Products data table initialized');
    },
    
    handleSubmit: async function(e) {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        
        const isEdit = form.dataset.productId;
        const url = isEdit ? `/admin/api/products/${isEdit}` : '/admin/api/products';
        const method = isEdit ? 'PUT' : 'POST';
        
        try {
            const result = await AdminUtils.apiRequest(url, {
                method,
                body: JSON.stringify(data)
            });
            
            AdminUtils.showToast(result.message, 'success');
            AdminUtils.hideModal('add-product-modal');
            form.reset();
            
            // Reload page to show new data
            setTimeout(() => location.reload(), 1000);
        } catch (error) {
            console.error('Failed to save product:', error);
        }
    },
    
    edit: async function(id) {
        try {
            const data = await AdminUtils.apiRequest(`/admin/api/products/${id}`);
            
            if (data.success) {
                const product = data.product;
                const form = document.getElementById('product-form');
                
                // Fill form fields
                document.getElementById('product-name').value = product.name || '';
                document.getElementById('product-description').value = product.description || '';
                document.getElementById('product-price').value = product.price || '';
                document.getElementById('product-stock').value = product.stock || '';
                
                form.dataset.productId = id;
                document.getElementById('product-modal-title').textContent = 'Edit Product';
                
                AdminUtils.showModal('add-product-modal');
            }
        } catch (error) {
            console.error('Failed to load product:', error);
        }
    },
    
    delete: function(id) {
        AdminUtils.confirmAction('Are you sure you want to delete this product?', async () => {
            try {
                const result = await AdminUtils.apiRequest(`/admin/api/products/${id}`, {
                    method: 'DELETE'
                });
                
                AdminUtils.showToast(result.message, 'success');
                setTimeout(() => location.reload(), 1000);
            } catch (error) {
                console.error('Failed to delete product:', error);
            }
        });
    },
    
    addNew: function() {
        const form = document.getElementById('product-form');
        form.reset();
        delete form.dataset.productId;
        document.getElementById('product-modal-title').textContent = 'Add New Product';
        AdminUtils.showModal('add-product-modal');
    }
};

// Categories Module
const Categories = {
    init: function() {
        this.bindEvents();
    },
    
    bindEvents: function() {
        // Add category form
        const categoryForm = document.getElementById('category-form');
        if (categoryForm) {
            categoryForm.addEventListener('submit', (e) => this.handleSubmit(e));
        }
    },
    
    handleSubmit: async function(e) {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        
        const isEdit = form.dataset.categoryId;
        const url = isEdit ? `/admin/api/categories/${isEdit}` : '/admin/api/categories';
        const method = isEdit ? 'PUT' : 'POST';
        
        try {
            const result = await AdminUtils.apiRequest(url, {
                method,
                body: JSON.stringify(data)
            });
            
            AdminUtils.showToast(result.message, 'success');
            AdminUtils.hideModal('add-category-modal');
            setTimeout(() => location.reload(), 1000);
        } catch (error) {
            console.error('Failed to save category:', error);
        }
    },
    
    edit: function(id) {
        // Load category data and show edit modal
        fetch(`/admin/api/categories/${id}`)
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    const category = data.category;
                    document.getElementById('category-name').value = category.name || '';
                    document.getElementById('category-description').value = category.description || '';
                    document.getElementById('category-form').dataset.categoryId = id;
                    document.getElementById('category-modal-title').textContent = 'Edit Category';
                    AdminUtils.showModal('add-category-modal');
                }
            })
            .catch(error => console.error('Failed to load category:', error));
    },
    
    delete: function(id) {
        AdminUtils.confirmAction('Are you sure you want to delete this category?', async () => {
            try {
                const result = await AdminUtils.apiRequest(`/admin/api/categories/${id}`, {
                    method: 'DELETE'
                });
                AdminUtils.showToast(result.message, 'success');
                setTimeout(() => location.reload(), 1000);
            } catch (error) {
                console.error('Failed to delete category:', error);
            }
        });
    }
};

// Orders Module
const Orders = {
    init: function() {
        this.bindEvents();
    },
    
    bindEvents: function() {
        // Status change buttons
        document.querySelectorAll('[onclick^="updateOrderStatus"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const match = e.target.closest('[onclick]').getAttribute('onclick').match(/'(\d+)',\s*'(\w+)'/);
                if (match) {
                    const [_, id, status] = match;
                    this.updateStatus(id, status);
                }
            });
        });
    },
    
    updateStatus: async function(id, status) {
        try {
            const result = await AdminUtils.apiRequest(`/admin/api/orders/${id}/status`, {
                method: 'PUT',
                body: JSON.stringify({ status })
            });
            
            AdminUtils.showToast(result.message, 'success');
            setTimeout(() => location.reload(), 1000);
        } catch (error) {
            console.error('Failed to update order status:', error);
        }
    },
    
    viewDetails: function(id) {
        window.location.href = `/admin/orders/${id}`;
    }
};

// Messages Module
const Messages = {
    init: function() {
        this.bindEvents();
        this.startPolling();
    },
    
    bindEvents: function() {
        // Reply form
        const replyForm = document.getElementById('reply-form');
        if (replyForm) {
            replyForm.addEventListener('submit', (e) => this.handleReply(e));
        }
    },
    
    startPolling: function() {
        // Poll for new messages every 10 seconds
        setInterval(() => {
            this.checkNewMessages();
        }, 10000);
    },
    
    checkNewMessages: async function() {
        try {
            const data = await AdminUtils.apiRequest('/admin/api/messages/stats');
            if (data.success) {
                const badge = document.getElementById('notification-badge');
                if (badge && data.stats.unreadTotal > 0) {
                    badge.textContent = data.stats.unreadTotal;
                    badge.style.display = 'block';
                }
            }
        } catch (error) {
            console.error('Failed to check messages:', error);
        }
    },
    
    handleReply: async function(e) {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        
        try {
            const result = await AdminUtils.apiRequest('/admin/api/messages/reply', {
                method: 'POST',
                body: JSON.stringify(data)
            });
            
            AdminUtils.showToast(result.message, 'success');
            form.reset();
        } catch (error) {
            console.error('Failed to send reply:', error);
        }
    },
    
    markAsRead: async function(id) {
        try {
            await AdminUtils.apiRequest(`/admin/api/messages/${id}/read`, {
                method: 'PUT'
            });
        } catch (error) {
            console.error('Failed to mark message as read:', error);
        }
    }
};

// Notifications Module
const Notifications = {
    init: function() {
        this.loadNotifications();
        this.bindEvents();
    },
    
    loadNotifications: async function() {
        try {
            const data = await AdminUtils.apiRequest('/admin/api/notifications');
            if (data.success) {
                this.renderNotifications(data.notifications);
            }
        } catch (error) {
            console.error('Failed to load notifications:', error);
        }
    },
    
    renderNotifications: function(notifications) {
        const container = document.getElementById('notification-list');
        if (!container) return;
        
        if (notifications.length === 0) {
            container.innerHTML = '<div class="notification-item"><p>No notifications</p></div>';
            return;
        }
        
        container.innerHTML = notifications.map(n => `
            <div class="notification-item ${n.is_read ? '' : 'unread'}" data-id="${n.id}">
                <div class="title">${n.title}</div>
                <div class="message">${n.message}</div>
                <div class="time">${AdminUtils.formatDateTime(n.created_at)}</div>
            </div>
        `).join('');
    },
    
    bindEvents: function() {
        // Mark all as read
        const markAllBtn = document.getElementById('mark-all-read');
        if (markAllBtn) {
            markAllBtn.addEventListener('click', () => this.markAllAsRead());
        }
    },
    
    markAllAsRead: async function() {
        try {
            await AdminUtils.apiRequest('/admin/api/notifications/read-all', {
                method: 'PUT'
            });
            
            document.querySelectorAll('.notification-item.unread').forEach(item => {
                item.classList.remove('unread');
            });
            
            const badge = document.getElementById('notification-badge');
            if (badge) badge.style.display = 'none';
            
            AdminUtils.showToast('All notifications marked as read', 'success');
        } catch (error) {
            console.error('Failed to mark all as read:', error);
        }
    }
};

// Profile Module
const Profile = {
    init: function() {
        this.bindEvents();
    },
    
    bindEvents: function() {
        // Profile form
        const profileForm = document.getElementById('profile-form');
        if (profileForm) {
            profileForm.addEventListener('submit', (e) => this.updateProfile(e));
        }
        
        // Password form
        const passwordForm = document.getElementById('password-form');
        if (passwordForm) {
            passwordForm.addEventListener('submit', (e) => this.updatePassword(e));
        }
    },
    
    updateProfile: async function(e) {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        
        try {
            const result = await AdminUtils.apiRequest('/admin/profile', {
                method: 'PUT',
                body: JSON.stringify(data)
            });
            
            AdminUtils.showToast(result.message, 'success');
        } catch (error) {
            console.error('Failed to update profile:', error);
        }
    },
    
    updatePassword: async function(e) {
        e.preventDefault();
        const form = e.target;
        const data = {
            currentPassword: form.current_password.value,
            newPassword: form.new_password.value,
            confirmPassword: form.confirm_password.value
        };
        
        if (data.newPassword !== data.confirmPassword) {
            AdminUtils.showToast('Passwords do not match', 'error');
            return;
        }
        
        try {
            const result = await AdminUtils.apiRequest('/admin/change-password', {
                method: 'POST',
                body: JSON.stringify(data)
            });
            
            AdminUtils.showToast(result.message, 'success');
            form.reset();
        } catch (error) {
            console.error('Failed to update password:', error);
        }
    }
};

// Sidebar Module
const Sidebar = {
    init: function() {
        this.bindEvents();
        this.loadState();
    },
    
    bindEvents: function() {
        const toggleBtn = document.getElementById('sidebar-toggle');
        const toggleHeader = document.getElementById('sidebar-toggle-header');
        
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => this.toggle());
        }
        
        if (toggleHeader) {
            toggleHeader.addEventListener('click', () => this.toggle());
        }
        
        // Close sidebar on mobile when clicking outside
        document.addEventListener('click', (e) => {
            const sidebar = document.querySelector('.admin-sidebar');
            const main = document.querySelector('.admin-main');
            
            if (window.innerWidth <= 992 && 
                !sidebar.contains(e.target) && 
                !e.target.closest('#sidebar-toggle-header') &&
                sidebar.classList.contains('show')) {
                sidebar.classList.remove('show');
            }
        });
    },
    
    toggle: function() {
        const sidebar = document.querySelector('.admin-sidebar');
        const main = document.getElementById('admin-main');
        
        sidebar.classList.toggle('collapsed');
        sidebar.classList.toggle('show');
        
        if (main) {
            main.classList.toggle('sidebar-collapsed');
        }
        
        this.saveState();
    },
    
    saveState: function() {
        const sidebar = document.querySelector('.admin-sidebar');
        localStorage.setItem('sidebarCollapsed', sidebar.classList.contains('collapsed'));
    },
    
    loadState: function() {
        const collapsed = localStorage.getItem('sidebarCollapsed') === 'true';
        if (collapsed) {
            const sidebar = document.querySelector('.admin-sidebar');
            const main = document.getElementById('admin-main');
            sidebar.classList.add('collapsed');
            if (main) main.classList.add('sidebar-collapsed');
        }
    }
};

// Dropdown Module
const Dropdowns = {
    init: function() {
        this.bindEvents();
    },
    
    bindEvents: function() {
        // Profile dropdown
        const profileBtn = document.getElementById('profile-btn');
        const profileMenu = document.getElementById('profile-dropdown');
        
        if (profileBtn && profileMenu) {
            profileBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                profileMenu.classList.toggle('show');
            });
        }
        
        // Notification dropdown
        const notifBtn = document.getElementById('notification-btn');
        const notifDropdown = document.getElementById('notification-dropdown');
        
        if (notifBtn && notifDropdown) {
            notifBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                notifDropdown.classList.toggle('show');
            });
        }
        
        // Close dropdowns on outside click
        document.addEventListener('click', () => {
            if (profileMenu) profileMenu.classList.remove('show');
            if (notifDropdown) notifDropdown.classList.remove('show');
        });
    }
};

// Search Module
const Search = {
    init: function() {
        this.bindEvents();
    },
    
    bindEvents: function() {
        const searchInput = document.getElementById('global-search');
        if (searchInput) {
            let debounceTimer;
            
            searchInput.addEventListener('input', (e) => {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    this.performSearch(e.target.value);
                }, 300);
            });
        }
    },
    
    performSearch: async function(query) {
        if (query.length < 2) return;
        
        try {
            const data = await AdminUtils.apiRequest(`/admin/api/search?q=${encodeURIComponent(query)}`);
            if (data.success) {
                this.showResults(data.results);
            }
        } catch (error) {
            console.error('Search failed:', error);
        }
    },
    
    showResults: function(results) {
        // Results are shown in a dropdown
        console.log('Search results:', results);
    }
};

// Initialize all modules on DOM ready
document.addEventListener('DOMContentLoaded', function() {
    Sidebar.init();
    Dropdowns.init();
    Dashboard.init();
    Products.init();
    Categories.init();
    Orders.init();
    Messages.init();
    Notifications.init();
    Profile.init();
    Search.init();
    
    console.log('Admin Dashboard initialized');
});

// Export for global access
window.AdminUtils = AdminUtils;
window.Dashboard = Dashboard;
window.Products = Products;
window.Categories = Categories;
window.Orders = Orders;
window.Messages = Messages;
window.Notifications = Notifications;
window.Profile = Profile;
