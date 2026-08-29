import { ValidEmployeeId } from '../models/ValidEmployeeId.js';

export const getValidEmployeeIds = async (req, res) => {
  try {
    const validIds = await ValidEmployeeId.findAll();

    return res.status(200).json({
      success: true,
      valid_employee_ids: validIds
    });
  } catch (error) {
    console.error('Get valid employee IDs error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get valid employee IDs'
    });
  }
};

export const addValidEmployeeId = async (req, res) => {
  try {
    const { employee_id } = req.body;

    if (!employee_id || typeof employee_id !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Employee ID is required'
      });
    }

    const trimmedEmployeeId = employee_id.trim();

    if (trimmedEmployeeId.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Employee ID cannot be empty'
      });
    }

    if (trimmedEmployeeId.length > 50) {
      return res.status(400).json({
        success: false,
        error: 'Employee ID must be 50 characters or less'
      });
    }

    // Check if employee ID already exists
    const existingId = await ValidEmployeeId.findByEmployeeId(trimmedEmployeeId);
    if (existingId) {
      return res.status(409).json({
        success: false,
        error: 'Employee ID already exists'
      });
    }

    const validId = await ValidEmployeeId.create({
      employee_id: trimmedEmployeeId,
      created_by: req.user.id
    });

    return res.status(201).json({
      success: true,
      valid_employee_id: validId,
      message: 'Employee ID added successfully'
    });
  } catch (error) {
    console.error('Add valid employee ID error:', error);

    // Handle PostgreSQL unique constraint
    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        error: 'Employee ID already exists'
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to add employee ID'
    });
  }
};

export const deleteValidEmployeeId = async (req, res) => {
  try {
    const { id } = req.params;

    const validId = await ValidEmployeeId.findById(id);
    
    if (!validId) {
      return res.status(404).json({
        success: false,
        error: 'Employee ID not found'
      });
    }

    const deletedId = await ValidEmployeeId.delete(id);

    return res.status(200).json({
      success: true,
      valid_employee_id: deletedId,
      message: 'Employee ID deleted successfully'
    });
  } catch (error) {
    console.error('Delete valid employee ID error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete employee ID'
    });
  }
};