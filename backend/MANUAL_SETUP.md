# 🔧 Node.js PATH Issue - Manual Setup Guide

## The Problem

Node.js is installed but not accessible from PowerShell/IDE terminal. This is a Windows PATH configuration issue.

---

## ✅ Solution: Use Command Prompt (CMD) Instead

Since Node.js works in regular CMD, let's use that to set everything up.

### Step 1: Open Command Prompt (CMD)

1. Press `Windows + R`
2. Type: `cmd`
3. Press Enter

### Step 2: Navigate to Backend Folder

```cmd
cd C:\Users\ATHARVA\OneDrive\Desktop\homemate-hub-main\backend
```

### Step 3: Verify Node.js

```cmd
node --version
npm --version
```

You should see version numbers!

### Step 4: Install Dependencies

```cmd
npm install
```

This will take 1-2 minutes.

### Step 5: Check if PostgreSQL is Installed

```cmd
psql --version
```

**If you get an error**, you need to install PostgreSQL:
- Download: https://www.postgresql.org/download/windows/
- Install with default settings
- **Remember the password** you set for 'postgres' user!

### Step 6: Create Database

```cmd
psql -U postgres
```

Enter your PostgreSQL password when prompted, then run:

```sql
CREATE DATABASE homemate_hub;
\q
```

### Step 7: Edit .env File

Open `backend\.env` in Notepad and update the password:

```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/homemate_hub?schema=public"
```

Replace `YOUR_PASSWORD` with your actual PostgreSQL password.

### Step 8: Setup Database

Back in CMD, in the backend folder:

```cmd
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

### Step 9: Start Backend Server

```cmd
npm run dev
```

✅ **Backend should start at:** http://localhost:5000

### Step 10: Test Backend

Open browser and go to:
- http://localhost:5000/api/health

You should see:
```json
{
  "success": true,
  "message": "HomeMate Hub API is running"
}
```

---

## 🎨 Start Frontend (New CMD Window)

Open a NEW Command Prompt window:

```cmd
cd C:\Users\ATHARVA\OneDrive\Desktop\homemate-hub-main
npm install
npm run dev
```

✅ **Frontend will open at:** http://localhost:5173

---

## 🔍 Optional: Fix PowerShell PATH Issue

If you want to fix PowerShell for future use:

### Option 1: Restart Computer
The simplest solution - restart your computer and Node.js should work in PowerShell.

### Option 2: Manually Add to PATH

1. Find Node.js installation folder (usually `C:\Program Files\nodejs\`)
2. Press `Windows + X` → System
3. Click "Advanced system settings"
4. Click "Environment Variables"
5. Under "System Variables", find "Path"
6. Click "Edit"
7. Add: `C:\Program Files\nodejs\`
8. Click OK on all windows
9. Restart PowerShell/VS Code

---

## 📋 Quick Command Reference (for CMD)

```cmd
# Navigate to backend
cd C:\Users\ATHARVA\OneDrive\Desktop\homemate-hub-main\backend

# Start backend
npm run dev

# In a NEW CMD window - navigate to project root
cd C:\Users\ATHARVA\OneDrive\Desktop\homemate-hub-main

# Start frontend  
npm run dev

# View database (optional, in another CMD)
cd backend
npm run prisma:studio
```

---

## ✅ Test Accounts

Once everything is running:

**Client:**
- Email: `client@test.com`
- Password: `password123`

**Workers:**
- `worker1@test.com` / `password123`
- `worker2@test.com` / `password123`
- `worker3@test.com` / `password123`

---

## 🆘 Still Having Issues?

1. **Make sure you're using CMD, not PowerShell**
2. **Check Node.js version in CMD:** `node --version`
3. **Install PostgreSQL if not done**
4. **Check `.env` has correct PostgreSQL password**

---

## 🎯 Expected Result

After following these steps:

✅ Backend running at http://localhost:5000  
✅ Frontend running at http://localhost:5173  
✅ Database viewer at http://localhost:5555 (if you ran prisma studio)

**Open http://localhost:5173 in your browser to see the website!**
