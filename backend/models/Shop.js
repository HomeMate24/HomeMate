const { supabase } = require('../config/supabase');

const mapRow = (row) => {
    if (!row) return null;
    return {
        ...row, _id: row.id,
        ownerId: row.owner_id,
        shopType: row.shop_type,
        serviceId: row.service_id,
        customService: row.custom_service,
        contactNumber: row.contact_number,
        areaId: row.area_id,
        isActive: row.is_active,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
};
const mapRows = (rows) => (rows || []).map(mapRow);

module.exports = {
    async findById(id) {
        const { data, error } = await supabase.from('shops').select('*').eq('id', id).single();
        if (error && error.code === 'PGRST116') return null;
        if (error) throw error;
        return mapRow(data);
    },

    async find(filters = {}, options = {}) {
        let q = supabase.from('shops').select('*');
        if (filters.ownerId || filters.owner_id) q = q.eq('owner_id', filters.ownerId || filters.owner_id);
        if (filters.isActive !== undefined || filters.is_active !== undefined) {
            q = q.eq('is_active', filters.isActive !== undefined ? filters.isActive : filters.is_active);
        }

        // Text search using ilike on name, description, and custom_service
        if (filters.search) {
            const term = `%${filters.search}%`;
            q = q.or(`name.ilike.${term},description.ilike.${term},custom_service.ilike.${term}`);
        }

        q = q.order('created_at', { ascending: false });
        if (options.limit) q = q.limit(options.limit);

        const { data, error } = await q;
        if (error) throw error;
        return mapRows(data);
    },

    async create(shopData) {
        const row = {
            owner_id: shopData.ownerId,
            shop_type: shopData.shopType,
            name: shopData.name,
            service_id: shopData.serviceId || null,
            custom_service: shopData.customService || null,
            contact_number: shopData.contactNumber,
            description: shopData.description,
            area_id: shopData.areaId || null,
            is_active: shopData.isActive !== undefined ? shopData.isActive : true
        };
        const { data, error } = await supabase.from('shops').insert(row).select().single();
        if (error) throw error;
        return mapRow(data);
    },

    async updateById(id, updates) {
        const row = {};
        if (updates.shopType !== undefined) row.shop_type = updates.shopType;
        if (updates.name !== undefined) row.name = updates.name;
        if (updates.serviceId !== undefined) row.service_id = updates.serviceId;
        if (updates.customService !== undefined) row.custom_service = updates.customService;
        if (updates.contactNumber !== undefined) row.contact_number = updates.contactNumber;
        if (updates.description !== undefined) row.description = updates.description;
        if (updates.areaId !== undefined) row.area_id = updates.areaId;
        if (updates.isActive !== undefined) row.is_active = updates.isActive;

        const { data, error } = await supabase.from('shops').update(row).eq('id', id).select().single();
        if (error) throw error;
        return mapRow(data);
    },

    async save(shop) {
        return this.updateById(shop.id || shop._id, {
            shopType: shop.shopType || shop.shop_type,
            name: shop.name,
            serviceId: shop.serviceId || shop.service_id,
            customService: shop.customService || shop.custom_service,
            contactNumber: shop.contactNumber || shop.contact_number,
            description: shop.description,
            areaId: shop.areaId || shop.area_id,
            isActive: shop.isActive !== undefined ? shop.isActive : shop.is_active
        });
    },

    async deleteById(id) {
        const { error } = await supabase.from('shops').delete().eq('id', id);
        if (error) throw error;
    },

    /**
     * Populate shop with owner, service, and area data
     */
    async populate(shop, fields = ['ownerId', 'serviceId', 'areaId']) {
        if (!shop) return null;
        const User = require('./User');
        const Service = require('./Service');
        const Area = require('./Area');

        if (fields.includes('ownerId') && shop.owner_id) {
            const user = await User.findById(shop.owner_id, 'id, name, email, role');
            if (user) shop.ownerId = user;
        }
        if (fields.includes('serviceId') && shop.service_id) {
            const service = await Service.findById(shop.service_id);
            if (service) shop.serviceId = service;
        }
        if (fields.includes('areaId') && shop.area_id) {
            const area = await Area.findById(shop.area_id);
            if (area) shop.areaId = area;
        }
        return shop;
    }
};
