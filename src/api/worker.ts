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
 * Get worker's job requests (filtered by worker's areas)
 */
export const getWorkerJobs = async (status?: string) => {
    const params = status ? `?status=${status}` : '';
    return apiRequest(`/workers/jobs${params}`);
};

/**
 * Accept a job request
 */
export const acceptJob = async (jobId: string) => {
    return apiRequest(`/workers/jobs/${jobId}/accept`, {
        method: 'POST',
    });
};

/**
 * Reject a job request
 */
export const rejectJob = async (jobId: string) => {
    return apiRequest(`/workers/jobs/${jobId}/reject`, {
        method: 'POST',
    });
};

/**
 * Cancel an accepted/in-review/in-progress job (worker cancels)
 */
export const cancelWorkerJob = async (jobId: string) => {
    return apiRequest(`/workers/jobs/${jobId}/cancel`, {
        method: 'POST',
    });
};

/**
 * Update job status (IN_REVIEW, IN_PROGRESS or COMPLETED)
 */
export const updateJobStatus = async (jobId: string, status: 'IN_REVIEW' | 'IN_PROGRESS' | 'COMPLETED') => {
    return apiRequest(`/workers/jobs/${jobId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
    });
};

/**
 * Get worker earnings and completed jobs
 */
export const getEarnings = async () => {
    return apiRequest('/workers/earnings');
};

/**
 * Get the current worker's profile (includes areaIds and serviceIds)
 */
export const getWorkerProfile = async () => {
    return apiRequest('/workers/profile');
};

/**
 * Get all ratings/reviews for the logged-in worker
 */
export const getWorkerRatings = async () => {
    return apiRequest('/workers/ratings');
};

/**
 * Update worker's working areas
 */
export const updateWorkerAreas = async (areaIds: string[]) => {
    return apiRequest('/workers/areas', {
        method: 'PATCH',
        body: JSON.stringify({ areaIds }),
    });
};

/**
 * Update worker's offered services
 */
export const updateWorkerServices = async (serviceIds: string[]) => {
    return apiRequest('/workers/services', {
        method: 'PATCH',
        body: JSON.stringify({ serviceIds }),
    });
};
