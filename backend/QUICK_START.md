# Quick Start Commands - Run These After Installing Node.js

## ⚠️ IMPORTANT: After installing Node.js, you MUST restart your terminal/PowerShell!

Close all terminal windows and open a fresh one, then run:

---

## Step 1: Verify Node.js Installation

```bash
node --version
npm --version
```

You should see version numbers like:
```
v20.x.x
10.x.x
```

---

## Step 2: Install PostgreSQL (If Not Already Installed)

**Download:** https://www.postgresql.org/download/windows/

- Set a password for 'postgres' user (remember it!)
- Use default port: 5432

After installation, create the database:

```bash
# Open a new terminal and run:
psql -U postgres

# In psql, run:
CREATE DATABASE homemate_hub;

# Exit psql:
\q
```

---

## Step 3: Configure Database Connection

Edit `backend/.env` file and replace `your_password_here` with your PostgreSQL password:

```env
DATABASE_URL="postgresql://postgres:YOUR_ACTUAL_PASSWORD@localhost:5432/homemate_hub?schema=public"
```

---

## Step 4: Install Backend Dependencies

```bash
cd C:\Users\ATHARVA\OneDrive\Desktop\homemate-hub-main\backend
npm install
```

---

## Step 5: Setup Database

```bash
# Generate Prisma Client
npm run prisma:generate

# Create database tables
npm run prisma:migrate

# Add test data (areas, services, users)
npm run prisma:seed
```

---

## Step 6: Start Backend Server

```bash
npm run dev
```

✅ **Backend will run at:** http://localhost:5000

---

## Step 7: Start Frontend (In a NEW Terminal)

```bash
cd C:\Users\ATHARVA\OneDrive\Desktop\homemate-hub-main
npm install
npm run dev
```

✅ **Frontend will run at:** http://localhost:5173

---

## 🧪 Test the Backend

Open browser and visit:
- http://localhost:5000/api/health

Or test login:
```bash
curl -X POST http://localhost:5000/api/auth/login -H "Content-Type: application/json" -d "{\"email\":\"client@test.com\",\"password\":\"password123\"}"
```

---

## 📊 View Database (Optional)

```bash
cd backend
npm run prisma:studio
```

Opens at: http://localhost:5555

---

## ⚠️ Common Issues

**"npm not recognized"**
→ Restart your terminal! Node.js updates PATH, terminal needs restart.

**"Cannot connect to database"**
→ Make sure PostgreSQL is installed and running
→ Check password in `.env` file is correct

**"Port 5000 already in use"**
→ Change PORT=5001 in `.env`

---

## 📝 Next Steps After Terminal Restart:

1. ✅ Open a NEW terminal (close old ones)
2. ✅ Verify: `node --version`
3. ✅ Install PostgreSQL if not done
4. ✅ Create database: `CREATE DATABASE homemate_hub;`
5. ✅ Edit `.env` with your PostgreSQL password
6. ✅ Run: `npm install` in backend folder
7. ✅ Run: `npm run prisma:migrate`
8. ✅ Run: `npm run prisma:seed`
9. ✅ Run: `npm run dev`
10. ✅ Open http://localhost:5000

**Let me know once you've restarted your terminal and I'll help run the commands!**
