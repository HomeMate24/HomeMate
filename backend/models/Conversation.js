const { supabase } = require('../config/supabase');

const mapRow = (row) => {
    if (!row) return null;
    return {
        ...row, _id: row.id,
        conversationType: row.conversation_type,
        requestedBy: row.requested_by,
        lastMessageId: row.last_message_id,
        lastMessageAt: row.last_message_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
};
const mapRows = (rows) => (rows || []).map(mapRow);

module.exports = {
    async findById(id) {
        const { data, error } = await supabase.from('conversations').select('*').eq('id', id).single();
        if (error && error.code === 'PGRST116') return null;
        if (error) throw error;
        const conv = mapRow(data);
        // Attach participants
        conv.participants = await this.getParticipants(conv.id);
        return conv;
    },

    async findOne(filters) {
        let q = supabase.from('conversations').select('*');
        if (filters._id || filters.id) q = q.eq('id', filters._id || filters.id);
        if (filters.conversationType || filters.conversation_type) {
            q = q.eq('conversation_type', filters.conversationType || filters.conversation_type);
        }
        if (filters.status) q = q.eq('status', filters.status);
        const { data, error } = await q.limit(1).maybeSingle();
        if (error) throw error;
        if (!data) return null;
        const conv = mapRow(data);
        conv.participants = await this.getParticipants(conv.id);
        return conv;
    },

    /**
     * Find conversations where a user is a participant
     */
    async findByParticipant(userId, options = {}) {
        // Get conversation IDs for this user
        const { data: cpData, error: cpError } = await supabase
            .from('conversation_participants')
            .select('conversation_id')
            .eq('user_id', userId);
        if (cpError) throw cpError;
        const convIds = (cpData || []).map(r => r.conversation_id);
        if (convIds.length === 0) return [];

        let q = supabase.from('conversations').select('*').in('id', convIds);
        q = q.order('last_message_at', { ascending: false });
        const { data, error } = await q;
        if (error) throw error;

        const conversations = mapRows(data);
        // Attach participants to each
        for (const conv of conversations) {
            conv.participants = await this.getParticipants(conv.id);
        }
        return conversations;
    },

    /**
     * Find a DIRECT conversation between two users
     */
    async findDirectBetween(userId1, userId2) {
        // Get conversation IDs for user1
        const { data: cp1 } = await supabase.from('conversation_participants')
            .select('conversation_id').eq('user_id', userId1);
        const ids1 = (cp1 || []).map(r => r.conversation_id);
        if (ids1.length === 0) return null;

        // Get conversation IDs for user2 that overlap with user1
        const { data: cp2 } = await supabase.from('conversation_participants')
            .select('conversation_id').eq('user_id', userId2).in('conversation_id', ids1);
        const sharedIds = (cp2 || []).map(r => r.conversation_id);
        if (sharedIds.length === 0) return null;

        // Find a DIRECT conversation among shared IDs
        const { data, error } = await supabase.from('conversations')
            .select('*')
            .in('id', sharedIds)
            .eq('conversation_type', 'DIRECT')
            .limit(1)
            .maybeSingle();
        if (error) throw error;
        if (!data) return null;
        const conv = mapRow(data);
        conv.participants = await this.getParticipants(conv.id);
        return conv;
    },

    async create(convData) {
        const row = {
            conversation_type: convData.conversationType || 'DIRECT',
            status: convData.status || 'pending',
            requested_by: convData.requestedBy,
            metadata: convData.metadata || {}
        };
        const { data, error } = await supabase.from('conversations').insert(row).select().single();
        if (error) throw error;
        const conv = mapRow(data);

        // Insert participants
        if (convData.participants && convData.participants.length > 0) {
            const pRows = convData.participants.map(p => ({
                conversation_id: conv.id,
                user_id: p.userId,
                user_role: p.userRole
            }));
            await supabase.from('conversation_participants').insert(pRows);
        }

        conv.participants = await this.getParticipants(conv.id);
        return conv;
    },

    async updateById(id, updates) {
        const row = {};
        if (updates.status !== undefined) row.status = updates.status;
        if (updates.lastMessageId !== undefined || updates.last_message_id !== undefined) {
            row.last_message_id = updates.lastMessageId || updates.last_message_id;
        }
        if (updates.lastMessageAt !== undefined || updates.last_message_at !== undefined) {
            row.last_message_at = updates.lastMessageAt || updates.last_message_at;
        }
        if (updates.metadata !== undefined) row.metadata = updates.metadata;

        const { data, error } = await supabase.from('conversations').update(row).eq('id', id).select().single();
        if (error) throw error;
        const conv = mapRow(data);
        conv.participants = await this.getParticipants(conv.id);
        return conv;
    },

    async save(conv) {
        return this.updateById(conv.id || conv._id, conv);
    },

    /**
     * Get participants for a conversation (with user data populated)
     */
    async getParticipants(conversationId) {
        const { data, error } = await supabase.from('conversation_participants')
            .select('*').eq('conversation_id', conversationId);
        if (error) throw error;
        const User = require('./User');
        const participants = [];
        for (const p of (data || [])) {
            const user = await User.findById(p.user_id, 'id, name, email, role');
            participants.push({
                userId: user || { _id: p.user_id, id: p.user_id },
                userRole: p.user_role
            });
        }
        return participants;
    },

    /**
     * Get participant user IDs
     */
    async getParticipantIds(conversationId) {
        const { data, error } = await supabase.from('conversation_participants')
            .select('user_id').eq('conversation_id', conversationId);
        if (error) throw error;
        return (data || []).map(r => r.user_id);
    },

    /**
     * Check if user is a participant
     */
    async isParticipant(conversationId, userId) {
        const { data, error } = await supabase.from('conversation_participants')
            .select('id').eq('conversation_id', conversationId).eq('user_id', userId)
            .limit(1).maybeSingle();
        if (error) throw error;
        return !!data;
    },

    /**
     * Populate a conversation with user data for requestedBy
     */
    async populate(conv, fields = []) {
        if (!conv) return null;
        const User = require('./User');
        if (fields.includes('requestedBy') && conv.requested_by) {
            const user = await User.findById(conv.requested_by, 'id, name, email, role');
            if (user) conv.requestedBy = user;
        }
        return conv;
    }
};
