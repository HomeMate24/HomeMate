// API Base URL - in production, use relative /api (Vercel proxy rewrites to Render backend)
const API_BASE_URL = import.meta.env.DEV ? 'http://localhost:5000/api' : '/api';

// Helper function to get auth token
const getAuthToken = () => {
    return localStorage.getItem('jwt-token');
};

// Helper function to make authenticated requests
const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
    const token = getAuthToken();

    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || 'Request failed');
    }

    return data;
};

// Search for users
export const searchUsers = async (query: string) => {
    return apiRequest(`/chat/search?q=${encodeURIComponent(query)}`);
};

// Get all conversations
export const getConversations = async () => {
    return apiRequest('/chat/conversations');
};

// Get messages in a conversation
export const getMessages = async (conversationId: string, limit = 50, before?: string) => {
    const params = new URLSearchParams({ limit: limit.toString() });
    if (before) params.append('before', before);

    return apiRequest(`/chat/conversations/${conversationId}/messages?${params}`);
};

// Mark messages as read
export const markAsRead = async (conversationId: string, messageIds?: string[]) => {
    return apiRequest(`/chat/conversations/${conversationId}/read`, {
        method: 'POST',
        body: JSON.stringify({ messageIds }),
    });
};

// Create a new conversation
export const createConversation = async (participantId: string) => {
    return apiRequest('/chat/conversations', {
        method: 'POST',
        body: JSON.stringify({ participantId }),
    });
};

// Update conversation status (accept/reject chat request)
export const updateConversationStatus = async (conversationId: string, status: 'accepted' | 'rejected') => {
    return apiRequest(`/chat/conversations/${conversationId}/status`, {
        method: 'POST',
        body: JSON.stringify({ status }),
    });
};

// WebSocket connection helper
export const getWebSocketUrl = () => {
    const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:5000';
    const token = getAuthToken();

    if (!token) {
        throw new Error('Authentication token required for WebSocket connection');
    }

    return `${WS_URL}?token=${token}`;
};
