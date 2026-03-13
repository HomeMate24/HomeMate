# MongoDB Setup Guide

## ⚠️ MongoDB Not Installed

MongoDB is not currently installed on your system. Here's how to get it running:

---

## 📥 Installation Steps

### Step 1: Download MongoDB

1. Go to: **https://www.mongodb.com/try/download/community**
2. Select:
   - **Version**: Latest (7.0 or higher)
   - **Platform**: Windows
   - **Package**: MSI
3. Click **Download**

### Step 2: Install MongoDB

1. Run the downloaded `.msi` file
2. Choose **Complete** installation
3. **IMPORTANT**: Check these boxes:
   - ✅ Install MongoDB as a Service
   - ✅ Run service as Network Service user
   - ✅ Install MongoDB Compass (GUI tool)

4. Complete the installation

### Step 3: Verify Installation

Open a **NEW** PowerShell window (important - close old ones):

```powershell
mongod --version
```

You should see version information.

### Step 4: Start MongoDB Service

MongoDB should auto-start after installation. To manually start:

```powershell
# Run PowerShell as Administrator, then:
net start MongoDB
```

Or simply restart your computer.

---

## 🚀 After Installation

Once MongoDB is installed and running, execute these commands:

```bash
cd backend

# 1. Seed the database with test data
npm run seed

# 2. View database contents
node utils/viewDatabase.js

# 3. Start the server
npm run dev
```

---

## 🔍 Verify MongoDB is Running

### Option 1: MongoDB Compass (GUI)
- Open MongoDB Compass (installed with MongoDB)
- Connect to: `mongodb://localhost:27017`
- You should see your databases

### Option 2: Command Line
```powershell
mongosh
# If connected successfully, you'll see:
# Connecting to: mongodb://127.0.0.1:27017
```

---

## 📋 Quick Commands Reference

| Command | Purpose |
|---------|---------|
| `net start MongoDB` | Start MongoDB service |
| `net stop MongoDB` | Stop MongoDB service |
| `mongosh` | Open MongoDB shell |
| `npm run seed` | Seed database with test data |
| `npm run dev` | Start backend server |
| `node utils/viewDatabase.js` | View all database contents |

---

## ✅ Your Migration is Complete!

All code has been successfully migrated to MongoDB. You just need to:
1. Install MongoDB (10 minutes)
2. Run `npm run seed`
3. Start the server with `npm run dev`

Everything is ready to go once MongoDB is installed! 🎉
