# 🚀 Automated Setup - Just Double Click!

I've created automated scripts so you don't have to type commands manually.

## 📋 Prerequisites Check

✅ Node.js - Installed  
✅ PostgreSQL - Installed  
⚠️ Need to configure:
- Create database
- Update `.env` file with PostgreSQL password

---

## 🎯 Super Easy 3-Step Setup

### Step 1: Update `.env` File (30 seconds)

1. Open this file in Notepad:
   ```
   C:\Users\ATHARVA\OneDrive\Desktop\homemate-hub-main\backend\.env
   ```

2. Find this line:
   ```
   DATABASE_URL="postgresql://postgres:your_password_here@localhost:5432/homemate_hub?schema=public"
   ```

3. Replace `your_password_here` with your actual PostgreSQL password

4. Save and close

### Step 2: Create Database (Optional - if not already created)

**Option A - Using Script:**
- **Double-click:** `create-database.bat`
- Enter your PostgreSQL password when prompted
- Database will be created automatically

**Option B - Manual:**
- Open CMD
- Run: `psql -U postgres`
- Enter: `CREATE DATABASE homemate_hub;`
- Type: `\q` to exit

### Step 3: Run Setup Script

**Simply double-click:** `setup-and-run.bat`

This script will automatically:
1. ✅ Check Node.js installation
2. ✅ Install all dependencies
3. ✅ Generate Prisma Client
4. ✅ Run database migrations (create tables)
5. ✅ Seed test data (areas, services, users)
6. ✅ Start the backend server

---

## 🎉 What You'll See

When successful, you'll see:

```
================================================
Setup Complete!
================================================

Backend will start at: http://localhost:5000

Test accounts:
- Client: client@test.com / password123
- Worker1: worker1@test.com / password123
...
```

The server will be running! **Don't close this window.**

---

## 🌐 Test the Backend

Open your browser and go to:
- **http://localhost:5000/api/health**

You should see:
```json
{
  "success": true,
  "message": "HomeMate Hub API is running"
}
```

---

## 🎨 Start the Frontend (After Backend is Running)

Open a **new Command Prompt (CMD)** window:

```cmd
cd C:\Users\ATHARVA\OneDrive\Desktop\homemate-hub-main
npm install
npm run dev
```

Frontend will open at: **http://localhost:5173**

---

## 📊 View Database (Optional)

Open another CMD window:

```cmd
cd C:\Users\ATHARVA\OneDrive\Desktop\homemate-hub-main\backend
npm run prisma:studio
```

Database GUI opens at: **http://localhost:5555**

---

## ⚠️ If You Get Errors

### "Cannot connect to database"
- ✅ Make sure PostgreSQL service is running
- ✅ Check password in `.env` is correct
- ✅ Run `create-database.bat` to create database

### "npm not recognized"
- ✅ The scripts are designed to run in CMD where Node.js works
- ✅ Make sure you're using Command Prompt, not PowerShell

### Database already exists
- ✅ This is fine! Just means the database was already created

---

## 🎯 Quick Summary

1. Edit `.env` → Add your PostgreSQL password
2. Double-click `create-database.bat` → Creates database
3. Double-click `setup-and-run.bat` → Installs & starts everything
4. Open http://localhost:5000/api/health → Verify it works
5. In new CMD: `npm run dev` from project root → Start frontend

**That's it! Your backend will be running! 🚀**

---

## 📁 Created Files

- **`setup-and-run.bat`** - Main setup script (installs & starts backend)
- **`create-database.bat`** - Creates PostgreSQL database
- **`.env`** - Configuration file (edit with your password)

---

**Just double-click `setup-and-run.bat` and you're done!** 🎉
