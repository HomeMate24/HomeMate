# HomeMate Hub - Backend System

Complete backend system for a home-services platform with area-based worker allocation, role-based access control, subscription-based AI recommendations, and integrated payment processing.

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend Layer                          │
│                  (Pre-existing - Not included)                  │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                  ┌─────────▼──────────┐
                  │   Express Server    │
                  │   + WebSocket       │
                  └─────────┬──────────┘
                            │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
┌───────▼────────┐ ┌──────▼──────┐  ┌───────▼────────┐
│ Authentication │ │     API     │  │   WebSocket    │
│   Middleware   │ │   Routes    │  │ Notifications  │
│   (JWT/Role)   │ │             │  │                │
└───────┬────────┘ └──────┬──────┘  └───────┬────────┘
        │                  │                  │
        └──────────────────┼──────────────────┘
                           │
                  ┌────────▼─────────┐
                  │   Controllers    │
                  │ (Business Logic) │
                  └────────┬─────────┘
                           │
                  ┌────────▼─────────┐
                  │   Prisma ORM     │
                  └────────┬─────────┘
                           │
                  ┌────────▼─────────┐
                  │   PostgreSQL     │
                  │    Database      │
                  └──────────────────┘
```

## 📦 Technology Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: JWT (jsonwebtoken)
- **Real-time**: WebSocket (ws)
- **Password Hashing**: bcryptjs
- **Rate Limiting**: express-rate-limit

## 🗄️ Database Schema

### Core Entities

1. **User** - Common authentication table with role discriminator
2. **Client** - Client-specific profile and subscription data
3. **Worker** - Worker profile with skills, availability, ratings
4. **Area** - Service areas (Kothrud, Warje, Erandwane)
5. **WorkerArea** - Many-to-many: Workers ↔ Areas
6. **Service** - Service catalog (Plumbing, Carpentry, etc.)
7. **Job** - Service bookings with status tracking
8. **Rating** - Client reviews for completed jobs
9. **Payment** - Payment transaction records
10. **Subscription** - Client subscription for AI access
11. **AIAccessLog** - Audit trail for AI usage

See `prisma/schema.prisma` for complete schema.

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or higher)
- PostgreSQL database
- npm or yarn

### Installation

1. **Clone the repository** (if not already done)

2. **Navigate to backend directory**
```bash
cd backend
```

3. **Install dependencies**
```bash
npm install
```

4. **Configure environment**
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/homemate_hub"
JWT_SECRET="your-super-secret-jwt-key"
PORT=5000
```

5. **Setup database**
```bash
# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Seed initial data
npm run prisma:seed
```

6. **Start the server**
```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

The server will start on `http://localhost:5000`

## 🔐 Authentication

### User Roles

- **CLIENT**: Customers who book services
- **WORKER**: Service providers

### Authentication Flow

1. **Signup**: `POST /api/auth/signup/client` or `POST /api/auth/signup/worker`
2. **Login**: `POST /api/auth/login`
3. **Get Profile**: `GET /api/auth/me` (requires JWT token)

### Using JWT Token

Include token in requests:
```
Authorization: Bearer YOUR_JWT_TOKEN
```

## 📡 API Endpoints

### Authentication

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/auth/signup/client` | Public | Client registration |
| POST | `/api/auth/signup/worker` | Public | Worker registration |
| POST | `/api/auth/login` | Public | Login (returns JWT) |
| GET | `/api/auth/me` | Protected | Get current user |
| POST | `/api/auth/logout` | Protected | Logout |

### Areas & Services

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/areas` | Public | List all areas |
| POST | `/api/areas` | Protected | Create new area |
| GET | `/api/services` | Public | List all services |
| POST | `/api/services` | Protected | Create new service |

