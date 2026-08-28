import { createContext, useContext, useEffect, useState } from 'react';
import { authAPI } from '../services/api';

const UserContext = createContext(null);

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /*
   * Initialize authentication state.
   *
   * Priority:
   * 1. Check token
   * 2. Validate token with backend
   * 3. Store fresh user data
   */
  useEffect(() => {
    const initializeUser = async () => {
      try {
        const token = localStorage.getItem('token');

        if (!token) {
          setUser(null);
          setLoading(false);
          return;
        }

        try {
          const response = await authAPI.getMe();

          if (response?.success && response?.user) {
            const normalizedUser = {
              ...response.user,
              role: response.user.role?.toLowerCase(),
            };

            setUser(normalizedUser);

            localStorage.setItem(
              'user',
              JSON.stringify(normalizedUser)
            );
          } else {
            throw new Error('Invalid authentication response');
          }
        } catch (apiError) {
          console.error(
            'Authentication validation failed:',
            apiError
          );

          setUser(null);

          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      } catch (err) {
        console.error(
          'Error initializing authentication:',
          err
        );

        setError(
          err?.error ||
          err?.message ||
          'Failed to initialize user'
        );

        setUser(null);

        localStorage.removeItem('token');
        localStorage.removeItem('user');
      } finally {
        setLoading(false);
      }
    };

    initializeUser();
  }, []);

  /*
   * Login
   *
   * IMPORTANT:
   * Login.jsx should use this function instead of
   * calling authAPI.login() directly.
   */
  const login = async (email, password) => {
    try {
      setError(null);

      const response = await authAPI.login({
        email: email.trim().toLowerCase(),
        password,
      });

      if (
        !response ||
        !response.success ||
        !response.token ||
        !response.user
      ) {
        return {
          success: false,
          error:
            response?.error ||
            'Login failed. Invalid server response.',
        };
      }

      const normalizedUser = {
        ...response.user,
        role: response.user.role?.toLowerCase(),
      };

      /*
       * Update React state FIRST.
       *
       * This is the important fix.
       */
      setUser(normalizedUser);

      /*
       * Then persist authentication.
       */
      localStorage.setItem(
        'user',
        JSON.stringify(normalizedUser)
      );

      localStorage.setItem(
        'token',
        response.token
      );

      return {
        success: true,
        user: normalizedUser,
        token: response.token,
      };
    } catch (err) {
      console.error('Login error:', err);

      setUser(null);

      localStorage.removeItem('token');
      localStorage.removeItem('user');

      return {
        success: false,
        error:
          err?.error ||
          err?.message ||
          'Login failed. Please check your credentials.',
      };
    }
  };

  /*
   * Register
   */
  const register = async (userData) => {
    try {
      setError(null);

      const response = await authAPI.register(userData);

      if (
        !response ||
        !response.success ||
        !response.token ||
        !response.user
      ) {
        return {
          success: false,
          error:
            response?.error ||
            'Registration failed. Invalid server response.',
        };
      }

      const normalizedUser = {
        ...response.user,
        role: response.user.role?.toLowerCase(),
      };

      setUser(normalizedUser);

      localStorage.setItem(
        'user',
        JSON.stringify(normalizedUser)
      );

      localStorage.setItem(
        'token',
        response.token
      );

      return {
        success: true,
        user: normalizedUser,
        token: response.token,
      };
    } catch (err) {
      console.error('Registration error:', err);

      return {
        success: false,
        error:
          err?.error ||
          err?.message ||
          'Registration failed.',
      };
    }
  };

  /*
   * Logout
   */
  const logout = () => {
    setUser(null);
    setError(null);

    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  /*
   * Refresh user from backend
   */
  const refreshUser = async () => {
    try {
      const token = localStorage.getItem('token');

      if (!token) {
        setUser(null);
        return;
      }

      const response = await authAPI.getMe();

      if (response?.success && response?.user) {
        const normalizedUser = {
          ...response.user,
          role: response.user.role?.toLowerCase(),
        };

        setUser(normalizedUser);

        localStorage.setItem(
          'user',
          JSON.stringify(normalizedUser)
        );
      }
    } catch (err) {
      console.error(
        'Error refreshing user:',
        err
      );

      setUser(null);

      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  };

  /*
   * Role helpers
   */
  const normalizedRole = user?.role?.toLowerCase();

  const isEmployee =
    normalizedRole === 'employee';

  const isHR =
    normalizedRole === 'hr';

  const value = {
    user,
    loading,
    error,

    login,
    register,
    logout,
    refreshUser,

    isEmployee,
    isHR,
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);

  if (!context) {
    throw new Error(
      'useUser must be used within a UserProvider'
    );
  }

  return context;
};