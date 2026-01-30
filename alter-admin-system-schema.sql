-- Enhanced Admin System with Roles and Permissions

-- Admin Roles Table
CREATE TABLE IF NOT EXISTS admin_roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    display_name VARCHAR(255) NOT NULL,
    description TEXT,
    is_super_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_name (name),
    INDEX idx_super_admin (is_super_admin)
);

-- Admin Permissions Table
CREATE TABLE IF NOT EXISTS admin_permissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL UNIQUE,
    display_name VARCHAR(255) NOT NULL,
    description TEXT,
    module VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_module (module),
    INDEX idx_name (name)
);

-- Role Permissions Junction Table
CREATE TABLE IF NOT EXISTS role_permissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    role_id INT NOT NULL,
    permission_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_role_permission (role_id, permission_id),
    FOREIGN KEY (role_id) REFERENCES admin_roles(id) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES admin_permissions(id) ON DELETE CASCADE,
    INDEX idx_role_id (role_id),
    INDEX idx_permission_id (permission_id)
);

-- Update admins table to include role
ALTER TABLE admins
ADD COLUMN role_id INT NULL AFTER status,
ADD COLUMN profile_picture VARCHAR(500) NULL AFTER password,
ADD COLUMN phone VARCHAR(20) NULL AFTER email,
ADD COLUMN last_activity TIMESTAMP NULL AFTER last_login,
ADD COLUMN created_by INT NULL AFTER updated_at,
ADD COLUMN updated_by INT NULL AFTER created_by,
ADD FOREIGN KEY (role_id) REFERENCES admin_roles(id) ON DELETE SET NULL,
ADD INDEX idx_role_id (role_id),
ADD INDEX idx_status (status),
ADD INDEX idx_created_by (created_by);

-- Admin Activity Logs Table
CREATE TABLE IF NOT EXISTS admin_activity_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    admin_id INT NOT NULL,
    action VARCHAR(255) NOT NULL,
    description TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_admin_id (admin_id),
    INDEX idx_action (action),
    INDEX idx_created_at (created_at),
    FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE
);

-- Insert default permissions
INSERT INTO admin_permissions (name, display_name, description, module) VALUES
-- Dashboard permissions
('dashboard.view', 'View Dashboard', 'Access to admin dashboard', 'dashboard'),

-- User management permissions
('users.view', 'View Users', 'View user list and details', 'users'),
('users.create', 'Create Users', 'Create new user accounts', 'users'),
('users.edit', 'Edit Users', 'Edit user information', 'users'),
('users.delete', 'Delete Users', 'Delete user accounts', 'users'),
('users.block', 'Block Users', 'Block/unblock user accounts', 'users'),

-- Product management permissions
('products.view', 'View Products', 'View product list and details', 'products'),
('products.create', 'Create Products', 'Add new products', 'products'),
('products.edit', 'Edit Products', 'Edit product information', 'products'),
('products.delete', 'Delete Products', 'Delete products', 'products'),

-- Order management permissions
('orders.view', 'View Orders', 'View order list and details', 'orders'),
('orders.edit', 'Edit Orders', 'Modify order status and details', 'orders'),
('orders.delete', 'Delete Orders', 'Delete orders', 'orders'),

-- Category management permissions
('categories.view', 'View Categories', 'View category list', 'categories'),
('categories.create', 'Create Categories', 'Add new categories', 'categories'),
('categories.edit', 'Edit Categories', 'Edit category information', 'categories'),
('categories.delete', 'Delete Categories', 'Delete categories', 'categories'),

-- Admin management permissions
('admins.view', 'View Admins', 'View admin user list', 'admins'),
('admins.create', 'Create Admins', 'Create new admin accounts', 'admins'),
('admins.edit', 'Edit Admins', 'Edit admin information and roles', 'admins'),
('admins.delete', 'Delete Admins', 'Delete admin accounts', 'admins'),
('admins.block', 'Block Admins', 'Block/unblock admin accounts', 'admins'),

-- Role management permissions
('roles.view', 'View Roles', 'View role list and permissions', 'roles'),
('roles.create', 'Create Roles', 'Create new admin roles', 'roles'),
('roles.edit', 'Edit Roles', 'Edit role permissions', 'roles'),
('roles.delete', 'Delete Roles', 'Delete admin roles', 'roles'),

-- Content management permissions
('content.view', 'View Content', 'View pages and content', 'content'),
('content.edit', 'Edit Content', 'Edit website content', 'content'),

-- Analytics permissions
('analytics.view', 'View Analytics', 'Access to analytics and reports', 'analytics'),

-- Settings permissions
('settings.view', 'View Settings', 'View system settings', 'settings'),
('settings.edit', 'Edit Settings', 'Modify system settings', 'settings'),

-- Logs permissions
('logs.view', 'View Logs', 'Access to system logs', 'logs'),
('logs.delete', 'Delete Logs', 'Delete log entries', 'logs'),

-- Conversations/Chat permissions
('conversations.view', 'View Conversations', 'Access to user conversations', 'conversations'),
('conversations.reply', 'Reply to Conversations', 'Send messages in conversations', 'conversations'),
('conversations.delete', 'Delete Conversations', 'Delete conversation threads', 'conversations');

-- Insert default roles
INSERT INTO admin_roles (name, display_name, description, is_super_admin) VALUES
('super_admin', 'Super Administrator', 'Full system access with all permissions', TRUE),
('admin', 'Administrator', 'General admin with most permissions', FALSE),
('moderator', 'Moderator', 'Limited admin for content and user management', FALSE),
('support', 'Support Agent', 'Customer support and conversation management', FALSE);

-- Assign all permissions to super admin role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM admin_roles r
CROSS JOIN admin_permissions p
WHERE r.name = 'super_admin';

-- Assign common permissions to regular admin role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM admin_roles r
CROSS JOIN admin_permissions p
WHERE r.name = 'admin'
AND p.name NOT IN (
    'roles.create', 'roles.edit', 'roles.delete',
    'admins.create', 'admins.edit', 'admins.delete', 'admins.block',
    'settings.edit'
);

-- Assign limited permissions to moderator role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM admin_roles r
CROSS JOIN admin_permissions p
WHERE r.name = 'moderator'
AND p.name IN (
    'dashboard.view', 'users.view', 'users.edit', 'users.block',
    'products.view', 'products.edit', 'orders.view', 'orders.edit',
    'content.view', 'content.edit', 'logs.view', 'conversations.view', 'conversations.reply'
);

-- Assign support permissions to support role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM admin_roles r
CROSS JOIN admin_permissions p
WHERE r.name = 'support'
AND p.name IN (
    'dashboard.view', 'users.view', 'orders.view', 'logs.view',
    'conversations.view', 'conversations.reply'
);

-- Update existing admin to be super admin
UPDATE admins SET role_id = (SELECT id FROM admin_roles WHERE name = 'super_admin' LIMIT 1) WHERE email = 'admin@omunjushoppers.com';