### Worker APIs (WORKER role required)

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/workers/jobs` | Worker | View job requests (area-filtered) |
| POST | `/api/workers/jobs/:jobId/accept` | Worker | Accept job request |
| POST | `/api/workers/jobs/:jobId/reject` | Worker | Reject job request |
| PATCH | `/api/workers/jobs/:jobId/status` | Worker | Update job status |
| GET | `/api/workers/earnings` | Worker | View earnings & completed jobs |
| PATCH | `/api/workers/profile` | Worker | Update profile |
| PATCH | `/api/workers/areas` | Worker | Update working areas |

### Client APIs (CLIENT role required)

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/client/workers` | Client | Browse area-wise workers |
| POST | `/api/client/jobs` | Client | Create service booking |
| GET | `/api/client/jobs` | Client | Job history |
| GET | `/api/client/jobs/:jobId` | Client | Job details |
| POST | `/api/client/jobs/:jobId/cancel` | Client | Cancel job |
| POST | `/api/client/jobs/:jobId/rate` | Client | Rate & review worker |

### Payment APIs (CLIENT role required)

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/payments/initiate` | Client | Initiate payment |
| POST | `/api/payments/verify` | Client | Verify payment |
| GET | `/api/payments/history` | Client | Payment history |

### Subscription APIs (CLIENT role required)

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/subscriptions/subscribe` | Client | Subscribe for ₹49/month |
| GET | `/api/subscriptions/status` | Client | Check subscription status |
| POST | `/api/subscriptions/cancel` | Client | Cancel auto-renewal |

### AI APIs (CLIENT + Active Subscription required)

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/ai/recommend-worker` | Client + Sub | Get AI worker recommendation |
| GET | `/api/ai/history` | Client + Sub | AI access history |

## 🔌 WebSocket Real-time Updates

### Connection

```javascript
const ws = new WebSocket(`ws://localhost:5000?token=${JWT_TOKEN}`);

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Received:', data);
};
```

### Event Types

**For Workers:**
- `NEW_JOB_REQUEST` - New job available in your area
- `JOB_CANCELLED` - Client cancelled a job

**For Clients:**
- `JOB_ACCEPTED` - Worker accepted your job
- `JOB_REJECTED` - Worker rejected your job
- `JOB_STATUS_UPDATED` - Job status changed

## 🧠 AI Recommendation System

### Access Requirements
- ✅ Must be a CLIENT
- ✅ Must have active subscription (₹49/month)

### Recommendation Algorithm

Multi-factor scoring (0-100):
- **40%** - Area-specific rating
- **25%** - Completed jobs count
- **20%** - Service expertise match
- **10%** - Current availability
- **5%** - Years of experience

### Request Example

```json
POST /api/ai/recommend-worker
{
  "areaId": "uuid-of-area",
  "serviceId": "uuid-of-service"
}
```

### Response Example

```json
{
  "success": true,
  "data": {
    "recommendation": {
      "worker": { /* worker details */ },
      "score": 87,
      "metrics": {
        "areaSpecificRating": 4.8,
        "totalCompletedJobs": 156,
        "areaReviewCount": 34,
        "experience": 8
      },
      "explanation": "Recommended because of excellent 4.8/5 rating in your area...",
      "confidence": "HIGH"
    },
    "alternatives": [ /* top 3 other options */ ]
  }
}
```

## 💳 Payment Integration

### Development Mode
- Uses mock payment gateway
- Transaction IDs starting with `TXN_` are auto-verified

### Production Setup
1. Get Razorpay/Stripe credentials
2. Update `.env`:
```env
RAZORPAY_KEY_ID=your_key_id
RAZORPAY_KEY_SECRET=your_key_secret
```
3. Update `utils/paymentGateway.js` with actual implementation

## 🔒 Security Features

### Implemented
- ✅ JWT-based authentication
- ✅ Role-based access control (CLIENT/WORKER)
- ✅ Subscription-gated AI access
- ✅ Password hashing with bcrypt
- ✅ API rate limiting
- ✅ CORS protection
- ✅ Input validation

### Rate Limits
- **General API**: 100 requests / 15 minutes
- **Auth endpoints**: 10 requests / 15 minutes
- **AI endpoints**: 50 requests / hour

## 📊 Business Logic

### Area-Based Worker Allocation
1. Workers select working areas during registration
2. Workers receive job requests ONLY from selected areas
3. Clients see ONLY workers available in their area

### 24-Hour Scheduling Rule
- All services must be scheduled within 24 hours
- Enforced at job creation

### Job Lifecycle
```
PENDING → ACCEPTED → IN_PROGRESS → COMPLETED
   ↓
