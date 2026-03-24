const { supabase } = require('../config/supabase');

// Helper to map Supabase row to Mongoose-like format (adds _id alias)
const mapRow = (row) => {
    if (!row) return null;
    return { ...row, _id: row.id };
};

const mapRows = (rows) => (rows || []).map(mapRow);

module.exports = {
    /**
     * Find user by ID
     */
    async findById(id, selectFields) {
        const q = supabase.from('users').select(selectFields || '*').eq('id', id).single();
        const { data, error } = await q;
        if (error && error.code === 'PGRST116') return null;
        if (error) throw error;
        return mapRow(data);
    },

    /**
     * Find one user matching filters
     * Supports: { email }, { phone }, { googleId }, { $or: [{email}, {phone}] }
     */
    async findOne(filters, selectFields) {
        let q = supabase.from('users').select(selectFields || '*');

        if (filters.$or) {
            // Build OR filter string for Supabase
            const orParts = filters.$or.map(f => {
                const entries = Object.entries(f);
                return entries.map(([k, v]) => {
                    const col = k === 'googleId' ? 'google_id' : k;
                    return `${col}.eq.${v}`;
                }).join(',');
            });
            q = q.or(orParts.join(','));
        } else {
            for (const [key, value] of Object.entries(filters)) {
                if (key === '_id' || key === 'id') q = q.eq('id', value);
                else if (key === 'googleId') q = q.eq('google_id', value);
                else q = q.eq(key, value);
            }
        }

        const { data, error } = await q.limit(1).maybeSingle();
        if (error) throw error;
        return mapRow(data);
    },

    /**
     * Find users matching filters
     */
    async find(filters = {}, options = {}) {
        let q = supabase.from('users').select(options.select || '*');

        if (filters._id && filters._id.$ne) {
            q = q.neq('id', filters._id.$ne);
        }
        if (filters.name && filters.name.$regex) {
            q = q.ilike('name', `%${filters.name.$regex}%`);
        }
        if (filters.role) q = q.eq('role', filters.role);

        if (options.limit) q = q.limit(options.limit);
        if (options.orderBy) {
            const [col, dir] = options.orderBy;
            q = q.order(col, { ascending: dir === 'asc' });
        }

        const { data, error } = await q;
        if (error) throw error;
        return mapRows(data);
    },

    /**
     * Create a new user
     */
    async create(userData) {
        const row = {
            email: userData.email,
            password: userData.password || null,
            phone: userData.phone,
            name: userData.name,
            role: userData.role,
            google_id: userData.googleId || null
        };
        const { data, error } = await supabase.from('users').insert(row).select().single();
        if (error) throw error;
        return mapRow(data);
    },

    /**
     * Update user by ID
     */
    async updateById(id, updates) {
        const row = {};
        if (updates.googleId !== undefined) row.google_id = updates.googleId;
        if (updates.name !== undefined) row.name = updates.name;
        if (updates.email !== undefined) row.email = updates.email;
        if (updates.phone !== undefined) row.phone = updates.phone;
        if (updates.password !== undefined) row.password = updates.password;

        const { data, error } = await supabase.from('users').update(row).eq('id', id).select().single();
        if (error) throw error;
        return mapRow(data);
    },

    /**
     * Save user (update all fields) - mimics mongoose .save()
     */
    async save(user) {
        const row = {
            email: user.email,
            password: user.password,
            phone: user.phone,
            name: user.name,
            role: user.role,
            google_id: user.googleId || user.google_id || null
        };
        const { data, error } = await supabase.from('users').update(row).eq('id', user.id || user._id).select().single();
        if (error) throw error;
        return mapRow(data);
    }
};
