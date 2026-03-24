const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.warn('⚠️  SUPABASE_URL or SUPABASE_KEY not set in environment variables');
}

const supabase = createClient(supabaseUrl || '', supabaseKey || '', {
    auth: { persistSession: false }
});

module.exports = { supabase };
