-- ═══════════════════════════════════════════════════════════════
-- HomeMate Hub - Supabase (PostgreSQL) Schema
-- Run this SQL in Supabase SQL Editor to create all tables
-- ═══════════════════════════════════════════════════════════════

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── USERS ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    password TEXT,
    phone TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('CLIENT', 'WORKER', 'PROVIDER')),
    google_id TEXT UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── AREAS ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS areas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL,
    city TEXT DEFAULT 'Pune',
    pincode TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── SERVICES ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    icon TEXT,
    base_price NUMERIC DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── CLIENTS ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    address TEXT,
    area_id UUID REFERENCES areas(id),
    rating NUMERIC DEFAULT 5.0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── PROVIDERS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS providers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    business_name TEXT NOT NULL,
    business_address TEXT,
    business_phone TEXT,
    description TEXT,
    profile_image TEXT,
    total_workers INTEGER DEFAULT 0,
    verification_status TEXT DEFAULT 'PENDING',
    verified_at TIMESTAMPTZ,
    total_revenue NUMERIC DEFAULT 0,
    total_bookings INTEGER DEFAULT 0,
    completed_jobs INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── WORKERS ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS workers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    bio TEXT,
    profile_image TEXT,
    experience INTEGER,
    hourly_rate NUMERIC,
    is_available BOOLEAN DEFAULT TRUE,
    total_jobs INTEGER DEFAULT 0,
    completed_jobs INTEGER DEFAULT 0,
    average_rating NUMERIC DEFAULT 0,
    provider_id UUID REFERENCES providers(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── WORKER ↔ AREA junction ───────────────────────────────────
CREATE TABLE IF NOT EXISTS worker_areas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    worker_id UUID REFERENCES workers(id) ON DELETE CASCADE,
    area_id UUID REFERENCES areas(id) ON DELETE CASCADE,
    UNIQUE(worker_id, area_id)
);

-- ─── WORKER ↔ SERVICE junction ────────────────────────────────
CREATE TABLE IF NOT EXISTS worker_services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    worker_id UUID REFERENCES workers(id) ON DELETE CASCADE,
    service_id UUID REFERENCES services(id) ON DELETE CASCADE,
    UNIQUE(worker_id, service_id)
);

-- ─── JOBS ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES clients(id),
    worker_id UUID REFERENCES workers(id),
    service_id UUID REFERENCES services(id),
    area_id UUID REFERENCES areas(id),
    description TEXT,
    scheduled_at TIMESTAMPTZ,
    address TEXT,
    status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING','ACCEPTED','REJECTED','IN_REVIEW','IN_PROGRESS','COMPLETED','CANCELLED')),
    estimated_price NUMERIC DEFAULT 0,
    final_price NUMERIC,
    accepted_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    expired BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── RATINGS ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ratings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID REFERENCES jobs(id),
    client_id UUID REFERENCES clients(id),
    worker_id UUID REFERENCES workers(id),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    review TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── PAYMENTS ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES clients(id),
    job_id UUID REFERENCES jobs(id),
    subscription_id UUID,
    amount NUMERIC NOT NULL,
    payment_type TEXT CHECK (payment_type IN ('JOB_PAYMENT','SUBSCRIPTION')),
    payment_method TEXT,
    status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING','COMPLETED','FAILED')),
    transaction_id TEXT,
    payment_gateway_response JSONB,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── SUBSCRIPTIONS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES clients(id),
    plan TEXT DEFAULT 'monthly',
    price NUMERIC DEFAULT 49.0,
    is_active BOOLEAN DEFAULT FALSE,
    ai_access_enabled BOOLEAN DEFAULT FALSE,
    auto_renew BOOLEAN DEFAULT TRUE,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Update payments FK for subscriptions
ALTER TABLE payments ADD CONSTRAINT fk_sub FOREIGN KEY (subscription_id) REFERENCES subscriptions(id);

-- ─── CONVERSATIONS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_type TEXT DEFAULT 'DIRECT' CHECK (conversation_type IN ('DIRECT','GROUP')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected')),
    requested_by UUID REFERENCES users(id),
    last_message_id UUID,
    last_message_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── CONVERSATION PARTICIPANTS ─────────────────────────────────
CREATE TABLE IF NOT EXISTS conversation_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    user_role TEXT,
    UNIQUE(conversation_id, user_id)
);

-- ─── MESSAGES ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES users(id),
    sender_role TEXT,
    content TEXT NOT NULL,
    message_type TEXT DEFAULT 'TEXT' CHECK (message_type IN ('TEXT','IMAGE','FILE')),
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Update conversations FK for last_message
ALTER TABLE conversations ADD CONSTRAINT fk_last_msg FOREIGN KEY (last_message_id) REFERENCES messages(id);

-- ─── MESSAGE READ BY ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS message_read_by (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    read_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(message_id, user_id)
);

-- ─── OTP CODES ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS otp_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT NOT NULL,
    otp TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── TEAM REQUESTS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS team_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_id UUID REFERENCES providers(id),
    user_id UUID REFERENCES users(id),
    request_type TEXT CHECK (request_type IN ('WORKER','CLIENT')),
    status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING','ACCEPTED','REJECTED')),
    message TEXT,
    responded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── SHOPS ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS shops (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID REFERENCES users(id),
    shop_type TEXT NOT NULL,
    name TEXT NOT NULL,
    service_id UUID REFERENCES services(id),
    custom_service TEXT,
    contact_number TEXT NOT NULL,
    description TEXT,
    area_id UUID REFERENCES areas(id),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- INDEXES
-- ═══════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id);
CREATE INDEX IF NOT EXISTS idx_workers_user_id ON workers(user_id);
CREATE INDEX IF NOT EXISTS idx_workers_provider_id ON workers(provider_id);
CREATE INDEX IF NOT EXISTS idx_providers_user_id ON providers(user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_client_id ON jobs(client_id);
CREATE INDEX IF NOT EXISTS idx_jobs_worker_id ON jobs(worker_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_area_id ON jobs(area_id);
CREATE INDEX IF NOT EXISTS idx_ratings_worker_id ON ratings(worker_id);
CREATE INDEX IF NOT EXISTS idx_ratings_job_id ON ratings(job_id);
CREATE INDEX IF NOT EXISTS idx_payments_client_id ON payments(client_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_client_id ON subscriptions(client_id);
CREATE INDEX IF NOT EXISTS idx_worker_areas_worker ON worker_areas(worker_id);
CREATE INDEX IF NOT EXISTS idx_worker_areas_area ON worker_areas(area_id);
CREATE INDEX IF NOT EXISTS idx_worker_services_worker ON worker_services(worker_id);
CREATE INDEX IF NOT EXISTS idx_worker_services_service ON worker_services(service_id);
CREATE INDEX IF NOT EXISTS idx_conv_participants_conv ON conversation_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conv_participants_user ON conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_message_read_by_msg ON message_read_by(message_id);
CREATE INDEX IF NOT EXISTS idx_otp_email ON otp_codes(email);
CREATE INDEX IF NOT EXISTS idx_team_requests_provider ON team_requests(provider_id);
CREATE INDEX IF NOT EXISTS idx_team_requests_user ON team_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_shops_owner ON shops(owner_id);
CREATE INDEX IF NOT EXISTS idx_shops_area ON shops(area_id);
