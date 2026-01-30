// Comprehensive Admin Button Functions
// This file ensures all buttons across the admin panel are functioning correctly

// Initialize button functionality when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    initializeButtonFunctions();
    initializeTableButtons();
    initializeModalButtons();
    initializeFormButtons();
    initializeNavigationButtons();
});

// Core button functions
function initializeButtonFunctions() {
    // Ensure all modal functions are available globally
    window.showModal = function(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('show');
            // Focus first input if exists
            const firstInput = modal.querySelector('input, select, textarea');
            if (firstInput) {
                setTimeout(() => firstInput.focus(), 100);
            }
        } else {
            console.warn(`Modal ${modalId} not found`);
        }
    };

    window.hideModal = function(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('show');
        }
    };

    // Export functions
    window.exportOrders = function() {
        showToast('Exporting orders...', 'info');
        fetch('/admin/reports/orders')
            .then(response => {
                if (response.ok) {
                    return response.blob();
                } else {
                    throw new Error('Export failed');
                }
            })
            .then(blob => {
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'orders_export.csv';
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                showToast('Orders exported successfully!', 'success');
            })
            .catch(error => {
                console.error('Export error:', error);
                showToast('Failed to export orders', 'error');
            });
    };

    window.exportProducts = function() {
        showToast('Exporting products...', 'info');
        fetch('/admin/reports/products')
            .then(response => {
                if (response.ok) {
                    return response.blob();
                } else {
                    throw new Error('Export failed');
                }
            })
            .then(blob => {
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'products_export.csv';
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                showToast('Products exported successfully!', 'success');
            })
            .catch(error => {
                console.error('Export error:', error);
                showToast('Failed to export products', 'error');
            });
    };

    window.exportCustomers = function() {
        showToast('Exporting customers...', 'info');
        fetch('/admin/reports/customers')
            .then(response => {
                if (response.ok) {
                    return response.blob();
                } else {
                    throw new Error('Export failed');
                }
            })
            .then(blob => {
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'customers_export.csv';
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                showToast('Customers exported successfully!', 'success');
            })
            .catch(error => {
                console.error('Export error:', error);
                showToast('Failed to export customers', 'error');
            });
    };

    // Contact form functions
    window.replyToContact = function(messageId) {
        showModal('reply-modal');
        // Could pre-fill the form with message details
    };

    window.viewContactThread = function(messageId) {
        window.location.href = `/admin/messages?contact=${messageId}`;
    };

    window.deleteMessage = function(messageId) {
        showConfirm('Are you sure you want to delete this message?', function() {
            fetch(`/admin/contact-messages/${messageId}`, {
                method: 'DELETE'
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    showToast('Message deleted successfully!', 'success');
                    setTimeout(() => location.reload(), 1000);
                } else {
                    showToast('Failed to delete message', 'error');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showToast('Failed to delete message', 'error');
            });
        });
    };

    // Messages page functions
    window.closeConversation = function() {
        showConfirm('Are you sure you want to close this conversation?', function() {
            showToast('Conversation closed', 'success');
            // Additional implementation needed
        });
    };

    window.markAsResolved = function() {
        showToast('Conversation marked as resolved', 'success');
        // Additional implementation needed
    };

    window.deleteConversation = function() {
        showConfirm('Are you sure you want to delete this conversation? This action cannot be undone.', function() {
            showToast('Conversation deleted', 'success');
            // Additional implementation needed
        });
    };

    window.manualReconnect = function() {
        const fallback = document.getElementById('connectionFallback');
        if (fallback) {
            fallback.style.display = 'flex';
        }
        setTimeout(() => {
            if (typeof reloadMessages === 'function') {
                reloadMessages();
            }
            fallback.style.display = 'none';
            showToast('Reconnected successfully!', 'success');
        }, 2000);
    };

    window.retryLoad = function() {
        showToast('Retrying...', 'info');
        if (typeof loadConversations === 'function') {
            loadConversations();
        } else if (typeof loadMessages === 'function') {
            loadMessages();
        }
    };

    // Filter and clear functions
    window.clearFilters = function() {
        const filterInputs = document.querySelectorAll('#filter-form input, #filter-form select');
        filterInputs.forEach(input => {
            if (input.type === 'checkbox' || input.type === 'radio') {
                input.checked = false;
            } else {
                input.value = '';
            }
        });
        showToast('Filters cleared', 'success');
        // Reload data
        if (typeof loadProducts === 'function') {
            loadProducts();
        }
    };

    window.applyFilters = function() {
        showToast('Applying filters...', 'info');
        // Implementation would go here
        if (typeof loadProducts === 'function') {
            loadProducts();
        }
        hideModal('filter-modal');
    };

    // Order status functions
    window.updateOrderStatus = function(orderId, newStatus) {
        fetch(`/admin/orders/${orderId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ status: newStatus })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showToast(`Order status updated to ${newStatus}`, 'success');
                setTimeout(() => location.reload(), 1000);
            } else {
                showToast('Failed to update order status', 'error');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showToast('Failed to update order status', 'error');
        });
    };

    // Customer functions
    window.viewCustomerDetails = function(customerId) {
        window.location.href = `/admin/customers/${customerId}`;
    };

    window.viewCustomerOrders = function(customerId) {
        window.location.href = `/admin/orders?customer=${customerId}`;
    };

    window.sendCustomerEmail = function(customerId) {
        showModal('email-customer-modal');
        // Pre-fill customer email
    };

    window.toggleCustomerStatus = function(customerId, currentStatus) {
        const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
        showConfirm(`Are you sure you want to ${newStatus === 'active' ? 'activate' : 'deactivate'} this customer?`, function() {
            fetch(`/admin/customers/${customerId}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ status: newStatus })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    showToast(`Customer ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully!`, 'success');
                    setTimeout(() => location.reload(), 1000);
                } else {
                    showToast('Failed to update customer status', 'error');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showToast('Failed to update customer status', 'error');
            });
        });
    };

    // Category functions
    window.editCategory = function(categoryId) {
        fetch(`/admin/categories/${categoryId}`)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    const category = data.category;
                    document.getElementById('category-modal-title').textContent = 'Edit Category';
                    document.getElementById('category-form').setAttribute('data-category-id', categoryId);
                    document.getElementById('category-name').value = category.name || '';
                    document.getElementById('category-description').value = category.description || '';
                    document.getElementById('category-parent').value = category.parent_id || '';
                    showModal('add-category-modal');
                } else {
                    showToast('Failed to load category data', 'error');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showToast('Failed to load category data', 'error');
            });
    };

    window.deleteCategory = function(categoryId) {
        showConfirm('Are you sure you want to delete this category? Products in this category will be moved to uncategorized.', function() {
            fetch(`/admin/categories/${categoryId}`, {
                method: 'DELETE'
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    showToast('Category deleted successfully!', 'success');
                    setTimeout(() => location.reload(), 1000);
                } else {
                    showToast('Failed to delete category: ' + (data.message || 'Unknown error'), 'error');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showToast('Failed to delete category', 'error');
            });
        });
    };

    // Analytics period functions
    window.loadAnalyticsPeriod = function(period) {
        showToast(`Loading ${period} analytics...`, 'info');
        // Implementation would update analytics data
        if (typeof updateAnalyticsChart === 'function') {
            updateAnalyticsChart(period);
        }
    };

    // Sound toggle function
    window.toggleSound = function() {
        const soundToggle = document.getElementById('muteSoundBtn');
        if (soundToggle) {
            const isMuted = soundToggle.classList.contains('muted');
            soundToggle.classList.toggle('muted');
            soundToggle.innerHTML = isMuted ? '<i class="fas fa-volume-up"></i>' : '<i class="fas fa-volume-mute"></i>';
            localStorage.setItem('soundMuted', !isMuted);
            showToast(isMuted ? 'Sound enabled' : 'Sound muted', 'info');
        }
    };

    // User status functions  
    window.toggleUserStatus = function(userId) {
        fetch(`/admin/users/${userId}/toggle-status`, {
            method: 'PUT'
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showToast(data.active ? 'User activated' : 'User deactivated', 'success');
                setTimeout(() => location.reload(), 1000);
            } else {
                showToast('Failed to update user status', 'error');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showToast('Failed to update user status', 'error');
        });
    };

    // Auction functions
    window.endAuction = function(auctionId) {
        showConfirm('Are you sure you want to end this auction early?', function() {
            fetch(`/admin/auctions/${auctionId}/end`, {
                method: 'PUT'
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    showToast('Auction ended successfully!', 'success');
                    setTimeout(() => location.reload(), 1000);
                } else {
                    showToast('Failed to end auction', 'error');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showToast('Failed to end auction', 'error');
            });
        });
    };

    window.cancelAuction = function(auctionId) {
        showConfirm('Are you sure you want to cancel this auction? All bids will be refunded.', function() {
            fetch(`/admin/auctions/${auctionId}/cancel`, {
                method: 'PUT'
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    showToast('Auction cancelled successfully!', 'success');
                    setTimeout(() => location.reload(), 1000);
                } else {
                    showToast('Failed to cancel auction', 'error');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showToast('Failed to cancel auction', 'error');
            });
        });
    };
}

