import { Request, Response, NextFunction } from 'express';
import { Department } from '../models/Department';

const DEFAULT_DEPARTMENTS = [
  'Worship Team',
  'Choir',
  'Media Team',
  'Children\'s Ministry',
  'Security',
  'Prayer Team',
  'Ushering',
];

// @route   GET /api/departments
// @desc    Get all voluntary departments (pre-seeds defaults if empty)
export const getDepartments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    let count = await Department.countDocuments();
    if (count === 0) {
      await Department.insertMany(
        DEFAULT_DEPARTMENTS.map(name => ({ name }))
      );
    }
    const departments = await Department.find().sort({ name: 1 });
    res.status(200).json({
      success: true,
      count: departments.length,
      departments,
    });
  } catch (error) {
    next(error);
  }
};

// @route   POST /api/departments
// @desc    Create a new voluntary department (Admin)
export const createDepartment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, description } = req.body;
    if (!name || !name.trim()) {
      res.status(400).json({ success: false, message: 'Department name is required.' });
      return;
    }

    const cleanName = name.trim();
    const existing = await Department.findOne({ name: { $regex: new RegExp(`^${cleanName}$`, 'i') } });
    if (existing) {
      res.status(400).json({ success: false, message: 'A department with this name already exists.' });
      return;
    }

    const department = await Department.create({
      name: cleanName,
      description: description?.trim() || '',
    });

    res.status(201).json({
      success: true,
      message: 'Department created successfully.',
      department,
    });
  } catch (error) {
    next(error);
  }
};

// @route   DELETE /api/departments/:id
// @desc    Delete a voluntary department (Admin)
export const deleteDepartment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const department = await Department.findByIdAndDelete(req.params.id);
    if (!department) {
      res.status(404).json({ success: false, message: 'Department not found.' });
      return;
    }
    res.status(200).json({
      success: true,
      message: 'Department deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};
