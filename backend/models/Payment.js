const { supabase } = require('../config/supabase');
const mapRow = (row) => {
    if (!row) return null;
    return { ...row, _id: row.id, clientId: row.client_id, jobId: row.job_id, subscriptionId: row.subscription_id, paymentType: row.payment_type, paymentMethod: row.payment_method, transactionId: row.transaction_id, paymentGatewayResponse: row.payment_gateway_response, completedAt: row.completed_at, createdAt: row.created_at };
};
const mapRows = (rows) => (rows || []).map(mapRow);

module.exports = {
    async findById(id) {
        const { data, error } = await supabase.from('payments').select('*').eq('id', id).single();
        if (error && error.code === 'PGRST116') return null;
        if (error) throw error;
        return mapRow(data);
    },
    async findOne(filters) {
        let q = supabase.from('payments').select('*');
        if (filters._id || filters.id) q = q.eq('id', filters._id || filters.id);
        if (filters.clientId || filters.client_id) q = q.eq('client_id', filters.clientId || filters.client_id);
        if (filters.jobId || filters.job_id) q = q.eq('job_id', filters.jobId || filters.job_id);
        if (filters.subscriptionId || filters.subscription_id) q = q.eq('subscription_id', filters.subscriptionId || filters.subscription_id);
        const { data, error } = await q.limit(1).maybeSingle();
        if (error) throw error;
        return mapRow(data);
    },
    async find(filters = {}) {
        let q = supabase.from('payments').select('*');
        if (filters.clientId || filters.client_id) q = q.eq('client_id', filters.clientId || filters.client_id);
        q = q.order('created_at', { ascending: false });
        const { data, error } = await q;
        if (error) throw error;
        return mapRows(data);
    },
    async create(paymentData) {
        const row = {
            client_id: paymentData.clientId,
            job_id: paymentData.jobId || null,
            subscription_id: paymentData.subscriptionId || null,
            amount: paymentData.amount,
            payment_type: paymentData.paymentType,
            status: paymentData.status || 'PENDING',
            payment_method: paymentData.paymentMethod || null,
            transaction_id: paymentData.transactionId || null,
            payment_gateway_response: paymentData.paymentGatewayResponse || null
        };
        const { data, error } = await supabase.from('payments').insert(row).select().single();
        if (error) throw error;
        return mapRow(data);
    },
    async save(payment) {
        const row = {
            status: payment.status,
            transaction_id: payment.transactionId || payment.transaction_id || null,
            completed_at: payment.completedAt || payment.completed_at || null,
            payment_gateway_response: payment.paymentGatewayResponse || payment.payment_gateway_response || null
        };
        const { data, error } = await supabase.from('payments').update(row).eq('id', payment.id || payment._id).select().single();
        if (error) throw error;
        return mapRow(data);
    }
};
