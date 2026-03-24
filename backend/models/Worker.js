const { supabase } = require('../config/supabase');

const mapRow = (row) => {
    if (!row) return null;
    return {
        ...row, _id: row.id,
        userId: row.user_id,
        providerId: row.provider_id,
        isAvailable: row.is_available,
        totalJobs: row.total_jobs,
        completedJobs: row.completed_jobs,
        averageRating: row.average_rating,
        hourlyRate: row.hourly_rate,
        profileImage: row.profile_image,
        // areaIds and serviceIds will be populated separately
    };
};
const mapRows = (rows) => (rows || []).map(mapRow);

module.exports = {
    async findById(id) {
        const { data, error } = await supabase.from('workers').select('*').eq('id', id).single();
        if (error && error.code === 'PGRST116') return null;
        if (error) throw error;
        return mapRow(data);
    },

    async findOne(filters) {
        let q = supabase.from('workers').select('*');
        if (filters.userId || filters.user_id) q = q.eq('user_id', filters.userId || filters.user_id);
        if (filters._id || filters.id) q = q.eq('id', filters._id || filters.id);
        if (filters.providerId || filters.provider_id) q = q.eq('provider_id', filters.providerId || filters.provider_id);
        const { data, error } = await q.limit(1).maybeSingle();
        if (error) throw error;
        return mapRow(data);
    },

    async find(filters = {}, options = {}) {
        let q = supabase.from('workers').select(options.select || '*', options.count ? { count: 'exact' } : {});

        if (filters.providerId || filters.provider_id) q = q.eq('provider_id', filters.providerId || filters.provider_id);
        if (filters.isAvailable !== undefined || filters.is_available !== undefined) {
            q = q.eq('is_available', filters.isAvailable !== undefined ? filters.isAvailable : filters.is_available);
        }
        if (filters.userId && filters.userId.$in) q = q.in('user_id', filters.userId.$in);
        if (filters.id && filters.id.$in) q = q.in('id', filters.id.$in);

        if (options.orderBy) {
            const [col, dir] = options.orderBy;
            q = q.order(col === 'averageRating' ? 'average_rating' : col === 'createdAt' ? 'created_at' : col,
                { ascending: dir !== -1 && dir !== 'desc' });
        }
        if (options.limit) q = q.limit(options.limit);

        const { data, error, count } = await q;
        if (error) throw error;
        const result = mapRows(data);
        if (options.count) result.count = count;
        return result;
    },

    async create(workerData) {
        const row = {
            user_id: workerData.userId,
            bio: workerData.bio || null,
            profile_image: workerData.profileImage || null,
            experience: workerData.experience || null,
            hourly_rate: workerData.hourlyRate || null,
            is_available: workerData.isAvailable !== undefined ? workerData.isAvailable : true,
            total_jobs: workerData.totalJobs || 0,
            completed_jobs: workerData.completedJobs || 0,
            average_rating: workerData.averageRating || 0,
            provider_id: workerData.providerId || null
        };
        const { data, error } = await supabase.from('workers').insert(row).select().single();
        if (error) throw error;

        const worker = mapRow(data);

        // Insert junction table entries for areas
        if (workerData.areaIds && workerData.areaIds.length > 0) {
            const areaRows = workerData.areaIds.map(aId => ({ worker_id: worker.id, area_id: aId }));
            await supabase.from('worker_areas').insert(areaRows);
        }

        // Insert junction table entries for services
        if (workerData.serviceIds && workerData.serviceIds.length > 0) {
            const serviceRows = workerData.serviceIds.map(sId => ({ worker_id: worker.id, service_id: sId }));
            await supabase.from('worker_services').insert(serviceRows);
        }

        return worker;
    },

    async updateById(id, updates) {
        const row = {};
        if (updates.bio !== undefined) row.bio = updates.bio;
        if (updates.profileImage !== undefined || updates.profile_image !== undefined) row.profile_image = updates.profileImage || updates.profile_image;
        if (updates.experience !== undefined) row.experience = updates.experience;
        if (updates.hourlyRate !== undefined || updates.hourly_rate !== undefined) row.hourly_rate = updates.hourlyRate || updates.hourly_rate;
        if (updates.isAvailable !== undefined || updates.is_available !== undefined) row.is_available = updates.isAvailable !== undefined ? updates.isAvailable : updates.is_available;
        if (updates.totalJobs !== undefined) row.total_jobs = updates.totalJobs;
        if (updates.completedJobs !== undefined) row.completed_jobs = updates.completedJobs;
        if (updates.averageRating !== undefined || updates.average_rating !== undefined) row.average_rating = updates.averageRating || updates.average_rating;
        if (updates.providerId !== undefined) row.provider_id = updates.providerId;

        if (Object.keys(row).length > 0) {
            const { data, error } = await supabase.from('workers').update(row).eq('id', id).select().single();
            if (error) throw error;
            return mapRow(data);
        }
        return this.findById(id);
    },

    async save(worker) {
        const row = {
            bio: worker.bio,
            profile_image: worker.profileImage || worker.profile_image || null,
            experience: worker.experience,
            hourly_rate: worker.hourlyRate || worker.hourly_rate,
            is_available: worker.isAvailable !== undefined ? worker.isAvailable : worker.is_available,
            total_jobs: worker.totalJobs || worker.total_jobs || 0,
            completed_jobs: worker.completedJobs || worker.completed_jobs || 0,
            average_rating: worker.averageRating || worker.average_rating || 0,
            provider_id: worker.providerId || worker.provider_id || null
        };
        const { data, error } = await supabase.from('workers').update(row).eq('id', worker.id || worker._id).select().single();
        if (error) throw error;
        return mapRow(data);
    },

    /**
     * Increment a numeric field atomically
     */
    async increment(id, field, amount) {
        const fieldMap = { totalJobs: 'total_jobs', completedJobs: 'completed_jobs', total_jobs: 'total_jobs', completed_jobs: 'completed_jobs' };
        const col = fieldMap[field] || field;
        const { data: current } = await supabase.from('workers').select(col).eq('id', id).single();
        if (!current) return;
        const { error } = await supabase.from('workers').update({ [col]: (current[col] || 0) + amount }).eq('id', id);
        if (error) throw error;
    },

    /**
     * Count workers matching filters
     */
    async countDocuments(filters = {}) {
        let q = supabase.from('workers').select('*', { count: 'exact', head: true });
        if (filters.providerId || filters.provider_id) q = q.eq('provider_id', filters.providerId || filters.provider_id);
        if (filters.isAvailable !== undefined || filters.is_available !== undefined) {
            q = q.eq('is_available', filters.isAvailable !== undefined ? filters.isAvailable : filters.is_available);
        }
        const { count, error } = await q;
        if (error) throw error;
        return count || 0;
    },

    /**
     * Get area IDs for a worker from junction table
     */
    async getAreaIds(workerId) {
        const { data, error } = await supabase.from('worker_areas').select('area_id').eq('worker_id', workerId);
        if (error) throw error;
        return (data || []).map(r => r.area_id);
    },

    /**
     * Get service IDs for a worker from junction table
     */
    async getServiceIds(workerId) {
        const { data, error } = await supabase.from('worker_services').select('service_id').eq('worker_id', workerId);
        if (error) throw error;
        return (data || []).map(r => r.service_id);
    },

    /**
     * Set area IDs (replace all)
     */
    async setAreaIds(workerId, areaIds) {
        await supabase.from('worker_areas').delete().eq('worker_id', workerId);
        if (areaIds && areaIds.length > 0) {
            const rows = areaIds.map(aId => ({ worker_id: workerId, area_id: aId }));
            const { error } = await supabase.from('worker_areas').insert(rows);
            if (error) throw error;
        }
    },

    /**
     * Set service IDs (replace all)
     */
    async setServiceIds(workerId, serviceIds) {
        await supabase.from('worker_services').delete().eq('worker_id', workerId);
        if (serviceIds && serviceIds.length > 0) {
            const rows = serviceIds.map(sId => ({ worker_id: workerId, service_id: sId }));
            const { error } = await supabase.from('worker_services').insert(rows);
            if (error) throw error;
        }
    },

    /**
     * Find workers in a specific area (via junction table)
     */
    async findByAreaId(areaId, extraFilters = {}) {
        // Get worker IDs from junction table
        const { data: waData, error: waError } = await supabase.from('worker_areas').select('worker_id').eq('area_id', areaId);
        if (waError) throw waError;
        const workerIds = (waData || []).map(r => r.worker_id);
        if (workerIds.length === 0) return [];

        let q = supabase.from('workers').select('*').in('id', workerIds);
        if (extraFilters.isAvailable !== undefined) q = q.eq('is_available', extraFilters.isAvailable);
        if (extraFilters.serviceId) {
            // Further filter by service
            const { data: wsData } = await supabase.from('worker_services').select('worker_id').eq('service_id', extraFilters.serviceId);
            const serviceWorkerIds = (wsData || []).map(r => r.worker_id);
            const intersection = workerIds.filter(id => serviceWorkerIds.includes(id));
            if (intersection.length === 0) return [];
            q = supabase.from('workers').select('*').in('id', intersection);
            if (extraFilters.isAvailable !== undefined) q = q.eq('is_available', extraFilters.isAvailable);
        }

        q = q.order('average_rating', { ascending: false });
        const { data, error } = await q;
        if (error) throw error;
        return mapRows(data);
    },

    /**
     * Find workers by area ID and service ID (for job notifications)
     */
    async findByAreaAndService(areaId, serviceId) {
        const { data: waData } = await supabase.from('worker_areas').select('worker_id').eq('area_id', areaId);
        const areaWorkerIds = (waData || []).map(r => r.worker_id);
        if (areaWorkerIds.length === 0) return [];

        const { data: wsData } = await supabase.from('worker_services').select('worker_id').eq('service_id', serviceId);
        const serviceWorkerIds = (wsData || []).map(r => r.worker_id);

        const intersection = areaWorkerIds.filter(id => serviceWorkerIds.includes(id));
        if (intersection.length === 0) return [];

        const { data, error } = await supabase.from('workers').select('*')
            .in('id', intersection).eq('is_available', true);
        if (error) throw error;
        return mapRows(data);
    },

    /**
     * Populate a worker with user, areas, and services data
     */
    async populate(worker, fields = ['userId', 'areaIds', 'serviceIds']) {
        if (!worker) return null;
        const id = worker.id || worker._id;

        if (fields.includes('userId') && !worker.userId?.name) {
            const User = require('./User');
            const user = await User.findById(worker.user_id || worker.userId);
            if (user) worker.userId = user;
        }

        if (fields.includes('areaIds')) {
            const areaIds = await this.getAreaIds(id);
            const Area = require('./Area');
            worker.areaIds = [];
            for (const aId of areaIds) {
                const area = await Area.findById(aId);
                if (area) worker.areaIds.push(area);
            }
        }

        if (fields.includes('serviceIds')) {
            const serviceIds = await this.getServiceIds(id);
            const Service = require('./Service');
            worker.serviceIds = [];
            for (const sId of serviceIds) {
                const service = await Service.findById(sId);
                if (service) worker.serviceIds.push(service);
            }
        }

        return worker;
    },

    /**
     * Check if a worker services a specific area
     */
    async hasArea(workerId, areaId) {
        const { data, error } = await supabase.from('worker_areas')
            .select('id').eq('worker_id', workerId).eq('area_id', areaId).limit(1).maybeSingle();
        if (error) throw error;
        return !!data;
    },

    /**
     * Find workers who service any of the given area IDs
     */
    async findByAreaIds(areaIds) {
        if (!areaIds || areaIds.length === 0) return [];
        const { data: waData, error: waError } = await supabase.from('worker_areas')
            .select('worker_id').in('area_id', areaIds);
        if (waError) throw waError;
        const workerIds = [...new Set((waData || []).map(r => r.worker_id))];
        if (workerIds.length === 0) return [];
        const { data, error } = await supabase.from('workers').select('*').in('id', workerIds);
        if (error) throw error;
        return mapRows(data);
    }
};
