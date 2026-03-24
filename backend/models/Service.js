const { supabase } = require('../config/supabase');

const mapRow = (row) => {
    if (!row) return null;
    return { ...row, _id: row.id, isActive: row.is_active, basePrice: row.base_price };
};
const mapRows = (rows) => (rows || []).map(mapRow);

module.exports = {
    async findById(id) {
        const { data, error } = await supabase.from('services').select('*').eq('id', id).single();
        if (error && error.code === 'PGRST116') return null;
        if (error) throw error;
        return mapRow(data);
    },

    async find(filters = {}) {
        let q = supabase.from('services').select('*');
        if (filters.isActive !== undefined || filters.is_active !== undefined) {
            q = q.eq('is_active', filters.isActive !== undefined ? filters.isActive : filters.is_active);
        }
        q = q.order('name', { ascending: true });
        const { data, error } = await q;
        if (error) throw error;
        return mapRows(data);
    },

    async create(serviceData) {
        const row = {
            name: serviceData.name,
            description: serviceData.description || null,
            icon: serviceData.icon || null,
            base_price: serviceData.basePrice || null
        };
        const { data, error } = await supabase.from('services').insert(row).select().single();
        if (error) {
            if (error.code === '23505') {
                const e = new Error('Duplicate');
                e.code = 11000;
                throw e;
            }
            throw error;
        }
        return mapRow(data);
    },

    async findByIds(ids) {
        if (!ids || ids.length === 0) return [];
        const { data, error } = await supabase.from('services').select('*').in('id', ids);
        if (error) throw error;
        return mapRows(data);
    }
};
