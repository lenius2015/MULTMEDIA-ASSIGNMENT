/* Enhanced Admin Dashboard JavaScript */

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
    },
    
    // Debounce function
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

// Dashboard Module
const Dashboard = {
    init: function() {
        this.initCharts();
        this.initRealTimeUpdates();
        this.initQuickActions();
        this.loadStats();
        this.loadRecentActivity();
    },
    
    initCharts: function() {
        this.initSalesChart();
        this.initStatusChart();
    },
    
    initSalesChart: function() {
        const ctx = document.getElementById('sales-chart');
        if (!ctx) return;
        
        this.salesChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Sales',
                    data: [],
                    borderColor: '#6b7280',
                    backgroundColor: 'rgba(107, 114, 128, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: '#e5e7eb'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    },
    
    initStatusChart: function() {
        const ctx = document.getElementById('status-chart');
        if (!ctx) return;
        
        this.statusChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Pending', 'Processing', 'Shipped', 'Delivered'],
                datasets: [{
                    data: [0, 0, 0, 0],
                    backgroundColor: ['#f59e0b', '#3b82f6', '#8b5cf6', '#10b981'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
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
            'total-messages': stats.totalMessages
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
    },
    
    loadRecentActivity: async function() {
        try {
            const data = await AdminUtils.apiRequest('/admin/api/dashboard/activity');
            if (data.success) {
                this.renderRecentOrders(data.recentOrders);
                this.renderRecentMessages(data.recentMessages);
            }
        } catch (error) {
            console.error('Failed to load recent activity:', error);
        }
    },
    
    renderRecentOrders: function(orders) {
        const container = document.getElementById('recent-orders-list');
        if (!container) return;
        
        if (orders.length === 0) {
            container.innerHTML = '<div class="empty-state"><i class="fas fa-shopping-cart"></i><p>No recent orders</p></div>';
            return;
        }
        
        container.innerHTML = orders.map(order => `
            <div class="activity-item">
                <div class="activity-icon order">
                    <i class="fas fa-shopping-cart"></i>
                </div>
                <div class="activity-content">
                    <div class="activity-title">Order #${order.id}</div>
                    <div class="activity-desc">${order.customer_name || 'Customer'} - ${AdminUtils.formatCurrency(order.total_amount)}</div>
                    <div class="activity-time">${AdminUtils.formatDateTime(order.created_at)}</div>
                </div>
                <div class="activity-status ${order.status}">${order.status}</div>
            </div>
        `).join('');
    },
    
    renderRecentMessages: function(messages) {
        const container = document.getElementById('recent-messages-list');
        if (!container) return;
        
        if (messages.length === 0) {
            container.innerHTML = '<div class="empty-state"><i class="fas fa-envelope"></i><p>No recent messages</p></div>';
            return;
        }
        
        container.innerHTML = messages.map(message => `
            <div class="activity-item">
                <div class="activity-icon message">
                    <i class="fas fa-envelope"></i>
                </div>
                <div class="activity-content">
                    <div class="activity-title">${message.name}</div>
                    <div class="activity-desc">${message.subject || 'No subject'}</div>
                    <div class="activity-time">${AdminUtils.formatDateTime(message.created_at)}</div>
                </div>
                <div class="activity-status ${message.is_read ? 'read' : 'unread'}">
                    ${message.is_read ? 'Read' : 'Unread'}
                </div>
            </div>
        `).join('');
    }
};

// Products Module
const Products = {
    init: function() {
        this.bindEvents();
        this.loadProducts();
        this.loadCategories();
    },
    
    bindEvents: function() {
        // Add product form
        const productForm = document.getElementById('product-form');
        if (productForm) {
            productForm.addEventListener('submit', (e) => this.handleSubmit(e));
        }
        
        // Search and filters
        const searchInput = document.getElementById('product-search');
        const categoryFilter = document.getElementById('category-filter');
        const statusFilter = document.getElementById('status-filter');
        
        if (searchInput) {
            searchInput.addEventListener('input', AdminUtils.debounce((e) => this.filterProducts(), 300));
        }
        if (categoryFilter) {
            categoryFilter.addEventListener('change', () => this.filterProducts());
        }
        if (statusFilter) {
            statusFilter.addEventListener('change', () => this.filterProducts());
        }
    },
    
    loadProducts: async function() {
        try {
            const data = await AdminUtils.apiRequest('/admin/api/products');
            if (data.success) {
                this.renderProducts(data.products);
            }
        } catch (error) {
            console.error('Failed to load products:', error);
        }
    },
    
    loadCategories: async function() {
        try {
            const data = await AdminUtils.apiRequest('/admin/api/categories');
            if (data.success) {
                this.populateCategorySelect(data.categories);
            }
        } catch (error) {
            console.error('Failed to load categories:', error);
        }
    },
    
    renderProducts: function(products) {
        const tbody = document.getElementById('products-table-body');
        if (!tbody) return;
        
        if (products.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No products found</td></tr>';
            return;
        }
        
        tbody.innerHTML = products.map(product => `
            <tr>
                <td>
                    <div class="product-info">
                        <div class="product-image">
                            ${product.image_url ? `<img src="${product.image_url}" alt="${product.name}">` : '<div class="placeholder-image">No Image</div>'}
                        </div>
                        <div class="product-details">
                            <div class="product-name">${product.name}</div>
                            <div class="product-category">${product.category_name || 'Uncategorized'}</div>
                        </div>
                    </div>
                </td>
                <td>${product.category_name || 'Uncategorized'}</td>
                <td>${AdminUtils.formatCurrency(product.price)}</td>
                <td>
                    <span class="stock-badge ${product.stock > 10 ? 'in-stock' : product.stock > 0 ? 'low-stock' : 'out-of-stock'}">
                        ${product.stock}
                    </span>
                </td>
                <td>
                    <span class="status ${product.is_active ? 'active' : 'inactive'}">
                        ${product.is_active ? 'Active' : 'Inactive'}
                    </span>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-secondary btn-sm" onclick="Products.edit(${product.id})">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="Products.delete(${product.id})">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    },
    
    populateCategorySelect: function(categories) {
        const select = document.getElementById('category-filter');
        if (!select) return;
        
        select.innerHTML = '<option value="all">All Categories</option>' + 
            categories.map(cat => `<option value="${cat.id}">${cat.name}</option>`).join('');
    },
    
    filterProducts: function() {
        const search = document.getElementById('product-search').value.toLowerCase();
        const category = document.getElementById('category-filter').value;
        const status = document.getElementById('status-filter').value;
        
        // This would typically trigger an API call with filters
        console.log('Filtering products:', { search, category, status });
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
            delete form.dataset.productId;
            this.loadProducts();
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
                this.loadProducts();
            } catch (error) {
                console.error('Failed to delete product:', error);
            }
        });
    }
};

// Categories Module
const Categories = {
    init: function() {
        this.bindEvents();
        this.loadCategories();
    },
    
    bindEvents: function() {
        // Add category form
        const categoryForm = document.getElementById('category-form');
        if (categoryForm) {
            categoryForm.addEventListener('submit', (e) => this.handleSubmit(e));
        }
    },
    
    loadCategories: async function() {
        try {
            const data = await AdminUtils.apiRequest('/admin/api/categories');
            if (data.success) {
                this.renderCategories(data.categories);
            }
        } catch (error) {
            console.error('Failed to load categories:', error);
        }
    },
    
    renderCategories: function(categories) {
        const tbody = document.getElementById('categories-table-body');
        if (!tbody) return;
        
        if (categories.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No categories found</td></tr>';
            return;
        }
        
        tbody.innerHTML = categories.map(category => `
            <tr>
                <td>
                    <div class="category-info">
                        <div class="category-name">${category.name}</div>
                        <div class="category-slug">${category.slug || ''}</div>
                    </div>
                </td>
                <td>${category.description || 'No description'}</td>
                <td>
                    <span class="product-count">${category.product_count || 0}</span>
                </td>
                <td>
                    <span class="status ${category.is_active ? 'active' : 'inactive'}">
                        ${category.is_active ? 'Active' : 'Inactive'}
                    </span>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-secondary btn-sm" onclick="Categories.edit(${category.id})">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="Categories.delete(${category.id})">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
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
            form.reset();
            delete form.dataset.categoryId;
            this.loadCategories();
        } catch (error) {
            console.error('Failed to save category:', error);
        }
    },
    
    edit: async function(id) {
        try {
            const data = await AdminUtils.apiRequest(`/admin/api/categories/${id}`);
            
            if (data.success) {
                const category = data.category;
                const form = document.getElementById('category-form');
                
                // Fill form fields
                document.getElementById('category-name').value = category.name || '';
                document.getElementById('category-description').value = category.description || '';
                
                form.dataset.categoryId = id;
                document.getElementById('category-modal-title').textContent = 'Edit Category';
                
                AdminUtils.showModal('add-category-modal');
            }
        } catch (error) {
            console.error('Failed to load category:', error);
        }
    },
    
    delete: function(id) {
        AdminUtils.confirmAction('Are you sure you want to delete this category?', async () => {
            try {
                const result = await AdminUtils.apiRequest(`/admin/api/categories/${id}`, {
                    method: 'DELETE'
                });
                
                AdminUtils.showToast(result.message, 'success');
                this.loadCategories();
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
        this.loadOrders();
    },
    
    bindEvents: function() {
        // Search and filters
        const searchInput = document.getElementById('order-search');
        const statusFilter = document.getElementById('order-status-filter');
        
        if (searchInput) {
            searchInput.addEventListener('input', AdminUtils.debounce((e) => this.filterOrders(), 300));
        }
        if (statusFilter) {
            statusFilter.addEventListener('change', () => this.filterOrders());
        }
    },
    
    loadOrders: async function() {
        try {
            const data = await AdminUtils.apiRequest('/admin/api/orders');
            if (data.success) {
                this.renderOrders(data.orders);
            }
        } catch (error) {
            console.error('Failed to load orders:', error);
        }
    },
    
    renderOrders: function(orders) {
        const tbody = document.getElementById('orders-table-body');
        if (!tbody) return;
        
        if (orders.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No orders found</td></tr>';
            return;
        }
        
        tbody.innerHTML = orders.map(order => `
            <tr>
                <td>
                    <div class="order-id">#${order.id}</div>
                    <div class="order-date">${AdminUtils.formatDateTime(order.created_at)}</div>
                </td>
                <td>
                    <div class="customer-info">
                        <div class="customer-name">${order.customer_name || 'Customer'}</div>
                        <div class="customer-email">${order.customer_email || 'No email'}</div>
                    </div>
                </td>
                <td>${AdminUtils.formatDateTime(order.created_at)}</td>
                <td>${AdminUtils.formatCurrency(order.total_amount)}</td>
                <td>
                    <span class="status ${order.status}">
                        ${order.status}
                    </span>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-secondary btn-sm" onclick="Orders.viewDetails(${order.id})">
                            <i class="fas fa-eye"></i> View
                        </button>
                        <button class="btn btn-primary btn-sm" onclick="Orders.updateStatus(${order.id}, 'processing')">
                            <i class="fas fa-sync"></i> Process
                        </button>
                        <button class="btn btn-success btn-sm" onclick="Orders.updateStatus(${order.id}, 'delivered')">
                            <i class="fas fa-check"></i> Deliver
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    },
    
    filterOrders: function() {
        const search = document.getElementById('order-search').value.toLowerCase();
        const status = document.getElementById('order-status-filter').value;
        
        // This would typically trigger an API call with filters
        console.log('Filtering orders:', { search, status });
    },
    
    updateStatus: async function(id, status) {
        try {
            const result = await AdminUtils.apiRequest(`/admin/api/orders/${id}/status`, {
                method: 'PUT',
                body: JSON.stringify({ status })
            });
            
            AdminUtils.showToast(result.message, 'success');
            this.loadOrders();
        } catch (error) {
            console.error('Failed to update order status:', error);
        }
    },
    
    viewDetails: function(id) {
        window.location.href = `/admin/orders/${id}`;
    }
};

// Customers Module
const Customers = {
    init: function() {
        this.bindEvents();
        this.loadCustomers();
    },
    
    bindEvents: function() {
        // Search and filters
        const searchInput = document.getElementById('customer-search');
        const filter = document.getElementById('customer-filter');
        
        if (searchInput) {
            searchInput.addEventListener('input', AdminUtils.debounce((e) => this.filterCustomers(), 300));
        }
        if (filter) {
            filter.addEventListener('change', () => this.filterCustomers());
        }
    },
    
    loadCustomers: async function() {
        try {
            const data = await AdminUtils.apiRequest('/admin/api/customers');
            if (data.success) {
                this.renderCustomers(data.customers);
            }
        } catch (error) {
            console.error('Failed to load customers:', error);
        }
    },
    
    renderCustomers: function(customers) {
        const tbody = document.getElementById('customers-table-body');
        if (!tbody) return;
        
        if (customers.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No customers found</td></tr>';
            return;
        }
        
        tbody.innerHTML = customers.map(customer => `
            <tr>
                <td>
                    <div class="customer-info">
                        <div class="customer-name">${customer.name || 'Customer'}</div>
                        <div class="customer-id">ID: ${customer.id}</div>
                    </div>
                </td>
                <td>${customer.email || 'No email'}</td>
                <td>${customer.phone || 'No phone'}</td>
                <td>
                    <span class="order-count">${customer.order_count || 0}</span>
                </td>
                <td>${customer.last_order ? AdminUtils.formatDateTime(customer.last_order) : 'Never'}</td>
                <td>
                    <span class="status ${customer.is_active ? 'active' : 'inactive'}">
                        ${customer.is_active ? 'Active' : 'Inactive'}
                    </span>
                </td>
            </tr>
        `).join('');
    },
    
    filterCustomers: function() {
        const search = document.getElementById('customer-search').value.toLowerCase();
        const filter = document.getElementById('customer-filter').value;
        
        // This would typically trigger an API call with filters
        console.log('Filtering customers:', { search, filter });
    }
};

// Messages Module
const Messages = {
    init: function() {
        this.bindEvents();
        this.loadMessages();
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
    
    loadMessages: async function() {
        try {
            const data = await AdminUtils.apiRequest('/admin/api/messages');
            if (data.success) {
                this.renderMessages(data.messages);
            }
        } catch (error) {
            console.error('Failed to load messages:', error);
        }
    },
    
    renderMessages: function(messages) {
        const tbody = document.getElementById('messages-table-body');
        if (!tbody) return;
        
        if (messages.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No messages found</td></tr>';
            return;
        }
        
        tbody.innerHTML = messages.map(message => `
            <tr>
                <td>
                    <div class="message-from">
                        <div class="message-name">${message.name}</div>
                        <div class="message-email">${message.email}</div>
                    </div>
                </td>
                <td>
                    <div class="message-subject">${message.subject || 'No subject'}</div>
                    <div class="message-preview">${message.message.substring(0, 50)}${message.message.length > 50 ? '...' : ''}</div>
                </td>
                <td>${AdminUtils.formatDateTime(message.created_at)}</td>
                <td>
                    <span class="status ${message.is_read ? 'read' : 'unread'}">
                        ${message.is_read ? 'Read' : 'Unread'}
                    </span>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-secondary btn-sm" onclick="Messages.viewMessage(${message.id})">
                            <i class="fas fa-eye"></i> View
                        </button>
                        <button class="btn btn-primary btn-sm" onclick="Messages.markAsRead(${message.id})">
                            <i class="fas fa-check"></i> Mark Read
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="Messages.delete(${message.id})">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    },
    
    checkNewMessages: async function() {
        try {
            const data = await AdminUtils.apiRequest('/admin/api/messages/stats');
            if (data.success) {
                const badge = document.getElementById('message-badge');
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
    
    viewMessage: function(id) {
        // Show message details in modal or redirect
        console.log('Viewing message:', id);
    },
    
    markAsRead: async function(id) {
        try {
            await AdminUtils.apiRequest(`/admin/api/messages/${id}/read`, {
                method: 'PUT'
            });
            
            this.loadMessages();
        } catch (error) {
            console.error('Failed to mark message as read:', error);
        }
    },
    
    delete: function(id) {
        AdminUtils.confirmAction('Are you sure you want to delete this message?', async () => {
            try {
                const result = await AdminUtils.apiRequest(`/admin/api/messages/${id}`, {
                    method: 'DELETE'
                });
                
                AdminUtils.showToast(result.message, 'success');
                this.loadMessages();
            } catch (error) {
                console.error('Failed to delete message:', error);
            }
        });
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
                <div class="notification-icon">
                    <i class="fas fa-bell"></i>
                </div>
                <div class="notification-content">
                    <div class="notification-title">${n.title}</div>
                    <div class="notification-message">${n.message}</div>
                    <div class="notification-time">${AdminUtils.formatDateTime(n.created_at)}</div>
                </div>
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

// Analytics Module
const Analytics = {
    init: function() {
        this.initCharts();
        this.loadAnalytics();
    },
    
    initCharts: function() {
        this.initRevenueChart();
        this.initProductChart();
    },
    
    initRevenueChart: function() {
        const ctx = document.getElementById('revenue-chart');
        if (!ctx) return;
        
        this.revenueChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{
                    label: 'Revenue',
                    data: [],
                    backgroundColor: 'rgba(107, 114, 128, 0.8)',
                    borderColor: '#6b7280',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: '#e5e7eb'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    },
    
    initProductChart: function() {
        const ctx = document.getElementById('product-chart');
        if (!ctx) return;
        
        this.productChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Products Sold',
                    data: [],
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: '#e5e7eb'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    },
    
    loadAnalytics: async function() {
        try {
            const data = await AdminUtils.apiRequest('/admin/api/analytics');
            if (data.success) {
                this.updateAnalyticsDisplay(data.analytics);
            }
        } catch (error) {
            console.error('Failed to load analytics:', error);
        }
    },
    
    updateAnalyticsDisplay: function(analytics) {
        const elements = {
            'revenue-today': analytics.revenueToday,
            'avg-order-value': analytics.avgOrderValue,
            'new-customers-today': analytics.newCustomersToday,
            'conversion-rate': analytics.conversionRate + '%'
        };
        
        for (const [id, value] of Object.entries(elements)) {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            }
        }
    }
};

// Settings Module
const Settings = {
    init: function() {
        this.bindEvents();
    },
    
    bindEvents: function() {
        // General settings form
        const generalForm = document.getElementById('general-settings-form');
        if (generalForm) {
            generalForm.addEventListener('submit', (e) => this.handleGeneralSettings(e));
        }
        
        // Notification settings form
        const notificationForm = document.getElementById('notification-settings-form');
        if (notificationForm) {
            notificationForm.addEventListener('submit', (e) => this.handleNotificationSettings(e));
        }
    },
    
    handleGeneralSettings: async function(e) {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        
        try {
            const result = await AdminUtils.apiRequest('/admin/api/settings/general', {
                method: 'PUT',
                body: JSON.stringify(data)
            });
            
            AdminUtils.showToast(result.message, 'success');
        } catch (error) {
            console.error('Failed to save general settings:', error);
        }
    },
    
    handleNotificationSettings: async function(e) {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        
        try {
            const result = await AdminUtils.apiRequest('/admin/api/settings/notifications', {
                method: 'PUT',
                body: JSON.stringify(data)
            });
            
            AdminUtils.showToast(result.message, 'success');
        } catch (error) {
            console.error('Failed to save notification settings:', error);
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
        
        // Navigation links
        document.querySelectorAll('.sidebar-nav a').forEach(link => {
            link.addEventListener('click', (e) => {
                this.handleNavigation(e.target.closest('a'));
            });
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
    },
    
    handleNavigation: function(link) {
        const section = link.getAttribute('href').replace('#', '');
        
        // Update active state
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        link.closest('.nav-item').classList.add('active');
        
        // Update page title
        const title = link.querySelector('span').textContent;
        document.getElementById('page-title').textContent = title;
        
        // Show/hide sections
        document.querySelectorAll('.admin-section').forEach(sectionEl => {
            sectionEl.classList.remove('active');
        });
        document.getElementById(section).classList.add('active');
        
        // Close sidebar on mobile
        if (window.innerWidth <= 992) {
            document.querySelector('.admin-sidebar').classList.remove('show');
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
                if (notifDropdown.classList.contains('show')) {
                    Notifications.loadNotifications();
                }
            });
        }
        
        // Message dropdown
        const msgBtn = document.getElementById('message-btn');
        const msgDropdown = document.getElementById('message-dropdown');
        
        if (msgBtn && msgDropdown) {
            msgBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                msgDropdown.classList.toggle('show');
                if (msgDropdown.classList.contains('show')) {
                    Messages.loadMessages();
                }
            });
        }
        
        // Close dropdowns on outside click
        document.addEventListener('click', () => {
            if (profileMenu) profileMenu.classList.remove('show');
            if (notifDropdown) notifDropdown.classList.remove('show');
            if (msgDropdown) msgDropdown.classList.remove('show');
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

// Modal Functions (Global)
window.showAddProductModal = function() {
    const form = document.getElementById('product-form');
    form.reset();
    delete form.dataset.productId;
    document.getElementById('product-modal-title').textContent = 'Add Product';
    AdminUtils.showModal('add-product-modal');
};

window.hideAddProductModal = function() {
    AdminUtils.hideModal('add-product-modal');
};

window.showAddCategoryModal = function() {
    const form = document.getElementById('category-form');
    form.reset();
    delete form.dataset.categoryId;
    document.getElementById('category-modal-title').textContent = 'Add Category';
    AdminUtils.showModal('add-category-modal');
};

window.hideAddCategoryModal = function() {
    AdminUtils.hideModal('add-category-modal');
};

window.exportProducts = function() {
    AdminUtils.showToast('Export functionality would be implemented here', 'info');
};

window.exportCustomers = function() {
    AdminUtils.showToast('Export functionality would be implemented here', 'info');
};

window.refreshOrders = function() {
    Orders.loadOrders();
    AdminUtils.showToast('Orders refreshed', 'success');
};

window.markAllMessagesRead = function() {
    Messages.markAllAsRead();
};

window.generateReport = function() {
    AdminUtils.showToast('Report generation would be implemented here', 'info');
};

// Initialize all modules on DOM ready
document.addEventListener('DOMContentLoaded', function() {
    Sidebar.init();
    Dropdowns.init();
    Search.init();
    Dashboard.init();
    Products.init();
    Categories.init();
    Orders.init();
    Customers.init();
    Messages.init();
    Notifications.init();
    Analytics.init();
    Settings.init();
    
    console.log('Enhanced Admin Dashboard initialized');
});

// Export for global access
window.AdminUtils = AdminUtils;
window.Dashboard = Dashboard;
window.Products = Products;
window.Categories = Categories;
window.Orders = Orders;
window.Customers = Customers;
window.Messages = Messages;
window.Notifications = Notifications;
window.Analytics = Analytics;
window.Settings = Settings;
window.Sidebar = Sidebar;
window.Dropdowns = Dropdowns;
window.Search = Search;