-- Initialize test database
USE testdb;

-- Create test tables
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert test data
INSERT INTO users (username, email) VALUES 
    ('john_doe', 'john@example.com'),
    ('jane_smith', 'jane@example.com'),
    ('admin_user', 'admin@example.com');

INSERT INTO products (name, price, description) VALUES 
    ('Test Product 1', 29.99, 'This is a test product for demonstration'),
    ('Test Product 2', 49.99, 'Another test product'),
    ('Test Product 3', 19.99, 'Third test product');

-- Create a view
CREATE VIEW user_summary AS 
SELECT username, email, created_at 
FROM users 
ORDER BY created_at DESC;