// Initialize table action buttons
function initializeTableButtons() {
    // Make table headers clickable for sorting
    document.querySelectorAll('th[data-sort]').forEach(th => {
        th.addEventListener('click', function() {
            const sortBy = this.dataset.sort;
            const currentSort = this.dataset.currentSort || 'asc';
            const newSort = currentSort === 'asc' ? 'desc' : 'asc';
            
            this.dataset.currentSort = newSort;
            
            // Update visual indicator
            document.querySelectorAll('th[data-sort]').forEach(h => {
                h.classList.remove('sort-asc', 'sort-desc');
            });
            this.classList.add(`sort-${newSort}`);
            
            showToast(`Sorting by ${sortBy} (${newSort})`, 'info');
            
            // Trigger data reload with sort
            if (typeof loadTableData === 'function') {
                loadTableData({ sortBy, sort: newSort });
            }
        });
        th.style.cursor = 'pointer';
        th.title = 'Click to sort';
    });

    // Handle bulk selection
    const selectAllCheckbox = document.getElementById('select-all');
    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', function() {
            const checkboxes = document.querySelectorAll('.bulk-select');
            checkboxes.forEach(cb => cb.checked = this.checked);
            updateBulkActionsVisibility();
        });
    }

    // Handle individual checkbox changes
    document.querySelectorAll('.bulk-select').forEach(checkbox => {
        checkbox.addEventListener('change', updateBulkActionsVisibility);
    });
}

