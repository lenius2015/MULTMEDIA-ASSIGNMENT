-- Database schema for delivery requests and invoices

-- Create delivery_requests table
CREATE TABLE IF NOT EXISTS delivery_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    delivery_address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    postal_code VARCHAR(20),
    country VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    special_instructions TEXT,
    delivery_date DATE NOT NULL,
    time_slot VARCHAR(20) NOT NULL,
    package_weight DECIMAL(10,2),
    package_length DECIMAL(10,2),
    package_width DECIMAL(10,2),
    package_height DECIMAL(10,2),
    package_type VARCHAR(50) DEFAULT 'standard',
    insurance_type VARCHAR(20) DEFAULT 'no',
    insurance_fee DECIMAL(10,2) DEFAULT 0,
    courier_type VARCHAR(50) NOT NULL,
    courier_fee DECIMAL(10,2) NOT NULL,
    gift_wrap BOOLEAN DEFAULT FALSE,
    fragile_handling BOOLEAN DEFAULT FALSE,
    cash_on_delivery BOOLEAN DEFAULT FALSE,
    total_value DECIMAL(10,2) NOT NULL,
    total_cost DECIMAL(10,2) NOT NULL,
    status ENUM('pending', 'processing', 'in_transit', 'delivered', 'cancelled') DEFAULT 'pending',
    status_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create delivery_items table
CREATE TABLE IF NOT EXISTS delivery_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    delivery_id INT NOT NULL,
    product_id INT,
    product_name VARCHAR(255) NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    discount DECIMAL(5,2) DEFAULT 0,
    amount DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (delivery_id) REFERENCES delivery_requests(id) ON DELETE CASCADE
);

-- Create invoices table
CREATE TABLE IF NOT EXISTS invoices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    company_address TEXT,
    company_phone VARCHAR(20),
    company_email VARCHAR(255),
    company_tax_id VARCHAR(100),
    company_website VARCHAR(255),
    customer_name VARCHAR(255) NOT NULL,
    customer_address TEXT,
    customer_contact VARCHAR(255),
    customer_email VARCHAR(255),
    invoice_number VARCHAR(100) NOT NULL,
    invoice_date DATE NOT NULL,
    due_date DATE NOT NULL,
    payment_terms TEXT,
    notes TEXT,
    subtotal DECIMAL(10,2) NOT NULL,
    discount DECIMAL(10,2) DEFAULT 0,
    tax DECIMAL(10,2) DEFAULT 0,
    total DECIMAL(10,2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'TSH',
    status ENUM('draft', 'sent', 'paid', 'overdue', 'cancelled') DEFAULT 'draft',
    status_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create invoice_items table
CREATE TABLE IF NOT EXISTS invoice_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    invoice_id INT NOT NULL,
    description TEXT NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX idx_delivery_requests_user_id ON delivery_requests(user_id);
CREATE INDEX idx_delivery_requests_status ON delivery_requests(status);
CREATE INDEX idx_delivery_requests_date ON delivery_requests(delivery_date);
CREATE INDEX idx_delivery_items_delivery_id ON delivery_items(delivery_id);

CREATE INDEX idx_invoices_user_id ON invoices(user_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_date ON invoices(invoice_date);
CREATE INDEX idx_invoice_items_invoice_id ON invoice_items(invoice_id);

-- Insert sample data for testing
INSERT INTO delivery_requests (user_id, delivery_address, city, postal_code, country, phone, delivery_date, time_slot, package_weight, package_length, package_width, package_height, package_type, insurance_type, courier_type, courier_fee, total_value, total_cost, status) VALUES
(1, '123 Main Street, Dar es Salaam', 'Dar es Salaam', '12345', 'Tanzania', '+255 712 345 678', '2024-01-15', '09:00-12:00', 2.5, 30, 20, 15, 'standard', 'basic', 'express', 10000, 50000, 61000, 'pending'),
(2, '456 Secondary Avenue, Mwanza', 'Mwanza', '67890', 'Tanzania', '+255 713 456 789', '2024-01-16', '12:00-15:00', 1.2, 25, 18, 12, 'fragile', 'premium', 'standard', 5000, 25000, 31250, 'processing'),
(3, '789 Third Road, Arusha', 'Arusha', '54321', 'Tanzania', '+255 714 567 890', '2024-01-17', '15:00-18:00', 5.0, 40, 30, 20, 'documents', 'no', 'express', 10000, 15000, 25000, 'in_transit');

INSERT INTO delivery_items (delivery_id, product_id, product_name, quantity, unit_price, discount, amount) VALUES
(1, 1, 'Smartphone X', 1, 50000, 0, 50000),
(2, 2, 'Laptop Pro', 1, 25000, 0, 25000),
(3, 3, 'Wireless Headphones', 2, 7500, 0, 15000);

INSERT INTO invoices (user_id, company_name, company_address, company_phone, company_email, customer_name, customer_address, customer_email, invoice_number, invoice_date, due_date, payment_terms, subtotal, discount, tax, total, currency, status) VALUES
(1, 'OMUNJU SHOPPERS', '123 Business Street, Dar es Salaam', '+255 123 456 789', 'info@omunju.com', 'John Doe', '123 Main Street, Dar es Salaam', 'john@example.com', 'INV-001', '2024-01-10', '2024-02-10', 'Net 30 days', 50000, 0, 0, 50000, 'TSH', 'sent'),
(2, 'OMUNJU SHOPPERS', '123 Business Street, Dar es Salaam', '+255 123 456 789', 'info@omunju.com', 'Jane Smith', '456 Secondary Avenue, Mwanza', 'jane@example.com', 'INV-002', '2024-01-11', '2024-02-11', 'Net 30 days', 25000, 5000, 0, 20000, 'TSH', 'draft'),
(3, 'OMUNJU SHOPPERS', '123 Business Street, Dar es Salaam', '+255 123 456 789', 'info@omunju.com', 'Bob Johnson', '789 Third Road, Arusha', 'bob@example.com', 'INV-003', '2024-01-12', '2024-02-12', 'Net 30 days', 15000, 0, 1500, 16500, 'TSH', 'paid');

INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, amount) VALUES
(1, 'Smartphone X', 1, 50000, 50000),
(2, 'Laptop Pro', 1, 25000, 25000),
(3, 'Wireless Headphones', 2, 7500, 15000);