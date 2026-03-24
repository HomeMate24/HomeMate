const { supabase } = require('../config/supabase');

const mapRow = (row) => {
    if (!row) return null;
    return {
        ...row, _id: row.id,
        conversationId: row.conversation_id,
        senderId: row.sender_id,
        senderRole: row.sender_role,
        messageType: row.message_type,
        isDeleted: row.is_deleted,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
};
const mapRows = (rows) => (rows || []).map(mapRow);

module.exports = {
    async findById(id) {
        const { data, error } = await supabase.from('messages').select('*').eq('id', id).single();
        if (error && error.code === 'PGRST116') return null;
        if (error) throw error;
        const msg = mapRow(data);
        msg.readBy = await this.getReadBy(msg.id);
        return msg;
    },

    async find(filters = {}, options = {}) {
        let q = supabase.from('messages').select('*');
        if (filters.conversationId || filters.conversation_id) {
            q = q.eq('conversation_id', filters.conversationId || filters.conversation_id);
        }
        if (filters.isDeleted !== undefined) q = q.eq('is_deleted', filters.isDeleted);
        if (filters.createdAtLt) q = q.lt('created_at', filters.createdAtLt);

        if (options.orderBy) {
            const [col, dir] = options.orderBy;
            const dbCol = col === 'createdAt' ? 'created_at' : col;
            q = q.order(dbCol, { ascending: dir !== 'desc' && dir !== -1 });
        } else {
            q = q.order('created_at', { ascending: false });
        }

        if (options.limit) q = q.limit(options.limit);

        const { data, error } = await q;
        if (error) throw error;
        const messages = mapRows(data);

        // Populate sender if requested
        if (options.populateSender) {
            const User = require('./User');
            for (const msg of messages) {
                const user = await User.findById(msg.sender_id, 'id, name, role');
                if (user) msg.senderId = user;
            }
        }

        return messages;
    },

    async create(msgData) {
        const row = {
            conversation_id: msgData.conversationId,
            sender_id: msgData.senderId,
            sender_role: msgData.senderRole,
            content: msgData.content,
            message_type: msgData.messageType || 'TEXT',
            is_deleted: false
        };
        const { data, error } = await supabase.from('messages').insert(row).select().single();
        if (error) throw error;
        const msg = mapRow(data);

        // Insert readBy entries
        if (msgData.readBy && msgData.readBy.length > 0) {
            const readRows = msgData.readBy.map(r => ({
                message_id: msg.id,
                user_id: r.userId,
                read_at: r.readAt || new Date()
            }));
            await supabase.from('message_read_by').insert(readRows);
        }

        msg.readBy = msgData.readBy || [];
        return msg;
    },

    /**
     * Count unread messages in a conversation for a user
     */
    async countUnread(conversationId, userId) {
        // Get all messages in conversation NOT sent by this user
        const { data: msgs, error } = await supabase.from('messages')
            .select('id')
            .eq('conversation_id', conversationId)
            .neq('sender_id', userId);
        if (error) throw error;
        if (!msgs || msgs.length === 0) return 0;

        const msgIds = msgs.map(m => m.id);

        // Get messages already read by this user
        const { data: readData } = await supabase.from('message_read_by')
            .select('message_id')
            .eq('user_id', userId)
            .in('message_id', msgIds);
        const readMsgIds = new Set((readData || []).map(r => r.message_id));

        return msgIds.filter(id => !readMsgIds.has(id)).length;
    },

    /**
     * Mark messages as read by a user
     */
    async markAsRead(conversationId, userId, messageIds = null) {
        // Get unread messages not sent by this user
        let q = supabase.from('messages').select('id')
            .eq('conversation_id', conversationId)
            .neq('sender_id', userId);
        if (messageIds && messageIds.length > 0) {
            q = q.in('id', messageIds);
        }
        const { data: msgs, error } = await q;
        if (error) throw error;
        if (!msgs || msgs.length === 0) return 0;

        const msgIds = msgs.map(m => m.id);

        // Find which are already read
        const { data: alreadyRead } = await supabase.from('message_read_by')
            .select('message_id')
            .eq('user_id', userId)
            .in('message_id', msgIds);
        const alreadyReadSet = new Set((alreadyRead || []).map(r => r.message_id));

        // Insert read entries for unread messages
        const toInsert = msgIds
            .filter(id => !alreadyReadSet.has(id))
            .map(id => ({ message_id: id, user_id: userId, read_at: new Date() }));

        if (toInsert.length > 0) {
            await supabase.from('message_read_by').insert(toInsert);
        }

        return toInsert.length;
    },

    async getReadBy(messageId) {
        const { data, error } = await supabase.from('message_read_by')
            .select('*').eq('message_id', messageId);
        if (error) throw error;
        return (data || []).map(r => ({ userId: r.user_id, readAt: r.read_at }));
    },

    /**
     * Populate message with sender data
     */
    async populate(msg) {
        if (!msg) return null;
        const User = require('./User');
        const user = await User.findById(msg.sender_id || msg.senderId, 'id, name, role');
        if (user) msg.senderId = user;
        return msg;
    }
};
