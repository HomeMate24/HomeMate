# API Documentation - HomeMate Hub Backend

## Base URL
```
http://localhost:5000/api
```

## Authentication

All protected endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer YOUR_JWT_TOKEN
```

---

## 🔐 Authentication Endpoints

### 1. Client Signup
**POST** `/auth/signup/client`

**Access:** Public

**Request Body:**
```json
{
  "email": "client@example.com",
  "password": "securePassword123",
  "name": "John Doe",
  "phone": "9876543210",
  "address": "123 Main Street, Kothrud",
  "areaId": "uuid-of-area"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Client registered successfully",
  "data": {
    "user": { /* user object */ },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

### 2. Worker Signup
**POST** `/auth/signup/worker`

**Access:** Public

**Request Body:**
```json
{
  "email": "worker@example.com",
  "password": "securePassword123",
  "name": "Rajesh Kumar",
  "phone": "9876543211",
  "bio": "Experienced plumber with 8 years of expertise",
  "experience": 8,
  "hourlyRate": 400,
  "areaIds": ["uuid-1", "uuid-2"],
  "serviceIds": ["uuid-1"]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Worker registered successfully",
  "data": {
    "user": { /* user object with worker details */ },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

### 3. Login
**POST** `/auth/login`

**Access:** Public

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "User Name",
      "role": "CLIENT" | "WORKER",
      "client": { /* if CLIENT */ },
      "worker": { /* if WORKER */ }
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

## 🌍 Areas & Services

### 4. Get All Areas
**GET** `/areas`

**Access:** Public

**Response:**
```json
{
  "success": true,
  "data": {
    "areas": [
      {
        "id": "uuid",
        "name": "Kothrud",
        "city": "Pune",
        "pincode": "411038",
        "isActive": true
      }
    ]
  }
}
```

---

### 5. Get All Services
**GET** `/services`

**Access:** Public

**Response:**
```json
{
  "success": true,
  "data": {
    "services": [
      {
        "id": "uuid",
        "name": "Plumbing",
        "description": "Water pipe repairs...",
        "icon": "🔧",
        "basePrice": 300,
        "isActive": true
      }
    ]
  }
}
```

---

## 👷 Worker Endpoints

### 6. Get Worker Jobs (Area-Filtered)
**GET** `/workers/jobs?status=PENDING`

**Access:** Worker only

**Query Parameters:**
- `status` (optional): PENDING, ACCEPTED, IN_PROGRESS, COMPLETED

**Response:**
```json
{
  "success": true,
  "data": {
    "jobs": [
      {
        "id": "uuid",
        "description": "Fix leaking tap",
        "scheduledAt": "2026-01-19T10:00:00Z",
        "address": "123 Test Street",
        "status": "PENDING",
        "estimatedPrice": 500,
        "client": { /* client details */ },
        "service": { /* service details */ },
        "area": { /* area details */ }
      }
    ]
  }
}
```

---

### 7. Accept Job
**POST** `/workers/jobs/:jobId/accept`

**Access:** Worker only

**Response:**
```json
{
  "success": true,
  "message": "Job accepted successfully",
  "data": {
    "job": { /* updated job with ACCEPTED status */ }
  }
}
```

---

### 8. Update Job Status
**PATCH** `/workers/jobs/:jobId/status`

**Access:** Worker only

**Request Body:**
```json
{
  "status": "IN_PROGRESS" | "COMPLETED"
}
```

---

### 9. Get Worker Earnings
**GET** `/workers/earnings`

**Access:** Worker only

**Response:**
```json
{
  "success": true,
  "data": {
    "totalEarnings": 45600,
    "completedJobsCount": 156,
    "completedJobs": [ /* array of completed jobs */ ]
  }
}
```

---

## 👤 Client Endpoints

### 10. Browse Workers (Area-Wise)
**GET** `/client/workers?areaId=uuid&serviceId=uuid`

**Access:** Client only

**Query Parameters:**
- `areaId` (required): Area UUID
- `serviceId` (optional): Service UUID for filtering

**Response:**
```json
{
  "success": true,
  "data": {
    "workers": [
      {
        "id": "uuid",
        "user": {
          "name": "Rajesh Kumar",
          "phone": "9876543211"
        },
        "bio": "Experienced plumber...",
        "experience": 8,
        "hourlyRate": 400,
        "isAvailable": true,
        "averageRating": 4.7,
        "completedJobs": 156,
        "areaSpecificRating": 4.8,
        "areaReviewCount": 34,
        "workerServices": [ /* services offered */ ]
      }
    ]
  }
}
```

---

### 11. Create Job Booking
**POST** `/client/jobs`

**Access:** Client only

**Request Body:**
```json
{
  "serviceId": "uuid",
  "areaId": "uuid",
  "description": "Fix leaking tap in bathroom",
  "scheduledAt": "2026-01-19T10:00:00Z",
  "address": "123 Test Street, Kothrud",
  "estimatedPrice": 500
}
```

**Validation:**
- `scheduledAt` must be within 24 hours

**Response:**
```json
{
  "success": true,
  "message": "Job created successfully",
  "data": {
    "job": { /* created job details */ }
  }
}
```

---

### 12. Rate Worker
**POST** `/client/jobs/:jobId/rate`

**Access:** Client only (job must be COMPLETED)

**Request Body:**
```json
{
  "rating": 5,
  "review": "Excellent work! Very professional and punctual."
}
```

---

## 💳 Payment Endpoints

### 13. Initiate Payment
**POST** `/payments/initiate`

**Access:** Client only

**Request Body:**
```json
{
  "jobId": "uuid" | null,
  "subscriptionId": "uuid" | null,
  "amount": 500,
  "paymentMethod": "UPI" | "NET_BANKING"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment initiated",
  "data": {
    "payment": { /* payment record */ },
    "gatewayData": {
      "orderId": "ORD_xxx",
      "amount": 500,
      "paymentUrl": "..."
    },
    "upiQR": { /* if UPI selected */ }
  }
}
```

---

### 14. Verify Payment
**POST** `/payments/verify`

**Access:** Client only

**Request Body:**
```json
{
  "paymentId": "uuid",
  "transactionId": "TXN_xxx",
  "paymentData": { /* gateway response */ }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment verified successfully",
  "data": {
    "payment": { /* updated payment */ },
    "aiAccessEnabled": true  // if subscription payment
  }
}
```

---

## 📅 Subscription Endpoints

### 15. Subscribe
**POST** `/subscriptions/subscribe`

**Access:** Client only

**Request Body:**
```json
{
  "paymentMethod": "UPI"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Subscription payment initiated",
  "data": {
    "subscription": { /* subscription details */ },
    "payment": { /* payment record */ },
    "upiQR": {
      "qrCodeUrl": "https://...",
      "upiString": "upi://pay?..."
    }
  }
}
```

---

### 16. Get Subscription Status
**GET** `/subscriptions/status`

**Access:** Client only

**Response:**
```json
{
  "success": true,
  "data": {
    "hasSubscription": true,
    "subscription": {
      "isActive": true,
      "aiAccessEnabled": true,
      "startDate": "2026-01-18T00:00:00Z",
      "endDate": "2026-02-18T00:00:00Z"
    },
    "isExpired": false,
    "daysRemaining": 30
  }
}
```

---

## 🧠 AI Endpoints

### 17. Get AI Worker Recommendation
**POST** `/ai/recommend-worker`

**Access:** Client + Active Subscription only

**Request Body:**
```json
{
  "areaId": "uuid",
  "serviceId": "uuid",
  "preferences": {}
}
```

**Response:**
```json
{
  "success": true,
  "message": "AI recommendation generated successfully",
  "data": {
    "area": "Kothrud",
    "service": "Plumbing",
    "recommendation": {
      "worker": { /* full worker details */ },
      "score": 87,
      "metrics": {
        "areaSpecificRating": 4.8,
        "totalCompletedJobs": 156,
        "areaReviewCount": 34,
        "experience": 8,
        "hourlyRate": 400
      },
      "explanation": "Recommended because of excellent 4.8/5 rating in your area, extensive experience with 156+ completed jobs, 8 years of professional experience, currently available.",
      "confidence": "HIGH"
    },
    "alternatives": [
      /* top 3 other workers */
    ]
  }
}
```

---

## ⚠️ Error Responses

### Authentication Error
```json
{
  "success": false,
  "message": "Access token required"
}
```

### Role Restriction Error
```json
{
  "success": false,
  "message": "Access denied. This endpoint requires CLIENT role."
}
```

### AI Access Denied
```json
{
  "success": false,
  "message": "AI access requires an active subscription. Please subscribe for ₹49/month.",
  "subscriptionRequired": true
}
```

### Rate Limit Error
```json
{
  "success": false,
  "message": "Too many requests from this IP, please try again later."
}
```

---

## 🔌 WebSocket Events

### Connection
```
ws://localhost:5000?token=YOUR_JWT_TOKEN
```

### Events Sent to Client

**JOB_ACCEPTED**
```json
{
  "type": "JOB_ACCEPTED",
  "job": { /* full job details */ }
}
```

**JOB_STATUS_UPDATED**
```json
{
  "type": "JOB_STATUS_UPDATED",
  "job": { /* updated job */ }
}
```

### Events Sent to Worker

**NEW_JOB_REQUEST**
```json
{
  "type": "NEW_JOB_REQUEST",
  "job": { /* new job in worker's area */ }
}
```

**JOB_CANCELLED**
```json
{
  "type": "JOB_CANCELLED",
  "jobId": "uuid"
}
```

---

## 📊 Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden (role/subscription restriction)
- `404` - Not Found
- `409` - Conflict (duplicate entry)
- `500` - Internal Server Error
