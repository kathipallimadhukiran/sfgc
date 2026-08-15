import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { User, IDutyAssignment } from '../models/User';
import { AuthRequest } from '../middleware/auth';

// @route   GET /api/users
// @desc    Get all members list (Directory)
export const getMembers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { search, department, role } = req.query;

    const query: any = {};
    if (search) {
      const regex = new RegExp(String(search), 'i');
      query.$or = [
        { name: regex },
        { email: regex },
        { familyName: regex },
        { location: regex },
        { mobileNumber: regex },
      ];
    }
    if (department) {
      query.departments = department;
    }
    if (role) {
      query.role = role;
    }

    const members = await User.find(query).sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      count: members.length,
      members,
    });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/users/:id
// @desc    Get single member details
export const getMemberById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const member = await User.findById(req.params.id);
    if (!member) {
      res.status(404).json({ success: false, message: 'Member not found.' });
      return;
    }
    res.status(200).json({ success: true, member });
  } catch (error) {
    next(error);
  }
};

// @route   PUT /api/users/:id
// @desc    Update member details or role (Admin)
export const updateMember = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const updates = { ...req.body };
    delete updates.password; // Do not overwrite password directly here

    const member = await User.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!member) {
      res.status(404).json({ success: false, message: 'Member not found.' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Member updated successfully.',
      member,
    });
  } catch (error) {
    next(error);
  }
};

// @route   DELETE /api/users/:id
// @desc    Delete a member (Admin)
export const deleteMember = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const member = await User.findByIdAndDelete(req.params.id);
    if (!member) {
      res.status(404).json({ success: false, message: 'Member not found.' });
      return;
    }
    res.status(200).json({
      success: true,
      message: 'Member deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

// @route   POST /api/users/:id/assignments
// @desc    Add a duty assignment to a member
export const addAssignment = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { title, role, date, department, notes, status } = req.body;
    if (!title || !role) {
      res.status(400).json({ success: false, message: 'Title and role are required for duty assignment.' });
      return;
    }

    const member = await User.findById(req.params.id);
    if (!member) {
      res.status(404).json({ success: false, message: 'Member not found.' });
      return;
    }

    const newAssignment: IDutyAssignment = {
      id: new mongoose.Types.ObjectId().toString(),
      title,
      role,
      date: date || new Date().toISOString(),
      department: department || '',
      notes: notes || '',
      status: status || 'Assigned',
      assignedBy: req.user?.name || 'Admin',
      createdAt: new Date(),
    };

    member.assignments.push(newAssignment);
    await member.save();

    res.status(201).json({
      success: true,
      message: 'Duty assignment created.',
      assignment: newAssignment,
      member,
    });
  } catch (error) {
    next(error);
  }
};

// @route   PUT /api/users/:id/assignments/:assignmentId
// @desc    Update assignment status or details
export const updateAssignment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id, assignmentId } = req.params;
    const { status, notes, role, title, date, department } = req.body;

    const member = await User.findById(id);
    if (!member) {
      res.status(404).json({ success: false, message: 'Member not found.' });
      return;
    }

    const assignment = member.assignments.find((a: any) => a.id === assignmentId || a._id?.toString() === assignmentId);
    if (!assignment) {
      res.status(404).json({ success: false, message: 'Assignment not found.' });
      return;
    }

    if (status) assignment.status = status;
    if (notes !== undefined) assignment.notes = notes;
    if (role) assignment.role = role;
    if (title) assignment.title = title;
    if (date) assignment.date = date;
    if (department !== undefined) assignment.department = department;

    await member.save();

    res.status(200).json({
      success: true,
      message: 'Assignment updated.',
      member,
    });
  } catch (error) {
    next(error);
  }
};

// @route   DELETE /api/users/:id/assignments/:assignmentId
// @desc    Remove an assignment from a member
export const deleteAssignment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id, assignmentId } = req.params;

    const member = await User.findById(id);
    if (!member) {
      res.status(404).json({ success: false, message: 'Member not found.' });
      return;
    }

    member.assignments = member.assignments.filter(
      (a: any) => a.id !== assignmentId && a._id?.toString() !== assignmentId
    );
    await member.save();

    res.status(200).json({
      success: true,
      message: 'Assignment removed.',
      member,
    });
  } catch (error) {
    next(error);
  }
};

// @route   POST /api/users/push-token
// @desc    Register or update Expo Push Token for mobile push notifications
export const savePushToken = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const pushToken = req.body.pushToken || req.body.token || req.body.expoPushToken;
    const userId = req.user?._id?.toString() || req.body.userId;

    if (!pushToken) {
      res.status(400).json({ success: false, message: 'Push token is required.' });
      return;
    }

    if (userId) {
      await User.findByIdAndUpdate(userId, { pushToken });
    } else {
      // Unauthenticated or guest device
      await User.findOneAndUpdate(
        { pushToken },
        { pushToken },
        { upsert: false }
      );
    }

    console.log(`📱 Push token registered: ${pushToken}`);
    res.status(200).json({
      success: true,
      message: 'Mobile push token registered successfully.',
    });
  } catch (error) {
    next(error);
  }
};

