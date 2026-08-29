import axios from 'axios';

// ============================================================
// API BASE URL
// ============================================================

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  'http://localhost:3001';

// ============================================================
// AXIOS INSTANCE
// ============================================================

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
  (error) => Promise.reject(error)
);

// ============================================================
// RESPONSE INTERCEPTOR
// ============================================================

api.interceptors.response.use(
  (response) => {
    return response.data;
  },

  (error) => {
    if (error.response) {
      console.error(
        'API Error:',
        error.response.status,
        error.response.data
      );

      // --------------------------------------------------------
      // UNAUTHORIZED
      // --------------------------------------------------------

      if (error.response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');

        const publicRoutes = [
          '/',
          '/login',
          '/register',
        ];

        if (
          !publicRoutes.includes(
            window.location.pathname
          )
        ) {
          window.location.href = '/login';
        }
      }

      // Return detailed error information
      const errorData = error.response.data || {};
      return Promise.reject({
        success: false,
        error: errorData.error || errorData.message || `HTTP ${error.response.status} error`,
        code: errorData.code,
        details: errorData,
        status: error.response.status
      });
    }

    // ----------------------------------------------------------
    // NETWORK ERROR
    // ----------------------------------------------------------

    if (error.request) {
      console.error(
        'Network Error:',
        error.message
      );

      return Promise.reject({
        success: false,
        error:
          'Unable to connect to the server. Please make sure the backend is running.',
        code: 'NETWORK_ERROR'
      });
    }

    // ----------------------------------------------------------
    // REQUEST ERROR
    // ----------------------------------------------------------

    console.error(
      'Request Error:',
      error.message
    );

    return Promise.reject({
      success: false,
      error:
        error.message ||
        'Request failed.',
      code: 'REQUEST_ERROR'
    });
  }
);

// ============================================================
// AUTH API
// ============================================================

export const authAPI = {
  login: (data) =>
    api.post(
      '/api/auth/login',
      data
    ),

  register: (data) =>
    api.post(
      '/api/auth/register',
      data
    ),

  getMe: () =>
    api.get(
      '/api/auth/me'
    ),
};

// ============================================================
// USER API
// ============================================================

export const userAPI = {
  getCurrentUser: () =>
    api.get(
      '/api/users/me'
    ),

  getAllUsers: () =>
    api.get(
      '/api/users/all'
    ),

  getUsersByRole: (role) =>
    api.get(
      `/api/users/role/${role}`
    ),
};

// ============================================================
// ADMIN API
// ============================================================

export const adminAPI = {
  getUsers: () =>
    api.get(
      '/api/admin/users'
    ),

  blockUser: (id) =>
    api.patch(
      `/api/admin/users/${id}/block`
    ),

  unblockUser: (id) =>
    api.patch(
      `/api/admin/users/${id}/unblock`
    ),

  deleteUser: (id) =>
    api.delete(
      `/api/admin/users/${id}`
    ),

  getUserStats: () =>
    api.get(
      '/api/admin/stats'
    ),

  getValidEmployeeIds: () =>
    api.get(
      '/api/admin/valid-employee-ids'
    ),

  addValidEmployeeId: (employeeId) =>
    api.post(
      '/api/admin/valid-employee-ids',
      { employee_id: employeeId }
    ),

  deleteValidEmployeeId: (id) =>
    api.delete(
      `/api/admin/valid-employee-ids/${id}`
    ),
};

// ============================================================
// DOCUMENT API
// ============================================================

export const documentAPI = {
  getDocuments: () =>
    api.get(
      '/api/documents'
    ),

  getDocumentById: (id) =>
    api.get(
      `/api/documents/${id}`
    ),

  uploadDocument: (formData) =>
    api.post(
      '/api/documents/upload',
      formData,
      {
        headers: {
          'Content-Type':
            'multipart/form-data',
        },
      }
    ),

  updateDocument: (
    id,
    data
  ) =>
    api.put(
      `/api/documents/${id}`,
      data
    ),

  deleteDocument: (id) =>
    api.delete(
      `/api/documents/${id}`
    ),

  getDocumentsByType: (type) =>
    api.get(
      `/api/documents/type/${type}`
    ),
};

// ============================================================
// CONVERSATION API
// ============================================================