REJECTED / CANCELLED
```

### Rating System
- Clients can rate workers after job completion (1-5 stars)
- Ratings are area-specific
- Worker's average rating is automatically updated

## 🧪 Testing

### Test Accounts (Created by seeding)

**Client:**
- Email: `client@test.com`
- Password: `password123`

**Workers:**
- Email: `worker1@test.com` / `password123` (Plumber - Kothrud, Warje)
- Email: `worker2@test.com` / `password123` (Electrician - Kothrud, Erandwane)
- Email: `worker3@test.com` / `password123` (Carpenter - Warje, Erandwane)

### Testing Workflow

1. **Login as client**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"client@test.com","password":"password123"}'
```

2. **Browse workers in Kothrud**
```bash
curl -X GET "http://localhost:5000/api/client/workers?areaId=KOTHRUD_ID" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

3. **Create a job**
```bash
curl -X POST http://localhost:5000/api/client/jobs \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "serviceId": "PLUMBING_ID",
    "areaId": "KOTHRUD_ID",
    "description": "Fix leaking tap",
    "scheduledAt": "2026-01-19T10:00:00Z",
    "address": "123 Test Street",
    "estimatedPrice": 500
  }'
```

## 📁 Project Structure

```
backend/
├── controllers/          # Business logic for each module
│   ├── authController.js
│   ├── workerController.js
│   ├── clientController.js
│   ├── paymentController.js
│   ├── subscriptionController.js
│   ├── aiController.js
│   ├── areaController.js
│   └── serviceController.js
├── middleware/           # Express middleware
│   ├── auth.js           # JWT & role verification
│   └── rateLimiter.js    # API rate limiting
├── routes/               # API route definitions
│   └── index.js
├── utils/                # Utility functions
│   ├── prisma.js         # Prisma client singleton
│   ├── paymentGateway.js # Payment abstraction
│   ├── aiRecommendation.js # AI algorithm
│   └── seedData.js       # Database seeding
├── websocket/            # WebSocket server
│   └── jobNotifications.js
├── prisma/
│   └── schema.prisma     # Database schema
├── server.js             # Main application file
├── package.json
└── .env.example
```

## 🚀 Deployment

### Environment Variables for Production

```env
NODE_ENV=production
DATABASE_URL=postgresql://...
JWT_SECRET=your-very-secure-secret-key
FRONTEND_URL=https://your-frontend-domain.com
RAZORPAY_KEY_ID=your_production_key
RAZORPAY_KEY_SECRET=your_production_secret
```

### Database Migration

```bash
npm run prisma:migrate
```

### Recommended Hosting
- **Backend**: AWS EC2, Azure VM, Google Cloud Compute Engine, Railway, Render
- **Database**: AWS RDS (PostgreSQL), Supabase, Neon
- **WebSocket**: Compatible with most Node.js hosts

## 🔧 Maintenance

### Adding New Areas

```bash
curl -X POST http://localhost:5000/api/areas \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Shivajinagar","city":"Pune","pincode":"411005"}'
```

### Adding New Services

```bash
curl -X POST http://localhost:5000/api/services \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"AC Repair","description":"Air conditioning repair and maintenance","basePrice":600}'
```

## 📝 License

This project is proprietary and confidential.

## 👨‍💻 Support

For issues or questions, please contact your development team.

---

**Built with ❤️ for HomeMate Hub**
