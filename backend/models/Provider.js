const { supabase } = require('../config/supabase');

const mapRow = (row) => {
    if (!row) return null;
    return {
        ...row, _id: row.id,
        userId: row.user_id,
        businessName: row.business_name,
        businessAddress: row.business_address,
        businessPhone: row.business_phone,
        profileImage: row.profile_image,
        totalWorkers: row.total_workers,
        verificationStatus: row.verification_status,
        verifiedAt: row.verified_at,
        totalRevenue: row.total_revenue,
        totalBookings: row.total_bookings,
        completedJobs: row.completed_jobs
    };
};
const mapRows = (rows) => (rows || []).map(mapRow);

module.exports = {
    async findById(id) {
        const { data, error } = await supabase.from('providers').select('*').eq('id', id).single();
        if (error && error.code === 'PGRST116') return null;
        if (error) throw error;
        return mapRow(data);
    },

    async findOne(filters) {
        let q = supabase.from('providers').select('*');
        if (filters.userId || filters.user_id) q = q.eq('user_id', filters.userId || filters.user_id);
        if (filters._id || filters.id) q = q.eq('id', filters._id || filters.id);
        const { data, error } = await q.limit(1).maybeSingle();
        if (error) throw error;
        return mapRow(data);
    },

    async create(providerData) {
        const row = {
            user_id: providerData.userId,
            business_name: providerData.businessName,
            business_address: providerData.businessAddress || null,
            business_phone: providerData.businessPhone || null,
            description: providerData.description || null,
            profile_image: providerData.profileImage || null
        };
        const { data, error } = await supabase.from('providers').insert(row).select().single();
        if (error) throw error;
        return mapRow(data);
    },

    async updateById(id, updates) {
        const row = {};
        if (updates.businessName !== undefined) row.business_name = updates.businessName;
        if (updates.businessAddress !== undefined) row.business_address = updates.businessAddress;
        if (updates.businessPhone !== undefined) row.business_phone = updates.businessPhone;
        if (updates.description !== undefined) row.description = updates.description;
        if (updates.profileImage !== undefined) row.profile_image = updates.profileImage;
        if (updates.totalWorkers !== undefined) row.total_workers = updates.totalWorkers;
        if (updates.verificationStatus !== undefined) row.verification_status = updates.verificationStatus;
        if (updates.totalRevenue !== undefined) row.total_revenue = updates.totalRevenue;
        if (updates.totalBookings !== undefined) row.total_bookings = updates.totalBookings;
        if (updates.completedJobs !== undefined) row.completed_jobs = updates.completedJobs;

        if (Object.keys(row).length > 0) {
            const { data, error } = await supabase.from('providers').update(row).eq('id', id).select().single();
            if (error) throw error;
            return mapRow(data);
        }
        return this.findById(id);
    },

    async increment(id, field, amount) {
        const fieldMap = { totalWorkers: 'total_workers', totalBookings: 'total_bookings', completedJobs: 'completed_jobs', totalRevenue: 'total_revenue' };
        const col = fieldMap[field] || field;
        const { data: current } = await supabase.from('providers').select(col).eq('id', id).single();
        if (!current) return;
        const { error } = await supabase.from('providers').update({ [col]: (current[col] || 0) + amount }).eq('id', id);
        if (error) throw error;
    },

    async populate(provider, fields = ['userId']) {
        if (!provider) return null;
        if (fields.includes('userId') && !provider.userId?.name) {
            const User = require('./User');
            const user = await User.findById(provider.user_id || provider.userId);
            if (user) provider.userId = user;
        }
        return provider;
    }
};
