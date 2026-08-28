import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Lock,
  Mail,
  AlertCircle,
  Eye,
  EyeOff
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { authAPI } from '../services/api';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Clear previous browser validation state
    if (!formData.email.trim()) {
      toast.error('Please enter your email address.');
      return;
    }

    if (!formData.password) {
      toast.error('Please enter your password.');
      return;
    }

    setLoading(true);

    try {
      const response = await authAPI.login({
        email: formData.email.trim().toLowerCase(),
        password: formData.password
      });

      // Validate backend response
      if (
        !response ||
        !response.success ||
        !response.token ||
        !response.user
      ) {
        throw new Error(
          response?.error || 'Login failed. Please try again.'
        );
      }

      // Store authenticated user information
      localStorage.setItem(
        'user',
        JSON.stringify(response.user)
      );

      localStorage.setItem(
        'token',
        response.token
      );

      // Normalize role
      const role = response.user.role?.toLowerCase();

      // Role-based navigation
      if (role === 'hr') {
        toast.success('Welcome back, HR!');
        navigate('/hr-dashboard', {
          replace: true
        });
        return;
      }

      if (role === 'employee') {
        toast.success('Welcome back!');
        navigate('/employee-dashboard', {
          replace: true
        });
        return;
      }

      // Invalid role protection
      localStorage.removeItem('user');
      localStorage.removeItem('token');

      toast.error(
        'Your account has an invalid role. Please contact HR.'
      );
    } catch (err) {
      console.error('Login error:', err);

      // Support different API error formats
      const message =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.error ||
        err?.message ||
        'Login failed. Please check your credentials and try again.';

      toast.error(message);

      // Make sure failed login does not leave stale auth data
      localStorage.removeItem('user');
      localStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">

          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
              <Lock className="w-8 h-8 text-blue-600" />
            </div>

            <h1 className="text-2xl font-bold text-gray-900">
              Welcome Back
            </h1>

            <p className="text-gray-600 mt-2">
              Sign in to your Employee Copilot account
            </p>
          </div>

          {/* Login Form */}
          <form
            onSubmit={handleSubmit}
            className="space-y-6"
          >

            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Email Address
              </label>

              <div className="relative">
                <Mail
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
                />

                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  disabled={loading}
                  placeholder="you@company.com"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg
                  focus:ring-2 focus:ring-blue-500
                  focus:border-transparent
                  outline-none transition
                  disabled:bg-gray-100
                  disabled:cursor-not-allowed"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Password
              </label>

              <div className="relative">
                <Lock
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
                />

                <input
                  id="password"
                  name="password"
                  type={
                    showPassword
                      ? 'text'
                      : 'password'
                  }
                  autoComplete="current-password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  disabled={loading}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg
                  focus:ring-2 focus:ring-blue-500
                  focus:border-transparent
                  outline-none transition
                  disabled:bg-gray-100
                  disabled:cursor-not-allowed"
                />

                {/* Show / Hide Password */}
                <button
                  type="button"
                  onClick={() =>
                    setShowPassword(
                      (previous) => !previous
                    )
                  }
                  disabled={loading}
                  aria-label={
                    showPassword
                      ? 'Hide password'
                      : 'Show password'
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2
                  text-gray-400 hover:text-gray-600
                  disabled:cursor-not-allowed"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg
              font-medium
              hover:bg-blue-700
              focus:ring-2 focus:ring-blue-500
              focus:ring-offset-2
              disabled:opacity-50
              disabled:cursor-not-allowed
              transition"
            >
              {loading
                ? 'Signing in...'
                : 'Sign In'}
            </button>
          </form>

          {/* Register */}
          <div className="mt-6 text-center">
            <p className="text-gray-600">
              Don't have an account?{' '}

              <button
                type="button"
                onClick={() =>
                  navigate('/register')
                }
                disabled={loading}
                className="text-blue-600
                hover:text-blue-700
                font-medium
                disabled:opacity-50"
              >
                Sign up
              </button>
            </p>
          </div>

          {/* Security Information */}
          <div className="mt-6 flex items-start gap-2 text-xs text-gray-500">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />

            <p>
              Your account role determines which
              Employee Copilot features you can access.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Login;