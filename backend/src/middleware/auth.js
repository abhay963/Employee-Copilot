import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { config } from '../config/index.js';

// Generate JWT token
export const generateToken = (user) => {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role
  };
  
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn || '24h'
  });
};

// Verify JWT token
export const verifyToken = (token) => {
  try {
    return jwt.verify(token, config.jwtSecret);
  } catch (error) {
    return null;
  }
};

// Authentication middleware
export const authenticate = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Verify token
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Get user from database to ensure they still exist
    const user = await User.findById(decoded.id);
    
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      department: user.department
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({ error: 'Authentication failed' });
  }
};

// Require HR role
export const requireHR = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      error: 'User not authenticated'
    });
  }

  if (req.user.role !== 'hr') {
    return res.status(403).json({
      error: 'HR access required'
    });
  }

  next();
};

// Require employee role
export const requireEmployee = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      error: 'User not authenticated'
    });
  }

  if (req.user.role !== 'employee') {
    return res.status(403).json({
      error: 'Employee access required'
    });
  }

  next();
};

// Require either HR or employee
export const requireAuthenticated = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      error: 'User not authenticated'
    });
  }

  next();
};