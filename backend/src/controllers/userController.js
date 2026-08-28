import { User } from '../models/User.js';

export const getCurrentUser = async (req, res) => {
  try {
    // Return the authenticated user from middleware
    res.json({
      success: true,
      user: req.user
    });
  } catch (error) {
    console.error('Error getting current user:', error);
    res.status(500).json({ error: 'Failed to get user information' });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    // Only HR can access all users
    if (req.user.role !== 'hr') {
      return res.status(403).json({ error: 'HR access required' });
    }

    const users = await User.findAll();
    res.json({
      success: true,
      users
    });
  } catch (error) {
    console.error('Error getting all users:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
};

export const getUsersByRole = async (req, res) => {
  try {
    const { role } = req.params;
    
    // Only HR can filter by role
    if (req.user.role !== 'hr') {
      return res.status(403).json({ error: 'HR access required' });
    }

    const users = await User.findByRole(role);
    res.json({
      success: true,
      users
    });
  } catch (error) {
    console.error('Error getting users by role:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
};
