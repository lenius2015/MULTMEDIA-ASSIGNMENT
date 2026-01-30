// Admin Panel JavaScript

// Make functions globally available
window.showToast = function(message, type = 'info') {
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i class="fas fa-${getToastIcon(type)}"></i>
        <span>${message}</span>
    `;

    toastContainer.appendChild(toast);

    // Trigger animation
    setTimeout(() => toast.classList.add('show'), 100);

    // Auto remove after 5 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 5000);
};

window.showModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('show');
    }
};

window.hideModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('show');
    }
};

window.showConfirm = function(message, onConfirm, onCancel) {
    if (confirm(message)) {
        if (onConfirm) onConfirm();
    } else {
        if (onCancel) onCancel();
    }
};

function getToastIcon(type) {
    switch (type) {
        case 'success': return 'check-circle';
        case 'error': return 'exclamation-circle';
        case 'warning': return 'exclamation-triangle';
        default: return 'info-circle';
    }
}

document.addEventListener('DOMContentLoaded', function() {
    // Sidebar toggle functionality
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const sidebarToggleHeader = document.getElementById('sidebar-toggle-header');
    const adminSidebar = document.getElementById('admin-sidebar');
    const adminMain = document.getElementById('admin-main');

    function toggleSidebar() {
        adminSidebar.classList.toggle('collapsed');
        adminMain.classList.toggle('collapsed');

        // Save sidebar state to localStorage
        const isCollapsed = adminSidebar.classList.contains('collapsed');
        localStorage.setItem('sidebarCollapsed', isCollapsed);

        // Show/hide header toggle button
        if (sidebarToggleHeader) {
            sidebarToggleHeader.style.display = isCollapsed ? 'block' : 'none';
        }
    }

    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', toggleSidebar);
    }

    if (sidebarToggleHeader) {
        sidebarToggleHeader.addEventListener('click', toggleSidebar);
    }

    // Mobile sidebar toggle
    const mobileToggle = document.querySelector('.mobile-sidebar-toggle');
    if (mobileToggle) {
        mobileToggle.addEventListener('click', function() {
            adminSidebar.classList.toggle('mobile-open');
            adminMain.classList.toggle('sidebar-open');
        });
    }

    // Profile dropdown
    const profileBtn = document.getElementById('profile-btn');
    const profileDropdown = document.getElementById('profile-dropdown');

    if (profileBtn && profileDropdown) {
        profileBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            profileDropdown.classList.toggle('show');
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', function(e) {
            if (!profileBtn.contains(e.target) && !profileDropdown.contains(e.target)) {
                profileDropdown.classList.remove('show');
            }
        });
    }

    // Notification dropdown
    const notificationBtn = document.getElementById('notification-btn');
    const notificationDropdown = document.getElementById('notification-dropdown');
    const notificationBadge = document.getElementById('notification-badge');
    const notificationList = document.getElementById('notification-list');
    const markAllReadBtn = document.getElementById('mark-all-read');

    if (notificationBtn && notificationDropdown) {
        notificationBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            notificationDropdown.classList.toggle('show');

            // Load notifications if dropdown is shown
            if (notificationDropdown.classList.contains('show')) {
                loadNotifications();
            }
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', function(e) {
            if (!notificationBtn.contains(e.target) && !notificationDropdown.contains(e.target)) {
                notificationDropdown.classList.remove('show');
            }
        });
    }

    // Mark all notifications as read
    if (markAllReadBtn) {
        markAllReadBtn.addEventListener('click', function() {
            fetch('/admin/notifications/mark-all-read', {
                method: 'PUT'
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    loadNotifications();
                    updateNotificationBadge();
                }
            })
            .catch(error => console.error('Error marking all read:', error));
        });
    }

    // Load notifications
    function loadNotifications() {
        if (!notificationList) return;

        notificationList.innerHTML = `
            <div class="notification-item loading">
                <i class="fas fa-spinner fa-spin"></i>
                Loading notifications...
            </div>
        `;

        fetch('/admin/notifications/recent?limit=10')
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    displayNotifications(data.notifications);
                } else {
                    notificationList.innerHTML = `
                        <div class="notification-item">
                            <div class="title">Error loading notifications</div>
                        </div>
                    `;
                }
            })
            .catch(error => {
                console.error('Error loading notifications:', error);
                notificationList.innerHTML = `
                    <div class="notification-item">
                        <div class="title">Error loading notifications</div>
                    </div>
                `;
            });
    }

    // Display notifications
    function displayNotifications(notifications) {
        if (!notificationList) return;

        if (!notifications || notifications.length === 0) {
            notificationList.innerHTML = `
                <div class="notification-item">
                    <div class="title">No notifications</div>
                    <div class="message">You're all caught up!</div>
                </div>
            `;
            return;
        }

        let html = '';
        notifications.forEach(notification => {
            const isUnread = !notification.is_read;
            const timeAgo = getTimeAgo(new Date(notification.created_at));

            html += `
                <div class="notification-item ${isUnread ? 'unread' : ''}" onclick="markNotificationRead(${notification.id})">
                    <div class="title">${notification.title}</div>
                    <div class="message">${notification.message}</div>
                    <div class="time">${timeAgo}</div>
                </div>
            `;
        });

        notificationList.innerHTML = html;
    }

    // Mark notification as read
    window.markNotificationRead = function(notificationId) {
        fetch(`/admin/notifications/${notificationId}/read`, {
            method: 'PUT'
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                loadNotifications();
                updateNotificationBadge();
            }
        })
        .catch(error => console.error('Error marking read:', error));
    };

    // Update notification badge
    window.updateNotificationBadge = function() {
        fetch('/admin/notifications/recent?limit=1')
            .then(response => response.json())
            .then(data => {
                if (data.success && notificationBadge) {
                    const count = data.unreadCount;
                    notificationBadge.textContent = count;
                    notificationBadge.style.display = count > 0 ? 'block' : 'none';
                }
            })
            .catch(error => console.error('Error updating badge:', error));
    };

    // Get time ago string
    function getTimeAgo(date) {
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);

        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        return `${Math.floor(diffInSeconds / 86400)}d ago`;
    }

    // Global search
    const globalSearch = document.getElementById('global-search');
    if (globalSearch) {
        globalSearch.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                const query = e.target.value.trim();
                if (query) {
                    // Search across products, orders, users
                    window.location.href = `/admin/search?q=${encodeURIComponent(query)}`;
                }
            }
        });
    }

    // Modal functionality
    // Close modal when clicking outside
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal')) {
            e.target.classList.remove('show');
        }
    });

    // Modal close buttons
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', function() {
            const modal = this.closest('.modal');
            if (modal) {
                modal.classList.remove('show');
            }
        });
    });

    // Form validation
    window.validateForm = function(form) {
        const inputs = form.querySelectorAll('input[required], select[required], textarea[required]');
        let isValid = true;

        inputs.forEach(input => {
            if (!input.value.trim()) {
                input.classList.add('error');
                isValid = false;
            } else {
                input.classList.remove('error');
            }
        });

        return isValid;
    };

    // Initialize notification badge
    if (notificationBadge) {
        updateNotificationBadge();
    }

    // Close dropdowns when clicking outside
    document.addEventListener('click', function(e) {
        // Close notification dropdown
        if (notificationBtn && notificationDropdown && 
            !notificationBtn.contains(e.target) && !notificationDropdown.contains(e.target)) {
            notificationDropdown.classList.remove('show');
        }
        
        // Close profile dropdown
        if (profileBtn && profileDropdown && 
            !profileBtn.contains(e.target) && !profileDropdown.contains(e.target)) {
            profileDropdown.classList.remove('show');
        }
    });
});

    // Analytics period buttons
    const analyticsButtons = document.querySelectorAll('.admin-dashboard .btn-secondary, .admin-dashboard .btn-primary');
    analyticsButtons.forEach(btn => {
      if (btn.textContent.trim() === 'Daily' || btn.textContent.trim() === 'Weekly' || btn.textContent.trim() === 'Monthly') {
        btn.addEventListener('click', function() {
          // Remove active class from all buttons in the group
          const buttonGroup = this.parentElement.querySelectorAll('.btn');
          buttonGroup.forEach(b => {
            b.classList.remove('btn-primary');
            b.classList.add('btn-secondary');
          });
          
          // Add active class to clicked button
          this.classList.remove('btn-secondary');
          this.classList.add('btn-primary');
          
          const period = this.textContent.trim();
          showToast(`Loading ${period} analytics data...`, 'info');
          
          // Trigger analytics reload with new period
          if (typeof loadAnalytics === 'function') {
            loadAnalytics(period.toLowerCase());
          }
        });
      }
    });
    document.querySelectorAll('.admin-table th[data-sort]').forEach(th => {
        th.addEventListener('click', function() {
            const sortBy = this.dataset.sort;
            console.log('Sorting by:', sortBy);
            // Implement sorting logic here
        });
    });

    // Bulk actions (placeholder)
    const bulkSelectAll = document.getElementById('select-all');
    if (bulkSelectAll) {
        bulkSelectAll.addEventListener('change', function() {
            const checkboxes = document.querySelectorAll('.bulk-select');
            checkboxes.forEach(cb => cb.checked = this.checked);
        });
    }

    // Real-time updates simulation
    function simulateRealTimeUpdates() {
        // Update notification badge every 30 seconds
        setInterval(() => {
            updateNotificationBadge();
        }, 30000); // Every 30 seconds
    }

    // Keyboard navigation
    document.addEventListener('keydown', function(e) {
        // Ctrl/Cmd + B to toggle sidebar
        if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
            e.preventDefault();
            if (sidebarToggle) sidebarToggle.click();
        }

        // Escape to close modals
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal.show').forEach(modal => {
                modal.classList.remove('show');
            });
        }
    });

    // Dark/Light mode toggle (placeholder)
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', function() {
            document.body.classList.toggle('dark-mode');
            const isDark = document.body.classList.contains('dark-mode');
            localStorage.setItem('darkMode', isDark);
        });
    }

    // Load saved preferences
    function loadPreferences() {
        // Sidebar state
        const sidebarCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
        if (sidebarCollapsed) {
            adminSidebar.classList.add('collapsed');
            adminMain.classList.add('collapsed');
            if (sidebarToggleHeader) {
                sidebarToggleHeader.style.display = 'block';
            }
        }

        // Dark mode
        const darkMode = localStorage.getItem('darkMode') === 'true';
        if (darkMode) {
            document.body.classList.add('dark-mode');
        }
    }

    // Initialize
    loadPreferences();
    updateNotificationBadge(); // Update notification badge on load
    simulateRealTimeUpdates();

    // Expose functions globally for inline event handlers
    window.showModal = showModal;
    window.hideModal = hideModal;
    window.showToast = showToast;
    window.showConfirm = showConfirm;
    window.validateForm = validateForm;
});