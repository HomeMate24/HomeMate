const { supabase } = require('../config/supabase');

const mapRow = (row) => {
    if (!row) return null;
    return { ...row, _id: row.id, userId: row.user_id, areaId: row.area_id };
};
const mapRows = (rows) => (rows || []).map(mapRow);

module.exports = {
    async findById(id) {
        const { data, error } = await supabase.from('clients').select('*').eq('id', id).single();
        if (error && error.code === 'PGRST116') return null;
        if (error) throw error;
        return mapRow(data);
    },

    async findOne(filters) {
        let q = supabase.from('clients').select('*');
        if (filters.userId || filters.user_id) q = q.eq('user_id', filters.userId || filters.user_id);
        if (filters._id || filters.id) q = q.eq('id', filters._id || filters.id);
        const { data, error } = await q.limit(1).maybeSingle();
        if (error) throw error;
        return mapRow(data);
    },

    async create(clientData) {
        const row = {
            user_id: clientData.userId,
            address: clientData.address || null,
            area_id: clientData.areaId || null,
            rating: clientData.rating !== undefined ? clientData.rating : 5.0
        };
        const { data, error } = await supabase.from('clients').insert(row).select().single();
        if (error) throw error;
        return mapRow(data);
    },

    async updateById(id, updates) {
        const row = {};
        if (updates.address !== undefined) row.address = updates.address;
        if (updates.areaId !== undefined || updates.area_id !== undefined) row.area_id = updates.areaId || updates.area_id;
        if (updates.rating !== undefined) row.rating = updates.rating;
        const { data, error } = await supabase.from('clients').update(row).eq('id', id).select().single();
        if (error) throw error;
        return mapRow(data);
    },

    async save(client) {
        const row = {
            address: client.address,
            area_id: client.areaId || client.area_id || null,
            rating: client.rating
        };
        const { data, error } = await supabase.from('clients').update(row).eq('id', client.id || client._id).select().single();
        if (error) throw error;
        return mapRow(data);
    },

    /**
     * Find client with populated area data
     */
    async findOnePopulated(filters) {
        const client = await this.findOne(filters);
        if (!client) return null;
        if (client.area_id) {
            const Area = require('./Area');
            client.areaId = await Area.findById(client.area_id);
        }
        return client;
    }
};
