# Smart ATM Cash Optimizer - Setup Guide

## 📋 Prerequisites

- Python 3.8 or higher
- Node.js 14 or higher
- Git

## 🚀 Quick Start (First Time Setup)

### Step 1: Clone the Repository

```bash
git clone https://github.com/bahldevraj/Smart-atm-cash-distribution.git
cd Smart-atm-cash-distribution
```

### Step 2: Backend Setup

```bash
cd backend

# Install Python dependencies
pip install -r requirements.txt

# Run the setup wizard (creates .env file)
python setup_wizard.py

# Initialize database and create root user
python setup_database.py
```

**The setup wizard will ask you for:**
- Root user name (your name)
- Root user email (your email)
- Root user password (choose a secure password)
- Email configuration (optional)

### Step 3: Frontend Setup

```bash
cd ../frontend/smart-atm-frontend

# Install dependencies
npm install
```

### Step 4: Start the Application

**Terminal 1 - Backend:**
```bash
cd backend
python app.py
```

**Terminal 2 - Frontend:**
```bash
cd frontend/smart-atm-frontend
npm start
```

The application will open at: `http://localhost:3000`

---

## 🔄 Setup on a New System

If you already have the project on Git and want to set it up on a different computer:

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd Smart-atm-cash-distribution
cd backend
pip install -r requirements.txt
```

### 2. Configure Your System

**Option A: Use Setup Wizard (Recommended)**
```bash
python setup_wizard.py
python setup_database.py
```

**Option B: Manual Configuration**
1. Copy `.env.example` to `.env`
2. Edit `.env` and fill in your details
3. Run `python setup_database.py`

### 3. Start the System

```bash
# Terminal 1 - Backend
cd backend
python app.py

# Terminal 2 - Frontend
cd frontend/smart-atm-frontend
npm install  # First time only
npm start
```

---

## 🔐 Security Notes

### What's Kept Private (Not in Git):

✅ `.env` file - Your personal configuration
✅ `*.db` files - Your database with user data
✅ `instance/` folder - Runtime database files
✅ Sensitive documentation

### What's Shared (In Git):

✅ Source code
✅ `.env.example` - Template for configuration
✅ Setup scripts
✅ Documentation

### Your Personal Data:

- Root user credentials are stored in **`.env`** (local only)
- Database is stored in **`backend/instance/smart_atm.db`** (local only)
- Each system you set up will have its own `.env` and database

---

## 📁 Configuration Files

### `.env` File Location
`backend/.env`

### Example .env Content
```env
SECRET_KEY=your-generated-secret-key
JWT_SECRET_KEY=your-generated-jwt-key
ROOT_USER_NAME=YourName
ROOT_USER_EMAIL=your@email.com
ROOT_USER_PASSWORD=your-secure-password
```

---

## 🔧 Common Issues

### Issue: "ModuleNotFoundError: No module named 'dotenv'"
**Solution:** 
```bash
pip install python-dotenv
```

### Issue: ".env file not found"
**Solution:** Run the setup wizard:
```bash
python setup_wizard.py
```

### Issue: "Database not initialized"
**Solution:** Run database setup:
```bash
python setup_database.py
```

### Issue: Can't login with root user
**Solution:** Check your `.env` file has the correct credentials you set during setup

---

## 📊 Project Structure

```
Smart-atm-cash-distribution/
├── backend/
│   ├── .env                    # Your config (not in Git)
│   ├── .env.example           # Template (in Git)
│   ├── setup_wizard.py        # Initial setup script
│   ├── setup_database.py      # Database initialization
│   ├── app.py                 # Main backend application
│   ├── requirements.txt       # Python dependencies
│   └── instance/              # Database folder (not in Git)
│       └── smart_atm.db       # Your local database
├── frontend/
│   └── smart-atm-frontend/
│       ├── src/               # React source code
│       ├── package.json       # Node dependencies
│       └── ...
└── README.md
```

---

## 🎯 Multiple Systems Workflow

### On Your Main Computer:
1. Set up project
2. Configure with your details
3. Push code to Git (`.env` and `.db` stay local)

### On Your Laptop/Another Computer:
1. Clone from Git
2. Run `python setup_wizard.py`
3. Use same root credentials as main computer
4. You now have access with your same login!

**Note:** Each system has its own database, but you use the same login credentials across all systems.

---

## 🔄 Updating from Git

```bash
# Pull latest changes
git pull origin main

# Update backend dependencies
cd backend
pip install -r requirements.txt

# Update frontend dependencies
cd ../frontend/smart-atm-frontend
npm install

# Restart both servers
```

**Your `.env` and database remain unchanged during updates!**

---

## 📞 Support

If you encounter issues:
1. Check `.env` file exists and has correct values
2. Verify database is initialized: `python setup_database.py`
3. Ensure all dependencies are installed
4. Check both backend and frontend are running

---

## ✅ Checklist for Git Upload

Before uploading to Git:

- [ ] `.env` file is in `.gitignore`
- [ ] Database files (`*.db`) are in `.gitignore`
- [ ] `.env.example` is created with template values
- [ ] `setup_wizard.py` and `setup_database.py` are included
- [ ] `requirements.txt` includes `python-dotenv`
- [ ] `SETUP.md` (this file) is included
- [ ] No hardcoded passwords in any `.py` files
- [ ] Test setup on a clean folder to ensure it works

---

## 🎉 You're All Set!

Your system is configured to work across multiple devices while keeping your credentials secure!

**Default Login After Setup:**
- Email: (what you entered in setup wizard)
- Password: (what you entered in setup wizard)
