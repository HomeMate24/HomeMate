const { supabase } = require('../config/supabase');

const mapRow = (row) => {
    if (!row) return null;
    return {
        ...row, _id: row.id,
        clientId: row.client_id,
        workerId: row.worker_id,
        serviceId: row.service_id,
        areaId: row.area_id,
        scheduledAt: row.scheduled_at,
        estimatedPrice: row.estimated_price,
        finalPrice: row.final_price,
        acceptedAt: row.accepted_at,
        completedAt: row.completed_at,
        expiresAt: row.expires_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
};
const mapRows = (rows) => (rows || []).map(mapRow);

module.exports = {
    async findById(id) {
        const { data, error } = await supabase.from('jobs').select('*').eq('id', id).single();
        if (error && error.code === 'PGRST116') return null;
        if (error) throw error;
        return mapRow(data);
    },

    async findOne(filters) {
        let q = supabase.from('jobs').select('*');
        if (filters._id || filters.id) q = q.eq('id', filters._id || filters.id);
        if (filters.clientId || filters.client_id) q = q.eq('client_id', filters.clientId || filters.client_id);
        if (filters.workerId || filters.worker_id) q = q.eq('worker_id', filters.workerId || filters.worker_id);
        if (filters.status) q = q.eq('status', filters.status);
        const { data, error } = await q.limit(1).maybeSingle();
        if (error) throw error;
        return mapRow(data);
    },

    async find(filters = {}, options = {}) {
        let q = supabase.from('jobs').select('*', options.count ? { count: 'exact' } : {});

        if (filters.clientId || filters.client_id) q = q.eq('client_id', filters.clientId || filters.client_id);
        if (filters.workerId || filters.worker_id) q = q.eq('worker_id', filters.workerId || filters.worker_id);
        if (filters.serviceId || filters.service_id) q = q.eq('service_id', filters.serviceId || filters.service_id);
        if (filters.status) q = q.eq('status', filters.status);
        if (filters.expired !== undefined) q = q.eq('expired', filters.expired);

        // Handle $in for worker_id
        if (filters.workerIdIn) q = q.in('worker_id', filters.workerIdIn);
        // Handle $in for area_id
        if (filters.areaIdIn) q = q.in('area_id', filters.areaIdIn);

        // Handle expiresAt <= now
        if (filters.expiresAtLte) q = q.lte('expires_at', filters.expiresAtLte);

        if (options.orderBy) {
            const col = options.orderBy[0] === 'createdAt' ? 'created_at' : options.orderBy[0] === 'completedAt' ? 'completed_at' : options.orderBy[0] === 'scheduledAt' ? 'scheduled_at' : options.orderBy[0];
            q = q.order(col, { ascending: options.orderBy[1] !== -1 && options.orderBy[1] !== 'desc' });
        } else {
            q = q.order('created_at', { ascending: false });
        }

        if (options.limit) q = q.limit(options.limit);

        const { data, error, count } = await q;
        if (error) throw error;
        const result = mapRows(data);
        if (options.count) result.count = count;
        return result;
    },

    async create(jobData) {
        const row = {
            client_id: jobData.clientId,
            worker_id: jobData.workerId || null,
            service_id: jobData.serviceId,
            area_id: jobData.areaId,
            description: jobData.description,
            scheduled_at: jobData.scheduledAt,
            address: jobData.address,
            status: jobData.status || 'PENDING',
            estimated_price: jobData.estimatedPrice,
            final_price: jobData.finalPrice || null,
            accepted_at: jobData.acceptedAt || null,
            completed_at: jobData.completedAt || null,
            expires_at: jobData.expiresAt || null
        };
        const { data, error } = await supabase.from('jobs').insert(row).select().single();
        if (error) throw error;
        return mapRow(data);
    },

    async updateById(id, updates) {
        const row = {};
        if (updates.workerId !== undefined || updates.worker_id !== undefined) row.worker_id = updates.workerId || updates.worker_id;
        if (updates.status !== undefined) row.status = updates.status;
        if (updates.finalPrice !== undefined || updates.final_price !== undefined) row.final_price = updates.finalPrice || updates.final_price;
        if (updates.acceptedAt !== undefined) row.accepted_at = updates.acceptedAt;
        if (updates.completedAt !== undefined) row.completed_at = updates.completedAt;
        if (updates.expiresAt !== undefined) row.expires_at = updates.expiresAt;
        if (updates.expired !== undefined) row.expired = updates.expired;

        const { data, error } = await supabase.from('jobs').update(row).eq('id', id).select().single();
        if (error) throw error;
        return mapRow(data);
    },

    async save(job) {
        const row = {
            client_id: job.clientId || job.client_id,
            worker_id: job.workerId || job.worker_id || null,
            service_id: job.serviceId || job.service_id,
            area_id: job.areaId || job.area_id,
            description: job.description,
            scheduled_at: job.scheduledAt || job.scheduled_at,
            address: job.address,
            status: job.status,
            estimated_price: job.estimatedPrice || job.estimated_price,
            final_price: job.finalPrice || job.final_price || null,
            accepted_at: job.acceptedAt || job.accepted_at || null,
            completed_at: job.completedAt || job.completed_at || null,
            expires_at: job.expiresAt || job.expires_at || null,
            expired: job.expired || false
        };
        const { data, error } = await supabase.from('jobs').update(row).eq('id', job.id || job._id).select().single();
        if (error) throw error;
        return mapRow(data);
    },

    async countDocuments(filters = {}) {
        let q = supabase.from('jobs').select('*', { count: 'exact', head: true });
        if (filters.workerIdIn) q = q.in('worker_id', filters.workerIdIn);
        if (filters.workerId || filters.worker_id) q = q.eq('worker_id', filters.workerId || filters.worker_id);
        if (filters.status) q = q.eq('status', filters.status);
        const { count, error } = await q;
        if (error) throw error;
        return count || 0;
    },

    /**
     * Sum estimated_price for completed jobs (replaces MongoDB aggregate)
     */
    async sumEstimatedPrice(workerIds) {
        const { data, error } = await supabase.from('jobs')
            .select('estimated_price')
            .in('worker_id', workerIds)
            .eq('status', 'COMPLETED');
        if (error) throw error;
        return (data || []).reduce((sum, r) => sum + (r.estimated_price || 0), 0);
    },

    /**
     * Populate a job with related data
     */
    async populate(job, fields = []) {
        if (!job) return null;
        const Client = require('./Client');
        const Worker = require('./Worker');
        const Service = require('./Service');
        const Area = require('./Area');
        const User = require('./User');

        if (fields.includes('clientId') || fields.includes('all')) {
            const client = await Client.findById(job.client_id || job.clientId);
            if (client) {
                const user = await User.findById(client.user_id);
                if (user) client.userId = user;
                const area = client.area_id ? await Area.findById(client.area_id) : null;
                if (area) client.areaId = area;
                job.clientId = client;
            }
        }
        if (fields.includes('workerId') || fields.includes('all')) {
            if (job.worker_id || job.workerId) {
                const worker = await Worker.findById(job.worker_id || job.workerId);
                if (worker) {
                    const user = await User.findById(worker.user_id);
                    if (user) worker.userId = user;
                    job.workerId = worker;
                }
            }
        }
        if (fields.includes('serviceId') || fields.includes('all')) {
            const service = await Service.findById(job.service_id || job.serviceId);
            if (service) job.serviceId = service;
        }
        if (fields.includes('areaId') || fields.includes('all')) {
            const area = await Area.findById(job.area_id || job.areaId);
            if (area) job.areaId = area;
        }
        return job;
    }
};
