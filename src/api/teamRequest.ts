// API Base URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

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

/**
 * Send team invitation to a user
 */
export const sendTeamRequest = async (userId: string, requestType: 'WORKER' | 'CLIENT', message?: string) => {
    return apiRequest('/team-requests/send', {
        method: 'POST',
        body: JSON.stringify({ userId, requestType, message }),
    });
};

/**
 * Get pending team requests for current user
 */
export const getPendingRequests = async () => {
    return apiRequest('/team-requests/pending');
};

/**
 * Accept a team request
 */
export const acceptTeamRequest = async (requestId: string) => {
    return apiRequest(`/team-requests/${requestId}/accept`, {
        method: 'POST',
    });
};

/**
 * Reject a team request
 */
export const rejectTeamRequest = async (requestId: string) => {
    return apiRequest(`/team-requests/${requestId}/reject`, {
        method: 'POST',
    });
};

/**
 * Get sent team requests (for providers)
 */
export const getSentRequests = async () => {
    return apiRequest('/team-requests/sent');
};

export interface TeamRequest {
    _id: string;
    providerId: {
        _id: string;
        userId: {
            name: string;
            email: string;
            phone: string;
        };
        businessName: string;
    };
    userId: {
        _id: string;
        name: string;
        email: string;
        phone: string;
    };
    requestType: 'WORKER' | 'CLIENT';
    status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
    message?: string;
    createdAt: string;
    respondedAt?: string;
}
