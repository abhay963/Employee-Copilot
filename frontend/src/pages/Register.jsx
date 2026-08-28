import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Lock,
  Mail,
  User,
  Building,
  AlertCircle,
  Shield,
  Briefcase,
  Eye,
  EyeOff
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { authAPI } from '../services/api';

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'employee',
    department: ''
  });

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value
    }));
  };

  const handleRoleChange = (role) => {
    setFormData((previous) => ({
      ...previous,
      role
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // ---------------------------------------------------------
    // Basic validation
    // ---------------------------------------------------------

    if (!formData.name.trim()) {
      toast.error('Please enter your full name.');
      return;
    }

    if (!formData.email.trim()) {
      toast.error('Please enter your email address.');
      return;
    }

    if (!formData.department.trim()) {
      toast.error('Please enter your department.');
      return;
    }

    if (!formData.password) {
      toast.error('Please enter a password.');
      return;
    }

    if (!formData.confirmPassword) {
      toast.error('Please confirm your password.');
      return;
    }

    // ---------------------------------------------------------
    // Password match
    // ---------------------------------------------------------

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    // ---------------------------------------------------------
    // Password strength
    // ---------------------------------------------------------

    if (formData.password.length < 8) {
      toast.error(
        'Password must be at least 8 characters long.'
      );
      return;
    }

    if (!/[A-Z]/.test(formData.password)) {
      toast.error(
        'Password must contain at least one uppercase letter.'
      );
      return;
    }

    if (!/[a-z]/.test(formData.password)) {
      toast.error(
        'Password must contain at least one lowercase letter.'
      );
      return;
    }

    if (!/[0-9]/.test(formData.password)) {
      toast.error(
        'Password must contain at least one number.'
      );
      return;
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(formData.password)) {
      toast.error(
        'Password must contain at least one special character.'
      );
      return;
    }

    // ---------------------------------------------------------
    // Role validation
    // ---------------------------------------------------------

    if (!['employee', 'hr'].includes(formData.role)) {
      toast.error('Please select a valid role.');
      return;
    }

    setLoading(true);

    try {
      // Remove confirmPassword before sending to backend
      const {
        confirmPassword,
        ...registerData
      } = formData;

      const response = await authAPI.register({
        ...registerData,
        name: registerData.name.trim(),
        email: registerData.email.trim().toLowerCase(),
        department: registerData.department.trim(),
        role: registerData.role.toLowerCase()
      });

      // -------------------------------------------------------
      // Validate backend response
      // -------------------------------------------------------

      if (
        !response ||
        !response.success ||
        !response.token ||
        !response.user
      ) {
        throw new Error(
          response?.error ||
          'Registration failed. Please try again.'
        );
      }

      // -------------------------------------------------------
      // Store authentication information
      // -------------------------------------------------------

      localStorage.setItem(
        'user',
        JSON.stringify(response.user)
      );

      localStorage.setItem(
        'token',
        response.token
      );

      // -------------------------------------------------------
      // Role-based redirect
      // -------------------------------------------------------

      const role = response.user.role?.toLowerCase();

      if (role === 'hr') {
        toast.success(
          'Account created successfully! Welcome to Employee Copilot.'
        );

        navigate('/hr-dashboard', {
          replace: true
        });

        return;
      }

      if (role === 'employee') {
        toast.success(
          'Account created successfully! Welcome to Employee Copilot.'
        );

        navigate('/employee-dashboard', {
          replace: true
        });

        return;
      }

      // -------------------------------------------------------
      // Invalid role protection
      // -------------------------------------------------------

      localStorage.removeItem('user');
      localStorage.removeItem('token');

      toast.error(
        'Your account has an invalid role. Please contact HR.'
      );
    } catch (err) {
      console.error(
        'Registration error:',
        err
      );

      const message =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.error ||
        err?.message ||
        'Registration failed. Please try again.';

      toast.error(message);

      // Remove potentially stale authentication data
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

          {/* =================================================
              HEADER
          ================================================= */}

          <div className="text-center mb-8">

            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
              <User className="w-8 h-8 text-blue-600" />
            </div>

            <h1 className="text-2xl font-bold text-gray-900">
              Create Account
            </h1>

            <p className="text-gray-600 mt-2">
              Join Employee Copilot today
            </p>

          </div>

          {/* =================================================
              REGISTER FORM
          ================================================= */}

          <form
            onSubmit={handleSubmit}
            className="space-y-4"
          >

            {/* =================================================
                FULL NAME
            ================================================= */}

            <div>

              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Full Name
              </label>

              <div className="relative">

                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />

                <input
                  id="name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  disabled={loading}
                  placeholder="John Doe"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg
                  focus:ring-2 focus:ring-blue-500
                  focus:border-transparent
                  outline-none transition
                  disabled:bg-gray-100
                  disabled:cursor-not-allowed"
                />

              </div>

            </div>

            {/* =================================================
                EMAIL
            ================================================= */}

            <div>

              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Email Address
              </label>

              <div className="relative">

                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />

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

            {/* =================================================
                ROLE
            ================================================= */}

            <div>

              <label className="block text-sm font-medium text-gray-700 mb-2">
                Role
              </label>

              <div className="grid grid-cols-2 gap-3">

                {/* Employee */}

                <button
                  type="button"
                  onClick={() =>
                    handleRoleChange('employee')
                  }
                  disabled={loading}
                  className={`flex items-center justify-center gap-2 p-3 border-2 rounded-lg transition
                    disabled:cursor-not-allowed
                    ${
                      formData.role === 'employee'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-300 hover:border-gray-400 text-gray-700'
                    }`}
                >

                  <Briefcase className="w-5 h-5" />

                  <span className="font-medium">
                    Employee
                  </span>

                </button>

                {/* HR */}

                <button
                  type="button"
                  onClick={() =>
                    handleRoleChange('hr')
                  }
                  disabled={loading}
                  className={`flex items-center justify-center gap-2 p-3 border-2 rounded-lg transition
                    disabled:cursor-not-allowed
                    ${
                      formData.role === 'hr'
                        ? 'border-purple-500 bg-purple-50 text-purple-700'
                        : 'border-gray-300 hover:border-gray-400 text-gray-700'
                    }`}
                >

                  <Shield className="w-5 h-5" />

                  <span className="font-medium">
                    HR
                  </span>

                </button>

              </div>

            </div>

            {/* =================================================
                DEPARTMENT
            ================================================= */}

            <div>

              <label
                htmlFor="department"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Department
              </label>

              <div className="relative">

                <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />

                <input
                  id="department"
                  name="department"
                  type="text"
                  required
                  value={formData.department}
                  onChange={handleChange}
                  disabled={loading}
                  placeholder="Engineering"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg
                  focus:ring-2 focus:ring-blue-500
                  focus:border-transparent
                  outline-none transition
                  disabled:bg-gray-100
                  disabled:cursor-not-allowed"
                />

              </div>

            </div>

            {/* =================================================
                PASSWORD
            ================================================= */}

            <div>

              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Password
              </label>

              <div className="relative">

                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />

                <input
                  id="password"
                  name="password"
                  type={
                    showPassword
                      ? 'text'
                      : 'password'
                  }
                  autoComplete="new-password"
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >

                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}

                </button>

              </div>

              <p className="text-xs text-gray-500 mt-1">
                Must contain 8+ characters, uppercase,
                lowercase, number, and special character.
              </p>

            </div>

            {/* =================================================
                CONFIRM PASSWORD
            ================================================= */}

            <div>

              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Confirm Password
              </label>

              <div className="relative">

                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />

                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={
                    showConfirmPassword
                      ? 'text'
                      : 'password'
                  }
                  autoComplete="new-password"
                  required
                  value={formData.confirmPassword}
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

                <button
                  type="button"
                  onClick={() =>
                    setShowConfirmPassword(
                      (previous) => !previous
                    )
                  }
                  disabled={loading}
                  aria-label={
                    showConfirmPassword
                      ? 'Hide password'
                      : 'Show password'
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >

                  {showConfirmPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}

                </button>

              </div>

            </div>

            {/* =================================================
                SUBMIT
            ================================================= */}

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
                ? 'Creating account...'
                : 'Create Account'}
            </button>

          </form>

          {/* =================================================
              LOGIN LINK
          ================================================= */}

          <div className="mt-6 text-center">

            <p className="text-gray-600">

              Already have an account?{' '}

              <button
                type="button"
                onClick={() =>
                  navigate('/login')
                }
                disabled={loading}
                className="text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
              >
                Sign in
              </button>

            </p>

          </div>

          {/* =================================================
              SECURITY INFORMATION
          ================================================= */}

          <div className="mt-6 flex items-start gap-2 text-xs text-gray-500">

            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />

            <p>
              Your selected role determines which
              Employee Copilot features and data you
              can access.
            </p>

          </div>

        </div>
      </div>
    </div>
  );
};

export default Register;