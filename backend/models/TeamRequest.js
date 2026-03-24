const { supabase } = require('../config/supabase');

const mapRow = (row) => {
    if (!row) return null;
    return {
        ...row, _id: row.id,
        providerId: row.provider_id,
        userId: row.user_id,
        requestType: row.request_type,
        respondedAt: row.responded_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
};
const mapRows = (rows) => (rows || []).map(mapRow);

module.exports = {
    async findById(id) {
        const { data, error } = await supabase.from('team_requests').select('*').eq('id', id).single();
        if (error && error.code === 'PGRST116') return null;
        if (error) throw error;
        return mapRow(data);
    },

    async findOne(filters) {
        let q = supabase.from('team_requests').select('*');
        if (filters._id || filters.id) q = q.eq('id', filters._id || filters.id);
        if (filters.providerId || filters.provider_id) q = q.eq('provider_id', filters.providerId || filters.provider_id);
        if (filters.userId || filters.user_id) q = q.eq('user_id', filters.userId || filters.user_id);
        if (filters.status) q = q.eq('status', filters.status);
        const { data, error } = await q.limit(1).maybeSingle();
        if (error) throw error;
        return mapRow(data);
    },

    async find(filters = {}, options = {}) {
        let q = supabase.from('team_requests').select('*');
        if (filters.providerId || filters.provider_id) q = q.eq('provider_id', filters.providerId || filters.provider_id);
        if (filters.userId || filters.user_id) q = q.eq('user_id', filters.userId || filters.user_id);
        if (filters.status) q = q.eq('status', filters.status);

        q = q.order('created_at', { ascending: false });
        if (options.limit) q = q.limit(options.limit);

        const { data, error } = await q;
        if (error) throw error;
        return mapRows(data);
    },

    async create(requestData) {
        const row = {
            provider_id: requestData.providerId,
            user_id: requestData.userId,
            request_type: requestData.requestType,
            status: requestData.status || 'PENDING',
            message: requestData.message || null
        };
        const { data, error } = await supabase.from('team_requests').insert(row).select().single();
        if (error) throw error;
        return mapRow(data);
    },

    async updateById(id, updates) {
        const row = {};
        if (updates.status !== undefined) row.status = updates.status;
        if (updates.respondedAt !== undefined) row.responded_at = updates.respondedAt;
        if (updates.message !== undefined) row.message = updates.message;

        const { data, error } = await supabase.from('team_requests').update(row).eq('id', id).select().single();
        if (error) throw error;
        return mapRow(data);
    },

    async save(request) {
        return this.updateById(request.id || request._id, request);
    },

    /**
     * Populate request with provider and user data
     */
    async populate(request, fields = ['providerId', 'userId']) {
        if (!request) return null;
        const Provider = require('./Provider');
        const User = require('./User');

        if (fields.includes('providerId') && request.provider_id) {
            const provider = await Provider.findById(request.provider_id);
            if (provider) {
                // Also populate the provider's user data
                const providerUser = await User.findById(provider.user_id, 'id, name, email, phone');
                if (providerUser) provider.userId = providerUser;
                request.providerId = provider;
            }
        }
        if (fields.includes('userId') && request.user_id) {
            const user = await User.findById(request.user_id, 'id, name, email, phone');
            if (user) request.userId = user;
        }
        return request;
    },

    /**
     * Populate an array of requests
     */
    async populateMany(requests, fields = ['providerId', 'userId']) {
        for (const r of requests) {
            await this.populate(r, fields);
        }
        return requests;
    }
};
