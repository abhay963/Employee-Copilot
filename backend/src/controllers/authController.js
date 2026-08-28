import { User } from '../models/User.js';
import { generateToken } from '../middleware/auth.js';
import { LeaveBalance } from '../models/LeaveBalance.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const VALID_ROLES = ['employee', 'hr'];

const COMMON_PASSWORDS = [
  'password',
  '123456',
  'qwerty',
  'abc123',
  'letmein',
  'admin',
  'welcome'
];

export const register = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      role,
      department
    } = req.body;

    // -----------------------------
    // Basic validation
    // -----------------------------

    if (!name || !email || !password || !role || !department) {
      return res.status(400).json({
        success: false,
        error: 'All fields are required'
      });
    }

    const trimmedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedRole = role.trim().toLowerCase();
    const trimmedDepartment = department.trim();

    // -----------------------------
    // Name validation
    // -----------------------------

    if (trimmedName.length < 2 || trimmedName.length > 100) {
      return res.status(400).json({
        success: false,
        error: 'Name must be between 2 and 100 characters'
      });
    }

    if (!/^[a-zA-Z\s'-]+$/.test(trimmedName)) {
      return res.status(400).json({
        success: false,
        error:
          'Name can only contain letters, spaces, hyphens, and apostrophes'
      });
    }

    // -----------------------------
    // Email validation
    // -----------------------------

    if (!EMAIL_REGEX.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format'
      });
    }

    if (normalizedEmail.length > 255) {
      return res.status(400).json({
        success: false,
        error: 'Email is too long'
      });
    }

    // -----------------------------
    // Password validation
    // -----------------------------

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 8 characters'
      });
    }

    if (password.length > 128) {
      return res.status(400).json({
        success: false,
        error: 'Password is too long'
      });
    }

    if (!/[A-Z]/.test(password)) {
      return res.status(400).json({
        success: false,
        error: 'Password must contain at least one uppercase letter'
      });
    }

    if (!/[a-z]/.test(password)) {
      return res.status(400).json({
        success: false,
        error: 'Password must contain at least one lowercase letter'
      });
    }

    if (!/[0-9]/.test(password)) {
      return res.status(400).json({
        success: false,
        error: 'Password must contain at least one number'
      });
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      return res.status(400).json({
        success: false,
        error: 'Password must contain at least one special character'
      });
    }

    const passwordLower = password.toLowerCase();

    if (
      COMMON_PASSWORDS.some((commonPassword) =>
        passwordLower.includes(commonPassword)
      )
    ) {
      return res.status(400).json({
        success: false,
        error:
          'Password is too common. Please choose a stronger password'
      });
    }

    // -----------------------------
    // Role validation
    // -----------------------------

    if (!VALID_ROLES.includes(normalizedRole)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid role. Must be "employee" or "hr"'
      });
    }

    // -----------------------------
    // Department validation
    // -----------------------------

    if (
      trimmedDepartment.length < 2 ||
      trimmedDepartment.length > 100
    ) {
      return res.status(400).json({
        success: false,
        error: 'Department must be between 2 and 100 characters'
      });
    }

    // -----------------------------
    // Check existing user
    // -----------------------------

    const existingUser = await User.findByEmail(normalizedEmail);

    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'User with this email already exists'
      });
    }

    // -----------------------------
    // Create user
    // -----------------------------

    const user = await User.create({
      name: trimmedName,
      email: normalizedEmail,
      password,
      role: normalizedRole,
      department: trimmedDepartment
    });

    // -----------------------------
    // Create default leave balance
    // -----------------------------

    const defaultBalances =
      normalizedRole === 'hr'
        ? {
            annual_leave: 25,
            sick_leave: 15,
            personal_leave: 5
          }
        : {
            annual_leave: 20,
            sick_leave: 10,
            personal_leave: 5
          };

    await LeaveBalance.create(user.id, defaultBalances);

    // -----------------------------
    // Generate authentication token
    // -----------------------------

    const token = generateToken(user);

    // Never return password hash
    const {
      password_hash,
      password: userPassword,
      ...userWithoutPassword
    } = user;

    return res.status(201).json({
      success: true,
      message: 'Registration successful',
      user: userWithoutPassword,
      token
    });
  } catch (error) {
    console.error('Registration error:', error);

    // Handle PostgreSQL unique constraint
    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        error: 'User with this email already exists'
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to register user'
    });
  }
};

export const login = async (req, res) => {
  try {
    const {
      email,
      password
    } = req.body;

    // -----------------------------
    // Basic validation
    // -----------------------------

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // -----------------------------
    // Email validation
    // -----------------------------

    if (!EMAIL_REGEX.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format'
      });
    }

    // -----------------------------
    // Find user
    // -----------------------------

    const user = await User.findByEmail(normalizedEmail);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    // -----------------------------
    // Verify password
    // -----------------------------

    if (!user.password_hash) {
      console.error(
        `User ${user.id} does not have a password hash`
      );

      return res.status(500).json({
        success: false,
        error: 'Account authentication is not configured correctly'
      });
    }

    const isValidPassword = await User.verifyPassword(
      password,
      user.password_hash
    );

    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    // -----------------------------
    // Validate stored role
    // -----------------------------

    const normalizedRole = user.role?.toLowerCase();

    if (!VALID_ROLES.includes(normalizedRole)) {
      console.error(
        `Invalid role for user ${user.id}:`,
        user.role
      );

      return res.status(403).json({
        success: false,
        error: 'User account has an invalid role'
      });
    }

    // -----------------------------
    // Generate token
    // -----------------------------

    const token = generateToken({
      ...user,
      role: normalizedRole
    });

    // Never return password hash
    const {
      password_hash,
      password: userPassword,
      ...userWithoutPassword
    } = user;

    const authenticatedUser = {
      ...userWithoutPassword,
      role: normalizedRole
    };

    // -----------------------------
    // Successful login
    // -----------------------------

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      user: authenticatedUser,
      token
    });
  } catch (error) {
    console.error('Login error:', error);

    return res.status(500).json({
      success: false,
      error: 'Failed to login'
    });
  }
};

export const getMe = async (req, res) => {
  try {
    // authenticate middleware should attach the user
    // to req.user
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const {
      password_hash,
      password: userPassword,
      ...userWithoutPassword
    } = req.user;

    return res.status(200).json({
      success: true,
      user: userWithoutPassword
    });
  } catch (error) {
    console.error('Get user error:', error);

    return res.status(500).json({
      success: false,
      error: 'Failed to get user data'
    });
  }
};