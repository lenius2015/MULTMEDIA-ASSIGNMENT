# OMUNJU SHOPPERS - Complete Setup Guide

This guide will walk you through setting up the e-commerce application from scratch.

## 📋 Table of Contents
1. [System Requirements](#system-requirements)
2. [Installation Steps](#installation-steps)
3. [Database Setup](#database-setup)
4. [Configuration](#configuration)
5. [Running the Application](#running-the-application)
6. [Testing the Application](#testing-the-application)
7. [Common Issues](#common-issues)

## 🖥️ System Requirements

### Required Software
- **Node.js**: Version 14.x or higher
  - Download from: https://nodejs.org/
  - Verify installation: `node --version`

- **MySQL or MariaDB**: Version 5.7 or higher
  - MySQL: https://dev.mysql.com/downloads/
  - MariaDB: https://mariadb.org/download/
  - Verify installation: `mysql --version`

- **npm**: Comes with Node.js
  - Verify installation: `npm --version`

### Optional Tools
- **Git**: For version control
- **Postman**: For API testing
- **MySQL Workbench**: For database management
- **VS Code**: Recommended code editor

## 🚀 Installation Steps

### Step 1: Extract/Clone the Project
```bash
# If you have the zip file, extract it
# Or if using git:
git clone <repository-url>
cd e-commerce-website
```

### Step 2: Install Node.js Dependencies
```bash
npm install
```

This will install all required packages:
- express
- ejs
- mysql2
- bcryptjs
- express-session
- body-parser
- dotenv
- nodemon (for development)

### Step 3: Verify Installation
```bash
npm list
```

You should see all dependencies listed without errors.

## 🗄️ Database Setup

### Option 1: Using MySQL Command Line

#### Step 1: Start MySQL Service
**Windows:**
```bash
net start MySQL80
```

**macOS/Linux:**
```bash
sudo systemctl start mysql
# or
sudo service mysql start
```

#### Step 2: Login to MySQL
```bash
mysql -u root -p
```
Enter your MySQL root password when prompted.

#### Step 3: Create Database and Import Schema
```sql
-- Create the database
CREATE DATABASE IF NOT EXISTS ecommerce;

-- Exit MySQL
exit;
```

#### Step 4: Import the SQL File
```bash
mysql -u root -p ecommerce < db_init.sql
```

### Option 2: Using MySQL Workbench

1. Open MySQL Workbench
2. Connect to your local MySQL server
3. Click on "Server" → "Data Import"
4. Select "Import from Self-Contained File"
5. Browse and select `db_init.sql`
6. Under "Default Target Schema", select "New..." and name it `ecommerce`
7. Click "Start Import"

### Option 3: Using phpMyAdmin

1. Open phpMyAdmin in your browser
2. Click "New" to create a new database
3. Name it `ecommerce` and click "Create"
4. Select the `ecommerce` database
5. Click "Import" tab
6. Choose the `db_init.sql` file
7. Click "Go"

### Verify Database Setup

Login to MySQL and verify:
```sql
USE ecommerce;
SHOW TABLES;
```

You should see these tables:
- users
- products
- cart
- wishlist
- orders
- order_items
- notifications
- contact_messages
- partner_links

## ⚙️ Configuration

### Step 1: Create Environment File

Create a file named `.env` in the root directory:

```env
# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=ecommerce

# Server Configuration
PORT=3000
NODE_ENV=development

# Session Configuration
SESSION_SECRET=your_secret_key_here_change_this_to_something_secure_and_random
```

### Step 2: Update Database Credentials

Replace the following in `.env`:
- `DB_PASSWORD`: Your MySQL root password
- `SESSION_SECRET`: Generate a random string (at least 32 characters)

**Generate a secure session secret:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Step 3: Verify Configuration

Check that [`config.js`](config.js:1-15) is reading from `.env` correctly.

## 🏃 Running the Application

### Development Mode (Recommended for Testing)

This mode automatically restarts the server when you make changes:

```bash
npm run dev
```

You should see:
```
Server running on http://localhost:3000
```

### Production Mode

```bash
npm start
```

### Verify Server is Running

Open your browser and navigate to:
```
http://localhost:3000
```

You should see the OMUNJU SHOPPERS home page.

## 🧪 Testing the Application

### 1. Test Guest User Flow

#### Browse Products
1. Open `http://localhost:3000`
2. You should see the home page with product categories
3. Scroll down to view products
4. Try the search and filter features

#### Try to Buy (Should Redirect to Login)
1. Click "Buy Now" on any product
2. You should be redirected to the login page
3. Notice the "Register Now" link

### 2. Test User Registration

#### Create New Account
1. Go to `http://localhost:3000/signup`
2. Fill in the registration form:
   - Full Name: Test User
   - Email: test@example.com
   - Password: test123
   - Confirm Password: test123
3. Check "I agree to Terms & Conditions"
4. Click "Create Account"
5. You should be redirected to the dashboard

### 3. Test User Login

#### Login with Existing Account
1. Logout if logged in
2. Go to `http://localhost:3000/login`
3. Enter credentials:
   - Email: test@example.com
   - Password: test123
4. Click "Login"
5. You should be redirected to the dashboard

### 4. Test Dashboard Features

#### View Dashboard
1. After login, you should see:
   - Welcome message with your name
   - Quick stats (orders, cart items, notifications)
   - New Arrivals section
   - Hot Deals section
   - All Products section

#### Test Navigation
1. Click on the user icon (top right)
2. You should see user menu with options:
   - My Profile
   - My Orders
   - Shopping Cart
   - Logout

#### Test Catalog
1. Click the catalog icon (grid icon)
2. Browse different categories
3. Click on a category to filter products

#### Test Notifications
1. Click the bell icon
2. View notifications
3. Check the notification badge count

### 5. Test Shopping Features

#### Add to Cart
1. Browse products on the dashboard
2. Click "Buy Now" on any product
3. You should see a success message
4. Cart count should increase

#### View Cart
1. Click user icon → Shopping Cart
2. View cart items
3. Update quantities
4. Remove items

#### Place Order
1. Add items to cart
2. Proceed to checkout
3. Enter shipping address
4. Confirm order
5. Check order in "My Orders"

### 6. Test Profile Management

#### Update Profile
1. Go to Profile page
2. Click "Personal Info" tab
3. Update your information:
   - Name
   - Email
   - Phone
   - Address
4. Click "Save Changes"

#### Change Password
1. Go to Profile page
2. Click "Change Password" tab
3. Enter:
   - Current password
   - New password
   - Confirm new password
4. Click "Update Password"

#### View Orders
1. Go to Profile page
2. Click "My Orders" tab
3. View your order history

### 7. Test Contact Form

1. Go to `http://localhost:3000/contact`
2. Fill in the contact form:
   - Name
   - Email
   - Subject
   - Message
3. Click "Send Message"
4. You should see a success message

### 8. Test Chatbot

1. On any page, look for the chat icon (bottom right)
2. Click to open the chatbot
3. Try these questions:
   - "Hello"
   - "Tell me about products"
   - "What are your prices?"
   - "How does shipping work?"
   - "What is your return policy?"

### 9. Test Search and Filters

#### Search Products
1. Go to dashboard
2. Use the search box
3. Type product names (e.g., "jacket", "jeans")
4. Results should filter in real-time

#### Filter by Category
1. Use the category dropdown
2. Select different categories
3. Products should filter accordingly

#### Sort Products
1. Use the sort dropdown
2. Try different sorting options:
   - Newest First
   - Price: Low to High
   - Price: High to Low
   - Highest Discount

### 10. Test Responsive Design

#### Desktop View
- Open in full browser window
- All features should be accessible

#### Mobile View
1. Open browser DevTools (F12)
2. Toggle device toolbar
3. Select a mobile device
4. Test:
   - Navigation menu (hamburger)
   - Product cards
   - Forms
   - Modals

## 🐛 Common Issues and Solutions

### Issue 1: Cannot Connect to Database

**Error:** `ER_ACCESS_DENIED_ERROR` or `ECONNREFUSED`

**Solutions:**
1. Verify MySQL is running:
   ```bash
   # Windows
   net start MySQL80
   
   # macOS/Linux
   sudo systemctl status mysql
   ```

2. Check database credentials in `.env`
3. Test MySQL connection:
   ```bash
   mysql -u root -p
   ```

4. Verify database exists:
   ```sql
   SHOW DATABASES;
   ```

### Issue 2: Port 3000 Already in Use

**Error:** `EADDRINUSE: address already in use :::3000`

**Solutions:**
1. Change port in `.env`:
   ```env
   PORT=3001
   ```

2. Or kill the process using port 3000:
   ```bash
   # Windows
   netstat -ano | findstr :3000
   taskkill /PID <PID> /F
   
   # macOS/Linux
   lsof -ti:3000 | xargs kill -9
   ```

### Issue 3: Module Not Found

**Error:** `Cannot find module 'express'`

**Solution:**
```bash
# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Issue 4: Session Not Persisting

**Problem:** User gets logged out on page refresh

**Solutions:**
1. Check `SESSION_SECRET` is set in `.env`
2. Clear browser cookies
3. Restart the server
4. Check session configuration in [`server.js`](server.js:19-25)

### Issue 5: Products Not Loading

**Problem:** Products section shows "Loading..." forever

**Solutions:**
1. Check browser console for errors (F12)
2. Verify database has products:
   ```sql
   SELECT * FROM products;
   ```
3. Check API endpoint:
   ```
   http://localhost:3000/api/products
   ```
4. Verify [`routes/products.js`](routes/products.js:1-150) is properly imported in [`server.js`](server.js:1-40)

### Issue 6: CSS Not Loading

**Problem:** Page has no styling

**Solutions:**
1. Verify files exist in `public/` folder
2. Check browser console for 404 errors
3. Clear browser cache (Ctrl+Shift+Delete)
4. Verify static file middleware in [`server.js`](server.js:16-16):
   ```javascript
   app.use(express.static(path.join(__dirname, 'public')));
   ```

### Issue 7: Cannot Register/Login

**Problem:** Registration or login fails

**Solutions:**
1. Check browser console for errors
2. Verify bcryptjs is installed:
   ```bash
   npm list bcryptjs
   ```
3. Check database users table:
   ```sql
   SELECT * FROM users;
   ```
4. Test API endpoint directly:
   ```bash
   curl -X POST http://localhost:3000/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{"name":"Test","email":"test@test.com","password":"test123"}'
   ```

## 📊 Verify Complete Setup

Run through this checklist:

- [ ] Node.js installed and working
- [ ] MySQL installed and running
- [ ] Database `ecommerce` created
- [ ] All tables created (9 tables)
- [ ] Sample data inserted
- [ ] `.env` file configured
- [ ] Dependencies installed (`node_modules` exists)
- [ ] Server starts without errors
- [ ] Home page loads at `http://localhost:3000`
- [ ] Can register a new user
- [ ] Can login with registered user
- [ ] Dashboard loads after login
- [ ] Products display correctly
- [ ] Can add products to cart
- [ ] Profile page works
- [ ] Contact form works
- [ ] Chatbot responds
- [ ] Notifications load
- [ ] Can logout successfully

## 🎉 Success!

If all tests pass, your e-commerce application is fully set up and ready to use!

## 📞 Need Help?

If you encounter issues not covered in this guide:

1. Check the main [`README.md`](README.md:1-300) for additional information
2. Review error messages in:
   - Browser console (F12)
   - Terminal/Command Prompt
   - MySQL error logs
3. Verify all files are in the correct locations
4. Ensure all dependencies are installed

## 🚀 Next Steps

1. Customize the application:
   - Update branding and colors
   - Add your own products
   - Modify email addresses and contact info

2. Add more features:
   - Payment gateway integration
   - Email notifications
   - Product reviews
   - Advanced admin panel

3. Deploy to production:
   - Choose a hosting provider
   - Set up production database
   - Configure environment variables
   - Enable HTTPS

---

**Happy Coding! 🎊**
