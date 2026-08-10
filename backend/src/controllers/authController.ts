import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User, IUser } from '../models/User';
import { config } from '../config/config';
import { AuthRequest } from '../middleware/auth';

const generateToken = (user: IUser): string => {
  return jwt.sign(
    { id: user._id, role: user.role, email: user.email }, 
    config.jwtSecret, 
    { expiresIn: config.jwtExpire } as jwt.SignOptions
  );
};

// @route   POST /api/auth/register
// @desc    Register a new user / member
export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { 
      name, 
      email, 
      password, 
      role, 
      familyName, 
      location, 
      mobileNumber,
      familyHeadName,
      familyHeadMobileNumber,
      familyHeadEmail,
      familyMembersCount,
      birthday,
      baptismDate,
      ministry,
      address,
      departments
    } = req.body;

    if (!email || !password) {
      res.status(400).json({ success: false, message: 'Please provide both email and password.' });
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const existingUser = await User.findOne({ email: cleanEmail });
    if (existingUser) {
      res.status(400).json({ success: false, message: 'An account with this email already exists.' });
      return;
    }

    // Auto-assign Admin if this is the very first user in the database
    const userCount = await User.countDocuments();
    const assignedRole = userCount === 0 ? 'Admin' : (role || 'Member');

    const newUser = await User.create({
      name: name?.trim() || 'Church Member',
      email: cleanEmail,
      password,
      role: assignedRole,
      familyName: familyName || `${name || 'Member'} Family`,
      location: location || '',
      mobileNumber: mobileNumber || '',
      familyHeadName: familyHeadName || '',
      familyHeadMobileNumber: familyHeadMobileNumber || '',
      familyHeadEmail: familyHeadEmail || '',
      familyMembersCount: Number(familyMembersCount) || 1,
      birthday: birthday || '',
      baptismDate: baptismDate || '',
      ministry: ministry || '',
      address: address || '',
      departments: Array.isArray(departments) ? departments : [],
      assignments: [],
      favorites: []
    });

    const token = generateToken(newUser);

    res.status(201).json({
      success: true,
      message: 'Account registered successfully.',
      token,
      user: newUser
    });
  } catch (error) {
    next(error);
  }
};

// @route   POST /api/auth/login
// @desc    Login user with email & password
export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ success: false, message: 'Please provide email and password.' });
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: cleanEmail }).select('+password');

    if (!user) {
      res.status(401).json({ success: false, message: 'Invalid credentials. User not found.' });
      return;
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      res.status(401).json({ success: false, message: 'Invalid password. Please check your credentials.' });
      return;
    }

    const token = generateToken(user);

    res.status(200).json({
      success: true,
      message: 'Login successful.',
      token,
      user
    });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/auth/me
// @desc    Get currently logged in user profile
export const getMe = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'User not authenticated' });
      return;
    }
    res.status(200).json({ success: true, user: req.user });
  } catch (error) {
    next(error);
  }
};

// @route   PUT /api/auth/profile
// @desc    Update current user profile / family details
export const updateProfile = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'User not authenticated' });
      return;
    }

    const allowedUpdates = [
      'name', 'familyName', 'location', 'mobileNumber', 'familyHeadName',
      'familyHeadMobileNumber', 'familyHeadEmail', 'familyMembersCount',
      'birthday', 'baptismDate', 'ministry', 'address', 'departments', 'favorites'
    ];

    const updates: any = {};
    for (const key of allowedUpdates) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      user: updatedUser
    });
  } catch (error) {
    next(error);
  }
};

// @route   POST /api/auth/volunteering
// @desc    Update volunteering / department choices
export const saveVolunteering = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'User not authenticated' });
      return;
    }

    const { departments } = req.body;
    if (!Array.isArray(departments)) {
      res.status(400).json({ success: false, message: 'Departments must be an array of strings.' });
      return;
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { $set: { departments } },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: 'Volunteer preferences saved.',
      user: updatedUser
    });
  } catch (error) {
    next(error);
  }
};