export const conversationAPI = {
  createConversation: (data) =>
    api.post(
      '/api/conversations',
      data
    ),

  getConversations: () =>
    api.get(
      '/api/conversations'
    ),

  getConversationById: (id) =>
    api.get(
      `/api/conversations/${id}`
    ),

  sendMessage: (
    id,
    data
  ) =>
    api.post(
      `/api/conversations/${id}/message`,
      data
    ),

  // ==========================================================
  // STREAMING MESSAGE
  // ==========================================================

  sendMessageStream: async (
    id,
    data,
    onChunk,
    onComplete,
    onError
  ) => {
    const token =
      localStorage.getItem('token');

    const response =
      await fetch(
        `${API_BASE_URL}/api/conversations/${id}/message?stream=true`,
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json',

            ...(token
              ? {
                  Authorization:
                    `Bearer ${token}`,
                }
              : {}),
          },

          body: JSON.stringify(data),
        }
      );

    if (!response.ok) {
      let errorMessage =
        `HTTP error! status: ${response.status}`;

      try {
        const errorData =
          await response.json();

        errorMessage =
          errorData?.error ||
          errorData?.message ||
          errorMessage;
      } catch {
        // Ignore JSON parsing failure.
      }

      const error =
        new Error(errorMessage);

      if (onError) {
        onError(error);
      }

      throw error;
    }

    if (!response.body) {
      const error =
        new Error(
          'Streaming response body is not available.'
        );

      if (onError) {
        onError(error);
      }

      throw error;
    }

    const reader =
      response.body.getReader();

    const decoder =
      new TextDecoder();

    let buffer = '';

    try {
      while (true) {
        const {
          done,
          value,
        } = await reader.read();

        if (done) {
          break;
        }

        buffer += decoder.decode(
          value,
          {
            stream: true,
          }
        );

        const events =
          buffer.split('\n\n');

        buffer =
          events.pop() || '';

        for (const event of events) {
          const lines =
            event.split('\n');

          for (const line of lines) {
            if (
              !line.startsWith(
                'data: '
              )
            ) {
              continue;
            }

            try {
              const eventData =
                JSON.parse(
                  line.slice(6)
                );

              // ----------------------------------------------
              // USER MESSAGE
              // ----------------------------------------------

              if (
                eventData.type ===
                'user_message'
              ) {
                // No action required.
              }

              // ----------------------------------------------
              // TOOL STATUS
              // ----------------------------------------------

              else if (
                eventData.type ===
                'tool_status'
              ) {
                if (onChunk) {
                  onChunk({
                    type:
                      'tool_status',

                    status:
                      eventData.status,

                    message:
                      eventData.message,
                  });
                }
              }

              // ----------------------------------------------
              // ASSISTANT CHUNK
              // ----------------------------------------------

              else if (
                eventData.type ===
                'assistant_chunk'
              ) {
                if (onChunk) {
                  onChunk({
                    type: 'text',

                    chunk:
                      eventData.chunk,
                  });
                }
              }

              // ----------------------------------------------
              // ASSISTANT COMPLETE
              // ----------------------------------------------

              else if (
                eventData.type ===
                'assistant_complete'
              ) {
                if (onComplete) {
                  onComplete(
                    eventData
                  );
                }
              }

              // ----------------------------------------------
              // ERROR
              // ----------------------------------------------

              else if (
                eventData.type ===
                'error'
              ) {
                const error =
                  new Error(
                    eventData.error ||
                      'Streaming request failed.'
                  );

                if (onError) {
                  onError(error);
                }
              }

              // ----------------------------------------------
              // DONE
              // ----------------------------------------------

              else if (
                eventData.type ===
                'done'
              ) {
                return;
              }
            } catch (parseError) {
              console.error(
                'Error parsing SSE data:',
                parseError,
                event
              );
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  },

  executeAction: (
    id,
    data
  ) =>
    api.post(
      `/api/conversations/${id}/actions`,
      data
    ),

  deleteConversation: (id) =>
    api.delete(
      `/api/conversations/${id}`
    ),

  updateConversationTitle: (
    id,
    data
  ) =>
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
    api.get(
      '/api/leave/my-requests'
    ),

  getBalance: () =>
    api.get(
      '/api/leave/balance'
    ),

  createRequest: (data) =>
    api.post(
      '/api/leave/request',
      data
    ),

  getHistory: () =>
    api.get(
      '/api/leave/history'
    ),

  getPendingRequests: () =>
    api.get(
      '/api/leave/pending'
    ),

  getAllRequests: () =>
    api.get(
      '/api/leave/all'
    ),

  approveRequest: (
    id,
    data
  ) =>
    api.put(
      `/api/leave/${id}/approve`,
      data
    ),

  rejectRequest: (
    id,
    data
  ) =>
    api.put(
      `/api/leave/${id}/reject`,
      data
    ),
};

// ============================================================
// GOOGLE API
// ============================================================

export const googleAPI = {
  // ==========================================================
  // GOOGLE OAUTH
  // ==========================================================

  getAuthUrl: () =>
    api.get(
      '/api/google/auth/url'
    ),

  // Calendar-specific OAuth URL.
  // EmployeeCalendar.jsx uses this name.
  getCalendarAuthUrl: () =>
    api.get(
      '/api/google/calendar/auth/url'
    ),

  // ==========================================================
  // GOOGLE AUTH STATUS
  // ==========================================================

  getAuthStatus: () =>
    api.get(
      '/api/google/auth/status'
    ),

  // ==========================================================
  // GOOGLE OAUTH CALLBACK
  // ==========================================================

  handleCallback: (data) =>
    api.post(
      '/api/google/auth/callback',
      data
    ),

  // ==========================================================
  // REVOKE GOOGLE CONNECTION
  // ==========================================================

  revokeTokens: () =>
    api.delete(
      '/api/google/auth/revoke'
    ),

  revokeCalendarTokens: () =>
    api.delete(
      '/api/google/calendar/revoke'
    ),

  // ==========================================================
  // GOOGLE CALENDAR
  // ==========================================================

  getCalendarStatus: () =>
    api.get(
      '/api/google/calendar/status'
    ),

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

  // ==========================================================
  // GMAIL
  // ==========================================================

  getGmailStatus: () =>
    api.get(
      '/api/google/gmail/status'
    ),

  revokeGmailTokens: () =>
    api.delete(
      '/api/google/gmail/revoke'
    ),

  sendEmail: (data) =>
    api.post(
      '/api/google/gmail/send',
      data
    ),

  getRecentEmails: (
    maxResults = 10
  ) =>
    api.get(
      '/api/google/gmail/recent',
      {
        params: {
          maxResults,
        },
      }
    ),

  getEmailById: (
    messageId
  ) =>
    api.get(
      `/api/google/gmail/${messageId}`
    ),
};

// ============================================================
// DEFAULT EXPORT
// ============================================================

export default api;