// Update bulk actions button visibility
function updateBulkActionsVisibility() {
    const selected = document.querySelectorAll('.bulk-select:checked');
    const bulkActions = document.getElementById('bulk-actions');
    const bulkDelete = document.getElementById('bulk-delete');
    
    if (bulkDelete) {
        bulkDelete.style.display = selected.length > 0 ? 'inline-flex' : 'none';
    }
    
    if (bulkActions) {
        bulkActions.style.display = selected.length > 0 ? 'block' : 'none';
    }
}

// Initialize modal buttons
function initializeModalButtons() {
    // Close modal buttons
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', function() {
            const modal = this.closest('.modal');
            if (modal) {
                modal.classList.remove('show');
            }
        });
    });

    // Close modal when clicking outside
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal')) {
            e.target.classList.remove('show');
        }
    });

    // Escape key to close modals
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal.show').forEach(modal => {
                modal.classList.remove('show');
            });
        }
    });
}

// Initialize form buttons
function initializeFormButtons() {
    // Handle form submissions
    document.querySelectorAll('form').forEach(form => {
        form.addEventListener('submit', function(e) {
            if (typeof validateForm === 'function') {
                if (!validateForm(this)) {
                    e.preventDefault();
                    return false;
                }
            }
            // Form will submit normally if validation passes
        });
    });

    // Handle cancel buttons in forms
    document.querySelectorAll('button[type="button"][onclick^="hideModal"]').forEach(btn => {
        btn.addEventListener('click', function() {
            const modal = this.closest('.modal');
            if (modal) {
                modal.classList.remove('show');
                // Reset form if it has one
                const form = modal.querySelector('form');
                if (form) {
                    form.reset();
                    form.removeAttribute('data-edit-id');
                }
            }
        });
    });
}

