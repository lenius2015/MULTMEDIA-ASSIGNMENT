/**
 * Create Admin User Script
 * Run this to create or reset the admin user
 */

require('dotenv').config();
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');

async function createAdminUser() {
    let connection;

    try {
        // Create connection
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            port: parseInt(process.env.DB_PORT) || 3306,
            database: process.env.DB_NAME || 'ecommerce'
        });

        console.log('Connected to database');

        // Hash the password
        const hashedPassword = await bcrypt.hash('admin123', 10);
        console.log('Password hash created');

        // Create admin_roles table
        console.log('Creating admin_roles table...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS admin_roles (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(50) NOT NULL UNIQUE,
                display_name VARCHAR(100) NOT NULL,
                description TEXT,
                is_super_admin BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_name (name),
                INDEX idx_super_admin (is_super_admin)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        // Create admin_permissions table
        console.log('Creating admin_permissions table...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS admin_permissions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL UNIQUE,
                display_name VARCHAR(100) NOT NULL,
                description TEXT,
                module VARCHAR(50) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_name (name),
                INDEX idx_module (module)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        // Create role_permissions table
        console.log('Creating role_permissions table...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS role_permissions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                role_id INT NOT NULL,
                permission_id INT NOT NULL,
                UNIQUE KEY unique_role_permission (role_id, permission_id),
                FOREIGN KEY (role_id) REFERENCES admin_roles(id) ON DELETE CASCADE,
                FOREIGN KEY (permission_id) REFERENCES admin_permissions(id) ON DELETE CASCADE,
                INDEX idx_role_id (role_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        // Create admins table
        console.log('Creating admins table...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS admins (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                email VARCHAR(150) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                phone VARCHAR(20),
                profile_picture VARCHAR(500),
                status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
                role_id INT,
                last_login TIMESTAMP NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (role_id) REFERENCES admin_roles(id) ON DELETE SET NULL,
                INDEX idx_email (email),
                INDEX idx_status (status),
                INDEX idx_role_id (role_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        // Insert default roles
        console.log('Inserting admin roles...');
        await connection.query(`
            INSERT IGNORE INTO admin_roles (name, display_name, description, is_super_admin) VALUES
            ('super_admin', 'Super Administrator', 'Full system access with all permissions', TRUE),
            ('admin', 'Administrator', 'General admin with most permissions', FALSE)
        `);

        // Insert default permissions
        console.log('Inserting admin permissions...');
        await connection.query(`
            INSERT IGNORE INTO admin_permissions (name, display_name, description, module) VALUES
            ('dashboard.view', 'View Dashboard', 'Access to admin dashboard', 'dashboard'),
            ('orders.view', 'View Orders', 'View order list and details', 'orders'),
            ('orders.edit', 'Edit Orders', 'Update order status and details', 'orders'),
            ('products.view', 'View Products', 'View product list', 'products'),
            ('products.edit', 'Edit Products', 'Create and edit products', 'products'),
            ('users.view', 'View Users', 'View user list', 'users'),
            ('users.edit', 'Edit Users', 'Manage user accounts', 'users')
        `);

        // Get super admin role ID
        const [roleResult] = await connection.query("SELECT id FROM admin_roles WHERE name = 'super_admin'");
        const superAdminRoleId = roleResult[0]?.id;
        console.log('Super admin role ID:', superAdminRoleId);

        // Assign all permissions to super_admin
        const [perms] = await connection.query('SELECT id FROM admin_permissions');
        for (const perm of perms) {
            await connection.query(
                'INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)',
                [superAdminRoleId, perm.id]
            );
        }
        console.log('Permissions assigned to super admin');

        // Create admin user
        console.log('Creating admin user...');
        await connection.query(`
            INSERT INTO admins (name, email, password, role_id, status)
            VALUES ('Super Admin', 'admin@omunjushoppers.com', ?, ?, 'active')
            ON DUPLICATE KEY UPDATE password = VALUES(password), role_id = VALUES(role_id)
        `, [hashedPassword, superAdminRoleId]);

        console.log('\n=================================');
        console.log('Admin user created successfully!');
        console.log('=================================');
        console.log('Email: admin@omunjushoppers.com');
        console.log('Password: admin123');
        console.log('=================================\n');

        // Verify the user
        const [admin] = await connection.query(
            'SELECT id, name, email, status, role_id FROM admins WHERE email = ?',
            ['admin@omunjushoppers.com']
        );
        
        if (admin.length > 0) {
            console.log('Admin user verified in database:', admin[0]);
        }

    } catch (error) {
        console.error('Error creating admin user:', error);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

createAdminUser();
