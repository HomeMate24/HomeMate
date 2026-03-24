const { supabase } = require('../config/supabase');

const mapRow = (row) => {
    if (!row) return null;
    return { ...row, _id: row.id, expiresAt: row.expires_at, createdAt: row.created_at };
};

module.exports = {
    async findOne(filters) {
        let q = supabase.from('otp_codes').select('*');
        if (filters.email) q = q.eq('email', filters.email.toLowerCase());
        if (filters.otp) q = q.eq('otp', filters.otp);
        // Handle expiresAt: { $gt: new Date() }
        if (filters.expiresAt && filters.expiresAt.$gt) {
            q = q.gt('expires_at', filters.expiresAt.$gt.toISOString());
        }
        const { data, error } = await q.limit(1).maybeSingle();
        if (error) throw error;
        return mapRow(data);
    },

    async create(otpData) {
        const row = {
            email: otpData.email.toLowerCase(),
            otp: otpData.otp,
            expires_at: otpData.expiresAt || new Date(Date.now() + 5 * 60 * 1000)
        };
        const { data, error } = await supabase.from('otp_codes').insert(row).select().single();
        if (error) throw error;
        return mapRow(data);
    },

    async deleteMany(filters) {
        let q = supabase.from('otp_codes').delete();
        if (filters.email) q = q.eq('email', filters.email.toLowerCase());
        const { error } = await q;
        if (error) throw error;
    }
};
