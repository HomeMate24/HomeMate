/**
 * Run this script to create all tables in Supabase.
 * Usage: node scripts/setup-supabase.js
 */
require('dotenv').config();
const { supabase } = require('../config/supabase');

const SQL = `
-- ============================================
-- Enable UUID extension
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password TEXT,
    phone TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('CLIENT', 'WORKER', 'PROVIDER')),
    google_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- AREAS
-- ============================================
CREATE TABLE IF NOT EXISTS areas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    city TEXT DEFAULT 'Pune',
    pincode TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SERVICES
-- ============================================
CREATE TABLE IF NOT EXISTS services (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    icon TEXT,
    is_active BOOLEAN DEFAULT true,
    base_price NUMERIC,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CLIENTS
-- ============================================
CREATE TABLE IF NOT EXISTS clients (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    address TEXT,
    area_id UUID REFERENCES areas(id),
    rating NUMERIC DEFAULT 5.0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PROVIDERS
-- ============================================
CREATE TABLE IF NOT EXISTS providers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    business_name TEXT NOT NULL,
    business_address TEXT,
    business_phone TEXT,
    description TEXT,
    profile_image TEXT,
    total_workers INTEGER DEFAULT 0,
    verification_status TEXT DEFAULT 'PENDING' CHECK (verification_status IN ('PENDING', 'VERIFIED', 'REJECTED')),
    verified_at TIMESTAMPTZ,
    total_revenue NUMERIC DEFAULT 0,
    total_bookings INTEGER DEFAULT 0,
    completed_jobs INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- WORKERS
-- ============================================
CREATE TABLE IF NOT EXISTS workers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    bio TEXT,
    profile_image TEXT,
    experience NUMERIC,
    hourly_rate NUMERIC,
    is_available BOOLEAN DEFAULT true,
    total_jobs INTEGER DEFAULT 0,
    completed_jobs INTEGER DEFAULT 0,
    average_rating NUMERIC DEFAULT 0.0,
    provider_id UUID REFERENCES providers(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- WORKER_AREAS (junction table)
-- ============================================
CREATE TABLE IF NOT EXISTS worker_areas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
    area_id UUID NOT NULL REFERENCES areas(id) ON DELETE CASCADE,
    UNIQUE(worker_id, area_id)
);

-- ============================================
-- WORKER_SERVICES (junction table)
-- ============================================
CREATE TABLE IF NOT EXISTS worker_services (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    UNIQUE(worker_id, service_id)
);

-- ============================================
-- JOBS
-- ============================================
CREATE TABLE IF NOT EXISTS jobs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID NOT NULL REFERENCES clients(id),
    worker_id UUID REFERENCES workers(id),
    service_id UUID NOT NULL REFERENCES services(id),
    area_id UUID NOT NULL REFERENCES areas(id),
    description TEXT NOT NULL,
    scheduled_at TIMESTAMPTZ NOT NULL,
    address TEXT NOT NULL,
    status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'IN_REVIEW', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'REJECTED')),
    estimated_price NUMERIC NOT NULL,
    final_price NUMERIC,
    accepted_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    expired BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- RATINGS
-- ============================================
CREATE TABLE IF NOT EXISTS ratings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    job_id UUID NOT NULL UNIQUE REFERENCES jobs(id),
    client_id UUID NOT NULL REFERENCES clients(id),
    worker_id UUID NOT NULL REFERENCES workers(id),
    rating NUMERIC NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PAYMENTS
-- ============================================
CREATE TABLE IF NOT EXISTS payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID NOT NULL REFERENCES clients(id),
    job_id UUID UNIQUE REFERENCES jobs(id),
    subscription_id UUID UNIQUE,
    amount NUMERIC NOT NULL,
    payment_type TEXT NOT NULL CHECK (payment_type IN ('JOB_PAYMENT', 'SUBSCRIPTION')),
    status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED')),
    payment_method TEXT,
    transaction_id TEXT UNIQUE,
    payment_gateway_response JSONB,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SUBSCRIPTIONS
-- ============================================
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID NOT NULL UNIQUE REFERENCES clients(id),
    plan TEXT DEFAULT 'monthly',
    price NUMERIC DEFAULT 49.0,
    is_active BOOLEAN DEFAULT false,
    ai_access_enabled BOOLEAN DEFAULT false,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    auto_renew BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add FK for payments.subscription_id now that subscriptions table exists
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_subscription_id_fkey;
ALTER TABLE payments ADD CONSTRAINT payments_subscription_id_fkey 
    FOREIGN KEY (subscription_id) REFERENCES subscriptions(id);

-- ============================================
-- CONVERSATIONS
-- ============================================
CREATE TABLE IF NOT EXISTS conversations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_type TEXT DEFAULT 'DIRECT' CHECK (conversation_type IN ('DIRECT', 'GROUP')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    requested_by UUID NOT NULL REFERENCES users(id),
    last_message_id UUID,
    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CONVERSATION_PARTICIPANTS (junction table)
-- ============================================
CREATE TABLE IF NOT EXISTS conversation_participants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_role TEXT NOT NULL CHECK (user_role IN ('CLIENT', 'WORKER', 'PROVIDER')),
    UNIQUE(conversation_id, user_id)
);

-- ============================================
-- MESSAGES
-- ============================================
CREATE TABLE IF NOT EXISTS messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID NOT NULL REFERENCES conversations(id),
    sender_id UUID NOT NULL REFERENCES users(id),
    sender_role TEXT NOT NULL CHECK (sender_role IN ('CLIENT', 'WORKER', 'PROVIDER')),
    content TEXT NOT NULL,
    message_type TEXT DEFAULT 'TEXT' CHECK (message_type IN ('TEXT', 'IMAGE', 'FILE')),
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add FK for conversations.last_message_id
ALTER TABLE conversations DROP CONSTRAINT IF EXISTS conversations_last_message_id_fkey;
ALTER TABLE conversations ADD CONSTRAINT conversations_last_message_id_fkey 
    FOREIGN KEY (last_message_id) REFERENCES messages(id);

-- ============================================
-- MESSAGE_READ_BY (junction table)
-- ============================================
CREATE TABLE IF NOT EXISTS message_read_by (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    read_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(message_id, user_id)
);

-- ============================================
-- OTP_CODES
-- ============================================
CREATE TABLE IF NOT EXISTS otp_codes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL,
    otp TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '5 minutes'),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TEAM_REQUESTS
-- ============================================
CREATE TABLE IF NOT EXISTS team_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    provider_id UUID NOT NULL REFERENCES providers(id),
    user_id UUID NOT NULL REFERENCES users(id),
    request_type TEXT NOT NULL CHECK (request_type IN ('WORKER', 'CLIENT')),
    status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'REJECTED')),
    message TEXT,
    responded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SHOPS
-- ============================================
CREATE TABLE IF NOT EXISTS shops (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    owner_id UUID NOT NULL REFERENCES users(id),
    shop_type TEXT NOT NULL CHECK (shop_type IN ('individual', 'company')),
    name TEXT NOT NULL,
    service_id UUID REFERENCES services(id),
    custom_service TEXT,
    contact_number TEXT NOT NULL,
    description TEXT NOT NULL,
    area_id UUID REFERENCES areas(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
CREATE INDEX IF NOT EXISTS idx_clients_area_id ON clients(area_id);
CREATE INDEX IF NOT EXISTS idx_workers_is_available ON workers(is_available);
CREATE INDEX IF NOT EXISTS idx_workers_average_rating ON workers(average_rating DESC);
CREATE INDEX IF NOT EXISTS idx_workers_provider_id ON workers(provider_id);
CREATE INDEX IF NOT EXISTS idx_worker_areas_worker_id ON worker_areas(worker_id);
CREATE INDEX IF NOT EXISTS idx_worker_areas_area_id ON worker_areas(area_id);
CREATE INDEX IF NOT EXISTS idx_worker_services_worker_id ON worker_services(worker_id);
CREATE INDEX IF NOT EXISTS idx_worker_services_service_id ON worker_services(service_id);
CREATE INDEX IF NOT EXISTS idx_jobs_client_id ON jobs(client_id);
CREATE INDEX IF NOT EXISTS idx_jobs_worker_id ON jobs(worker_id);
CREATE INDEX IF NOT EXISTS idx_jobs_area_id ON jobs(area_id);
CREATE INDEX IF NOT EXISTS idx_jobs_service_id ON jobs(service_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_expires_at ON jobs(expires_at);
CREATE INDEX IF NOT EXISTS idx_ratings_worker_id ON ratings(worker_id);
CREATE INDEX IF NOT EXISTS idx_payments_client_id ON payments(client_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_conversations_requested_by ON conversations(requested_by);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at ON conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_conv_participants_conversation ON conversation_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conv_participants_user ON conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_message_read_by_message ON message_read_by(message_id);
CREATE INDEX IF NOT EXISTS idx_otp_codes_email_otp ON otp_codes(email, otp);
CREATE INDEX IF NOT EXISTS idx_otp_codes_expires ON otp_codes(expires_at);
CREATE INDEX IF NOT EXISTS idx_team_requests_user_status ON team_requests(user_id, status);
CREATE INDEX IF NOT EXISTS idx_team_requests_provider_status ON team_requests(provider_id, status);
CREATE INDEX IF NOT EXISTS idx_shops_owner ON shops(owner_id);
CREATE INDEX IF NOT EXISTS idx_shops_service ON shops(service_id);
CREATE INDEX IF NOT EXISTS idx_shops_area ON shops(area_id);
CREATE INDEX IF NOT EXISTS idx_shops_is_active ON shops(is_active);

-- ============================================
-- UPDATE TIMESTAMP TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
    t TEXT;
BEGIN
    FOR t IN SELECT unnest(ARRAY[
        'users', 'areas', 'services', 'clients', 'providers', 'workers',
        'jobs', 'ratings', 'payments', 'subscriptions', 'conversations',
        'messages', 'otp_codes', 'team_requests', 'shops'
    ]) LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS update_%s_updated_at ON %s', t, t);
        EXECUTE format('CREATE TRIGGER update_%s_updated_at BEFORE UPDATE ON %s FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', t, t);
    END LOOP;
END $$;

-- ============================================
-- RPC: Increment a numeric field
-- ============================================
CREATE OR REPLACE FUNCTION increment_field(table_name TEXT, row_id UUID, field_name TEXT, amount NUMERIC)
RETURNS VOID AS $$
BEGIN
    EXECUTE format('UPDATE %I SET %I = %I + $1 WHERE id = $2', table_name, field_name, field_name)
    USING amount, row_id;
END;
$$ LANGUAGE plpgsql;

-- Disable RLS for all tables (since auth is handled by JWT in Express)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_read_by ENABLE ROW LEVEL SECURITY;
ALTER TABLE otp_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE shops ENABLE ROW LEVEL SECURITY;

-- Create policies to allow all operations (since our Express backend handles auth via JWT)
DO $$
DECLARE
    t TEXT;
BEGIN
    FOR t IN SELECT unnest(ARRAY[
        'users', 'areas', 'services', 'clients', 'providers', 'workers',
        'worker_areas', 'worker_services', 'jobs', 'ratings', 'payments',
        'subscriptions', 'conversations', 'conversation_participants',
        'messages', 'message_read_by', 'otp_codes', 'team_requests', 'shops'
    ]) LOOP
        EXECUTE format('DROP POLICY IF EXISTS allow_all_%s ON %s', t, t);
        EXECUTE format('CREATE POLICY allow_all_%s ON %s FOR ALL USING (true) WITH CHECK (true)', t, t);
    END LOOP;
END $$;
`;

async function setup() {
    console.log('🚀 Setting up Supabase tables...');
    
    const { data, error } = await supabase.rpc('', {}).then(() => null).catch(() => null);
    
    // Use the SQL Editor approach - execute via REST API
    const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/`, {
        method: 'POST',
        headers: {
            'apikey': process.env.SUPABASE_KEY,
            'Content-Type': 'application/json'
        }
    });

    console.log('\n📋 SQL Schema generated. Please run the following SQL in Supabase Dashboard:');
    console.log('   1. Go to https://supabase.com/dashboard');
    console.log('   2. Open your project');
    console.log('   3. Go to SQL Editor');
    console.log('   4. Paste the SQL from: backend/scripts/schema.sql');
    console.log('   5. Click "Run"\n');
    
    // Write SQL to file for easy copy-paste
    const fs = require('fs');
    const path = require('path');
    fs.writeFileSync(path.join(__dirname, 'schema.sql'), SQL);
    console.log('✅ SQL written to backend/scripts/schema.sql');
}

setup().catch(console.error);
