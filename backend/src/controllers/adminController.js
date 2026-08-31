import { User } from '../models/User.js';

export const getUsers = async (req, res) => {
  try {
    const users = await User.findAll();

    // Remove password hashes from response
    const usersWithoutPasswords = users.map(user => {
      const { password_hash, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });

    return res.status(200).json({
      success: true,
      users: usersWithoutPasswords
    });
  } catch (error) {
    console.error('Get users error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get users'
    });
  }
};

export const blockUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Prevent admin from blocking themselves
    if (user.id === req.user.id) {
      return res.status(400).json({
        success: false,
        error: 'You cannot block yourself'
      });
    }

    const updatedUser = await User.blockUser(id);

    // Remove password hash from response
    const { password_hash, ...userWithoutPassword } = updatedUser;

    return res.status(200).json({
      success: true,
      user: userWithoutPassword,
      message: 'User blocked successfully'
    });
  } catch (error) {
    console.error('Block user error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to block user'
    });
  }
};

export const unblockUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Prevent admin from unblocking themselves (not strictly necessary but for consistency)
    if (user.id === req.user.id) {
      return res.status(400).json({
        success: false,
        error: 'You cannot unblock yourself'
      });
    }

    const updatedUser = await User.unblockUser(id);

    // Remove password hash from response
    const { password_hash, ...userWithoutPassword } = updatedUser;

    return res.status(200).json({
      success: true,
      user: userWithoutPassword,
      message: 'User unblocked successfully'
    });
  } catch (error) {
    console.error('Unblock user error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to unblock user'
    });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Prevent admin from deleting themselves
    if (user.id === req.user.id) {
      return res.status(400).json({
        success: false,
        error: 'You cannot delete yourself'
      });
    }

    const deletedUser = await User.delete(id);

    // Remove password hash from response
    const { password_hash, ...userWithoutPassword } = deletedUser;

    return res.status(200).json({
      success: true,
      user: userWithoutPassword,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete user'
    });
  }
};

export const getUserStats = async (req, res) => {
  try {
    const stats = await User.getUserStats();

    return res.status(200).json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get user statistics'
    });
  }
};

export const changeUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    // Validate role
    const validRoles = ['employee', 'hr', 'admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid role. Must be one of: employee, hr, admin'
      });
    }

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Prevent admin from changing their own role
    if (user.id === req.user.id) {
      return res.status(400).json({
        success: false,
        error: 'You cannot change your own role'
      });
    }

    const updatedUser = await User.updateRole(id, role);

    // Remove password hash from response
    const { password_hash, ...userWithoutPassword } = updatedUser;

    return res.status(200).json({
      success: true,
      user: userWithoutPassword,
      message: 'User role changed successfully'
    });
  } catch (error) {
    console.error('Change user role error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to change user role'
    });
  }
};