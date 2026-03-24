const { supabase } = require('../config/supabase');

const mapRow = (row) => {
    if (!row) return null;
    return { ...row, _id: row.id };
};
const mapRows = (rows) => (rows || []).map(mapRow);

module.exports = {
    async findById(id) {
        const { data, error } = await supabase.from('areas').select('*').eq('id', id).single();
        if (error && error.code === 'PGRST116') return null;
        if (error) throw error;
        return mapRow(data);
    },

    async find(filters = {}, options = {}) {
        let q = supabase.from('areas').select('*');
        if (filters.isActive !== undefined || filters.is_active !== undefined) {
            q = q.eq('is_active', filters.isActive !== undefined ? filters.isActive : filters.is_active);
        }
        if (options.orderBy) {
            q = q.order(options.orderBy[0], { ascending: options.orderBy[1] !== 'desc' });
        } else {
            q = q.order('name', { ascending: true });
        }
        const { data, error } = await q;
        if (error) throw error;
        return mapRows(data);
    },

    async create(areaData) {
        const row = {
            name: areaData.name,
            city: areaData.city || 'Pune',
            pincode: areaData.pincode || null
        };
        const { data, error } = await supabase.from('areas').insert(row).select().single();
        if (error) {
            if (error.code === '23505') {
                const e = new Error('Duplicate');
                e.code = 11000;
                throw e;
            }
            throw error;
        }
        return mapRow(data);
    }
};
