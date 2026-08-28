import axios from 'axios';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ============================================================
// REQUEST INTERCEPTOR
// ============================================================

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');

    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// ============================================================
// RESPONSE INTERCEPTOR
// ============================================================

api.interceptors.response.use(
  (response) => {
    // IMPORTANT:
    // Return response.data instead of the complete Axios response.
    //
    // Backend:
    // {
    //   success: true,
    //   user: {...},
    //   token: "..."
    // }
    //
    // This allows:
    // response.success
    // response.user
    // response.token

    return response.data;
  },

  (error) => {
    if (error.response) {
      console.error(
        'API Error:',
        error.response.status,
        error.response.data
      );

      // Unauthorized
      if (error.response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');

        const publicRoutes = [
          '/',
          '/login',
          '/register',
        ];

        if (!publicRoutes.includes(window.location.pathname)) {
          window.location.href = '/login';
        }
      }

      return Promise.reject(error.response.data);
    }

    // Request was made but server did not respond
    if (error.request) {
      console.error('Network Error:', error.message);

      return Promise.reject({
        success: false,
        error:
          'Unable to connect to the server. Please make sure the backend is running.',
      });
    }

    // Something went wrong while creating request
    console.error('Request Error:', error.message);

    return Promise.reject({
      success: false,
      error: error.message || 'Request failed.',
    });
  }
);

// ============================================================
// AUTH API
// ============================================================

export const authAPI = {
  login: (data) =>
    api.post('/api/auth/login', data),

  register: (data) =>
    api.post('/api/auth/register', data),

  getMe: () =>
    api.get('/api/auth/me'),
};

// ============================================================
// USER API
// ============================================================

export const userAPI = {
  getCurrentUser: () =>
    api.get('/api/users/me'),

  getAllUsers: () =>
    api.get('/api/users/all'),

  getUsersByRole: (role) =>
    api.get(`/api/users/role/${role}`),
};

// ============================================================
// DOCUMENT API
// ============================================================

export const documentAPI = {
  getDocuments: () =>
    api.get('/api/documents'),

  getDocumentById: (id) =>
    api.get(`/api/documents/${id}`),

  uploadDocument: (formData) =>
    api.post(
      '/api/documents/upload',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    ),

  updateDocument: (id, data) =>
    api.put(`/api/documents/${id}`, data),

  deleteDocument: (id) =>
    api.delete(`/api/documents/${id}`),

  getDocumentsByType: (type) =>
    api.get(`/api/documents/type/${type}`),
};

// ============================================================
// CONVERSATION API
// ============================================================

export const conversationAPI = {
  createConversation: (data) =>
    api.post('/api/conversations', data),

  getConversations: () =>
    api.get('/api/conversations'),

  getConversationById: (id) =>
    api.get(`/api/conversations/${id}`),

  sendMessage: (id, data) =>
    api.post(
      `/api/conversations/${id}/message`,
      data
    ),

  deleteConversation: (id) =>
    api.delete(`/api/conversations/${id}`),

  updateConversationTitle: (id, data) =>
    api.patch(
      `/api/conversations/${id}/title`,
      data
    ),
};

// ============================================================
// LEAVE API
// ============================================================

export const leaveAPI = {
  getMyRequests: () =>
    api.get('/api/leave/my-requests'),

  getBalance: () =>
    api.get('/api/leave/balance'),

  createRequest: (data) =>
    api.post('/api/leave/request', data),

  getHistory: () =>
    api.get('/api/leave/history'),

  getPendingRequests: () =>
    api.get('/api/leave/pending'),

  getAllRequests: () =>
    api.get('/api/leave/all'),

  approveRequest: (id, data) =>
    api.put(`/api/leave/${id}/approve`, data),

  rejectRequest: (id, data) =>
    api.put(`/api/leave/${id}/reject`, data),
};

// ============================================================
// GOOGLE API
// ============================================================

export const googleAPI = {
  getAuthUrl: () =>
    api.get('/api/google/auth/url'),

  handleCallback: (data) =>
    api.post('/api/google/auth/callback', data),

  checkCalendarConflicts: (
    startDate,
    endDate
  ) =>
    api.get(
      '/api/google/calendar/conflicts',
      {
        params: {
          startDate,
          endDate,
        },
      }
    ),

  getCalendarEvents: (
    startDate,
    endDate
  ) =>
    api.get(
      '/api/google/calendar/events',
      {
        params: {
          startDate,
          endDate,
        },
      }
    ),

  createCalendarEvent: (data) =>
    api.post(
      '/api/google/calendar/events',
      data
    ),

  sendEmail: (data) =>
    api.post(
      '/api/gmail/send',
      data
    ),

  getRecentEmails: (maxResults) =>
    api.get(
      '/api/gmail/recent',
      {
        params: {
          maxResults,
        },
      }
    ),

  getEmailById: (messageId) =>
    api.get(`/api/gmail/${messageId}`),

  revokeTokens: () =>
    api.delete('/api/google/auth/revoke'),
};

export default api;