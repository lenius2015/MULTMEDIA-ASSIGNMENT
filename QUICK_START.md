# 🚀 Quick Start Guide - OMUNJU SHOPPERS

Get your e-commerce application running in 5 minutes!

## ⚡ Prerequisites Check

Before starting, ensure you have:
- ✅ Node.js installed (v14+)
- ✅ MySQL or MariaDB installed and running
- ✅ A code editor (VS Code recommended)

## 🏃 Quick Setup (5 Steps)

### Step 1: Install Dependencies (1 minute)
```bash
npm install
```

### Step 2: Setup Database (2 minutes)

**Option A - Command Line:**
```bash
# Login to MySQL
mysql -u root -p

# Create database and import
CREATE DATABASE ecommerce;
exit;

# Import schema
mysql -u root -p ecommerce < db_init.sql
```

**Option B - MySQL Workbench:**
1. Open MySQL Workbench
2. Server → Data Import
3. Select `db_init.sql`
4. Create schema: `ecommerce`
5. Start Import

### Step 3: Configure Environment (30 seconds)

Create `.env` file:
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=ecommerce
PORT=3000
NODE_ENV=development
SESSION_SECRET=change_this_to_a_random_string
```

**Important**: Replace `your_mysql_password` with your actual MySQL password!

### Step 4: Start Server (10 seconds)
```bash
npm run dev
```

### Step 5: Open Browser (5 seconds)
```
http://localhost:3000
```

## 🎉 You're Done!

Your e-commerce application is now running!

## 🧪 Quick Test

### Test 1: Browse as Guest
1. Open `http://localhost:3000`
2. Scroll through products
3. Click "Buy Now" → Should redirect to login ✅

### Test 2: Create Account
1. Go to `http://localhost:3000/signup`
2. Register with:
   - Name: Test User
   - Email: test@example.com
   - Password: test123
3. Should redirect to dashboard ✅

### Test 3: Add to Cart
1. On dashboard, click "Buy Now" on any product
2. Should see success message ✅
3. Cart count should increase ✅

### Test 4: Try Chatbot
1. Click chat icon (bottom right)
2. Type "Hello"
3. Should get response ✅

## 🐛 Quick Troubleshooting

### Can't connect to database?
```bash
# Check MySQL is running
# Windows:
net start MySQL80

# Mac/Linux:
sudo systemctl start mysql
```

### Port 3000 in use?
Change in `.env`:
```env
PORT=3001
```

### Module not found?
```bash
rm -rf node_modules
npm install
```

## 📖 Need More Help?

- **Detailed Setup**: See [`SETUP_GUIDE.md`](SETUP_GUIDE.md:1-500)
- **Full Documentation**: See [`README.md`](README.md:1-300)
- **Project Details**: See [`PROJECT_SUMMARY.md`](PROJECT_SUMMARY.md:1-500)

## 🎯 What's Next?

1. **Explore Features**:
   - Browse products
   - Add to cart
   - Place orders
   - Edit profile
   - Try chatbot

2. **Customize**:
   - Update branding
   - Add your products
   - Modify colors

3. **Deploy**:
   - Choose hosting
   - Setup production DB
   - Configure domain

## 📞 Quick Links

- Home: `http://localhost:3000`
- Login: `http://localhost:3000/login`
- Signup: `http://localhost:3000/signup`
- Dashboard: `http://localhost:3000/dashboard`
- Profile: `http://localhost:3000/profile`
- Contact: `http://localhost:3000/contact`
- About: `http://localhost:3000/about`

## 🎊 Success Checklist

- [ ] Dependencies installed
- [ ] Database created
- [ ] `.env` configured
- [ ] Server running
- [ ] Home page loads
- [ ] Can register
- [ ] Can login
- [ ] Can add to cart
- [ ] Dashboard works
- [ ] Chatbot responds

---

**Happy Shopping! 🛍️**

*For detailed information, see the complete documentation files.*
