const { supabase } = require('../config/supabase');

const mapRow = (row) => {
    if (!row) return null;
    return { ...row, _id: row.id, jobId: row.job_id, clientId: row.client_id, workerId: row.worker_id, createdAt: row.created_at };
};
const mapRows = (rows) => (rows || []).map(mapRow);

module.exports = {
    async findById(id) {
        const { data, error } = await supabase.from('ratings').select('*').eq('id', id).single();
        if (error && error.code === 'PGRST116') return null;
        if (error) throw error;
        return mapRow(data);
    },

    async findOne(filters) {
        let q = supabase.from('ratings').select('*');
        if (filters.jobId || filters.job_id) q = q.eq('job_id', filters.jobId || filters.job_id);
        if (filters.workerId || filters.worker_id) q = q.eq('worker_id', filters.workerId || filters.worker_id);
        const { data, error } = await q.limit(1).maybeSingle();
        if (error) throw error;
        return mapRow(data);
    },

    async find(filters = {}, options = {}) {
        let q = supabase.from('ratings').select('*');
        if (filters.workerId || filters.worker_id) q = q.eq('worker_id', filters.workerId || filters.worker_id);
        if (filters.clientId || filters.client_id) q = q.eq('client_id', filters.clientId || filters.client_id);
        q = q.order('created_at', { ascending: false });
        const { data, error } = await q;
        if (error) throw error;
        return mapRows(data);
    },

    async create(ratingData) {
        const row = {
            job_id: ratingData.jobId,
            client_id: ratingData.clientId,
            worker_id: ratingData.workerId,
            rating: ratingData.rating,
            review: ratingData.review || null
        };
        const { data, error } = await supabase.from('ratings').insert(row).select().single();
        if (error) throw error;
        return mapRow(data);
    },

    async countDocuments(filters = {}) {
        let q = supabase.from('ratings').select('*', { count: 'exact', head: true });
        if (filters.workerId || filters.worker_id) q = q.eq('worker_id', filters.workerId || filters.worker_id);
        const { count, error } = await q;
        if (error) throw error;
        return count || 0;
    },

    /**
     * Populate ratings with client and job data
     */
    async populateMany(ratings) {
        const Client = require('./Client');
        const User = require('./User');
        const Job = require('./Job');
        const Service = require('./Service');

        for (const r of ratings) {
            // Populate client with user name
            if (r.client_id || r.clientId) {
                const client = await Client.findById(r.client_id || r.clientId);
                if (client) {
                    const user = await User.findById(client.user_id);
                    if (user) client.userId = { _id: user.id, id: user.id, name: user.name };
                    r.clientId = client;
                }
            }
            // Populate job with service
            if (r.job_id || r.jobId) {
                const job = await Job.findById(r.job_id || r.jobId);
                if (job) {
                    const service = await Service.findById(job.service_id);
                    if (service) job.serviceId = { _id: service.id, id: service.id, name: service.name };
                    r.jobId = job;
                }
            }
        }
        return ratings;
    }
};
