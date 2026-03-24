const { supabase } = require('../config/supabase');
const mapRow = (row) => {
    if (!row) return null;
    return { ...row, _id: row.id, clientId: row.client_id, isActive: row.is_active, aiAccessEnabled: row.ai_access_enabled, startDate: row.start_date, endDate: row.end_date, autoRenew: row.auto_renew };
};

module.exports = {
    async findById(id) {
        const { data, error } = await supabase.from('subscriptions').select('*').eq('id', id).single();
        if (error && error.code === 'PGRST116') return null;
        if (error) throw error;
        return mapRow(data);
    },
    async findOne(filters) {
        let q = supabase.from('subscriptions').select('*');
        if (filters.clientId || filters.client_id) q = q.eq('client_id', filters.clientId || filters.client_id);
        if (filters._id || filters.id) q = q.eq('id', filters._id || filters.id);
        const { data, error } = await q.limit(1).maybeSingle();
        if (error) throw error;
        return mapRow(data);
    },
    async create(subData) {
        const row = {
            client_id: subData.clientId,
            plan: subData.plan || 'monthly',
            price: subData.price || 49.0,
            is_active: subData.isActive || false,
            ai_access_enabled: subData.aiAccessEnabled || false,
            start_date: subData.startDate || null,
            end_date: subData.endDate || null,
            auto_renew: subData.autoRenew !== undefined ? subData.autoRenew : true
        };
        const { data, error } = await supabase.from('subscriptions').insert(row).select().single();
        if (error) throw error;
        return mapRow(data);
    },
    async updateById(id, updates) {
        const row = {};
        if (updates.isActive !== undefined) row.is_active = updates.isActive;
        if (updates.aiAccessEnabled !== undefined) row.ai_access_enabled = updates.aiAccessEnabled;
        if (updates.startDate !== undefined) row.start_date = updates.startDate;
        if (updates.endDate !== undefined) row.end_date = updates.endDate;
        if (updates.autoRenew !== undefined) row.auto_renew = updates.autoRenew;
        const { data, error } = await supabase.from('subscriptions').update(row).eq('id', id).select().single();
        if (error) throw error;
        return mapRow(data);
    },
    async save(sub) {
        const row = {
            is_active: sub.isActive !== undefined ? sub.isActive : sub.is_active,
            ai_access_enabled: sub.aiAccessEnabled !== undefined ? sub.aiAccessEnabled : sub.ai_access_enabled,
            auto_renew: sub.autoRenew !== undefined ? sub.autoRenew : sub.auto_renew,
            start_date: sub.startDate || sub.start_date || null,
            end_date: sub.endDate || sub.end_date || null
        };
        const { data, error } = await supabase.from('subscriptions').update(row).eq('id', sub.id || sub._id).select().single();
        if (error) throw error;
        return mapRow(data);
    }
};
