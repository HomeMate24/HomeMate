# HomeMate Hub - Complete Setup Guide

## ⚠️ Prerequisites Check

Before running the backend, you need to install:

### 1. **Node.js (Required)**
- **Download:** https://nodejs.org/
- **Recommended Version:** v20.x LTS
- **Installation Steps:**
  1. Download the Windows installer (.msi)
  2. Run the installer
  3. ✅ Check "Automatically install necessary tools" (includes npm)
  4. Restart your terminal/command prompt
  5. Verify installation:
     ```bash
     node --version
     npm --version
     ```

### 2. **PostgreSQL (Required for Database)**
- **Download:** https://www.postgresql.org/download/windows/
- **Recommended Version:** PostgreSQL 15 or 16
- **Installation Steps:**
  1. Download the Windows installer
  2. Run installer (default settings are fine)
  3. **Remember the password you set for 'postgres' user!**
  4. Default port: 5432
  5. Verify installation:
     ```bash
     psql --version
     ```

---

## 🚀 Step-by-Step Setup Instructions

### Step 1: Install Node.js (If Not Installed)

**Download and install from:** https://nodejs.org/

After installation, close and reopen your terminal, then verify:
```bash
node --version
npm --version
```

### Step 2: Install PostgreSQL (If Not Installed)

**Download from:** https://www.postgresql.org/download/windows/

During installation:
- Set a password for the 'postgres' user (remember this!)
- Use default port: 5432
- Install pgAdmin (optional, but helpful)

### Step 3: Create Database

Open Command Prompt or PowerShell:

```bash
# Connect to PostgreSQL (enter password when prompted)
psql -U postgres

# Create the database
CREATE DATABASE homemate_hub;

# Exit psql
\q
```

### Step 4: Configure Backend Environment

Navigate to backend folder:
```bash
cd C:\Users\ATHARVA\OneDrive\Desktop\homemate-hub-main\backend
```

**Already done:** `.env` file has been created

**Edit `.env` file** with your PostgreSQL credentials:
```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/homemate_hub?schema=public"
```
Replace `YOUR_PASSWORD` with the password you set during PostgreSQL installation.

### Step 5: Install Backend Dependencies

```bash
cd C:\Users\ATHARVA\OneDrive\Desktop\homemate-hub-main\backend
npm install
```

### Step 6: Setup Database Schema

```bash
# Generate Prisma Client
npm run prisma:generate

# Run migrations (creates all tables)
npm run prisma:migrate

# Seed initial data (areas, services, test users)
npm run prisma:seed
```

### Step 7: Start Backend Server

```bash
npm run dev
```

✅ **Backend will be running at:** http://localhost:5000

### Step 8: Verify Backend is Running

Open another terminal and test:
```bash
curl http://localhost:5000/api/health
```

Or open in browser: http://localhost:5000/api/health

---

## 🎨 Running the Frontend

I noticed your project has a frontend (Vite + React + TypeScript).

### In a NEW terminal window:

```bash
# Go to project root
cd C:\Users\ATHARVA\OneDrive\Desktop\homemate-hub-main

# Install frontend dependencies
npm install

# Start frontend
npm run dev
```

✅ **Frontend will be running at:** http://localhost:5173

---

## 📊 Optional: View Database (Prisma Studio)

In another terminal:
```bash
cd C:\Users\ATHARVA\OneDrive\Desktop\homemate-hub-main\backend
npm run prisma:studio
```

✅ **Database GUI at:** http://localhost:5555

---

## 🧪 Test Accounts (Created by Seeding)

**Client:**
- Email: `client@test.com`
- Password: `password123`

**Workers:**
- Email: `worker1@test.com` / `password123` (Plumber)
- Email: `worker2@test.com` / `password123` (Electrician)
- Email: `worker3@test.com` / `password123` (Carpenter)

---

## ⚠️ Common Issues & Solutions

### "npm not recognized"
- Node.js is not installed or not in PATH
- **Solution:** Install Node.js from https://nodejs.org/

### "Cannot connect to database"
- PostgreSQL is not running or wrong credentials
- **Solution:** 
  1. Check PostgreSQL service is running
  2. Verify DATABASE_URL in `.env`
  3. Check password is correct

### "Port 5000 already in use"
- Another application is using port 5000
- **Solution:** Change PORT in `.env` to 5001

### "Prisma migrate failed"
- Database doesn't exist or wrong credentials
- **Solution:** 
  1. Create database: `CREATE DATABASE homemate_hub;`
  2. Check DATABASE_URL format

---

## 📋 Quick Reference

**Backend:**
```bash
cd backend
npm run dev          # Start development server
npm run prisma:studio  # Open database GUI
```

**Frontend:**
```bash
cd ..               # From backend to root
npm run dev          # Start frontend
```

**Database:**
```bash
psql -U postgres    # Connect to PostgreSQL
\l                  # List databases
\c homemate_hub     # Connect to database
\dt                 # List tables
```

---

## 🎯 Next Steps

After installation:

1. ✅ Install Node.js & PostgreSQL
2. ✅ Create database
3. ✅ Configure `.env`
4. ✅ Run `npm install` in backend
5. ✅ Run `npm run prisma:migrate`
6. ✅ Run `npm run prisma:seed`
7. ✅ Start backend: `npm run dev`
8. ✅ Start frontend: `npm run dev` (from root)
9. ✅ Open http://localhost:5173 in browser

**Need help?** Let me know which step you're stuck on!