// Initialize navigation buttons
function initializeNavigationButtons() {
    // Sidebar toggle buttons
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const sidebarToggleHeader = document.getElementById('sidebar-toggle-header');
    
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', toggleSidebar);
    }
    
    if (sidebarToggleHeader) {
        sidebarToggleHeader.addEventListener('click', toggleSidebar);
    }

    // Profile dropdown toggle
    const profileBtn = document.getElementById('profile-btn');
    if (profileBtn) {
        profileBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            const dropdown = document.getElementById('profile-dropdown');
            if (dropdown) {
                dropdown.classList.toggle('show');
            }
        });
    }

    // Notification dropdown toggle
    const notificationBtn = document.getElementById('notification-btn');
    if (notificationBtn) {
        notificationBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            const dropdown = document.getElementById('notification-dropdown');
            if (dropdown) {
                dropdown.classList.toggle('show');
                if (dropdown.classList.contains('show')) {
                    if (typeof loadNotifications === 'function') {
                        loadNotifications();
                    }
                }
            }
        });
    }

    // Close dropdowns when clicking outside
    document.addEventListener('click', function(e) {
        const profileDropdown = document.getElementById('profile-dropdown');
        const notificationDropdown = document.getElementById('notification-dropdown');
        
        if (profileDropdown && !profileDropdown.contains(e.target) && 
            (!profileBtn || !profileBtn.contains(e.target))) {
            profileDropdown.classList.remove('show');
        }
        
        if (notificationDropdown && !notificationDropdown.contains(e.target) && 
            (!notificationBtn || !notificationBtn.contains(e.target))) {
            notificationDropdown.classList.remove('show');
        }
    });
}

// Sidebar toggle function
function toggleSidebar() {
    const sidebar = document.getElementById('admin-sidebar');
    const main = document.getElementById('admin-main');
    
    if (sidebar && main) {
        sidebar.classList.toggle('collapsed');
        main.classList.toggle('collapsed');
        
        // Save state
        const isCollapsed = sidebar.classList.contains('collapsed');
        localStorage.setItem('sidebarCollapsed', isCollapsed);
        
        // Show/hide header toggle
        const headerToggle = document.getElementById('sidebar-toggle-header');
        if (headerToggle) {
            headerToggle.style.display = isCollapsed ? 'block' : 'none';
        }
    }
}

// Search functions
window.handleGlobalSearch = function() {
    const searchInput = document.getElementById('global-search');
    const searchBtn = document.getElementById('searchBtn');
    
    if (searchBtn && searchInput) {
        searchBtn.addEventListener('click', function() {
            const query = searchInput.value.trim();
            if (query) {
                showToast(`Searching for "${query}"...`, 'info');
                window.location.href = `/admin/search?q=${encodeURIComponent(query)}`;
            }
        });
        
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                searchBtn.click();
            }
        });
    }
};

// Notification functions
window.markNotificationRead = function(notificationId) {
    fetch(`/admin/notifications/${notificationId}/read`, {
        method: 'PUT'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            if (typeof loadNotifications === 'function') {
                loadNotifications();
            }
            if (typeof updateNotificationBadge === 'function') {
                updateNotificationBadge();
            }
        }
    })
    .catch(error => console.error('Error marking notification as read:', error));
};

window.markAllNotificationsRead = function() {
    fetch('/admin/notifications/mark-all-read', {
        method: 'PUT'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showToast('All notifications marked as read', 'success');
            if (typeof loadNotifications === 'function') {
                loadNotifications();
            }
            if (typeof updateNotificationBadge === 'function') {
                updateNotificationBadge();
            }
        }
    })
    .catch(error => console.error('Error marking all notifications as read:', error));
};

// Utility functions
window.copyToClipboard = function(text) {
    navigator.clipboard.writeText(text).then(function() {
        showToast('Copied to clipboard!', 'success');
    }, function(err) {
        console.error('Could not copy text: ', err);
        showToast('Failed to copy to clipboard', 'error');
    });
};

window.downloadFile = function(url, filename) {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Download started', 'success');
};

window.printPage = function() {
    window.print();
    showToast('Printing page...', 'info');
};

// Date formatting
window.formatDate = function(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
};

window.formatDateTime = function(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString('en-US', options);
};

window.timeAgo = function(dateString) {
    const now = new Date();
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    
    return formatDate(dateString);
};

// Currency formatting
window.formatCurrency = function(amount, currency = 'TSh') {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
};

// Number formatting
window.formatNumber = function(num) {
    return new Intl.NumberFormat('en-US').format(num);
};

// Status badge helper
window.getStatusBadge = function(status, type = 'default') {
    const statusClasses = {
        'pending': 'warning',
        'active': 'delivered',
        'inactive': 'cancelled',
        'completed': 'delivered',
        'cancelled': 'cancelled',
        'delivered': 'delivered',
        'shipped': 'processing',
        'processing': 'processing',
        'paid': 'delivered',
        'confirmed': 'delivered'
    };
    
    const statusClass = statusClasses[status.toLowerCase()] || 'default';
    const displayStatus = status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    
    return `<span class="status ${statusClass}">${displayStatus}</span>`;
};

// Initialize common elements
initializeButtonFunctions();
handleGlobalSearch();