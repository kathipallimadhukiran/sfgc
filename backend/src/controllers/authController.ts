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

    if (!password || (!name && !email && !mobileNumber)) {
      res.status(400).json({ success: false, message: 'Please provide required registration fields and password.' });
      return;
    }

    const cleanEmail = email && email.trim() ? email.trim().toLowerCase() : undefined;
    const cleanMobile = mobileNumber && mobileNumber.trim() ? mobileNumber.trim() : '';

    if (!cleanEmail && !cleanMobile) {
      res.status(400).json({ success: false, message: 'Please provide either an email address or a mobile phone number.' });
      return;
    }

    if (cleanEmail) {
      const existingEmail = await User.findOne({ email: cleanEmail });
      if (existingEmail) {
        res.status(400).json({ success: false, message: 'An account with this email address already exists.' });
        return;
      }
    }

    if (cleanMobile) {
      const existingMobile = await User.findOne({ mobileNumber: cleanMobile });
      if (existingMobile) {
        res.status(400).json({ success: false, message: 'An account with this mobile number already exists.' });
        return;
      }
    }

    // Auto-assign Admin if this is the very first user in the database
    const userCount = await User.countDocuments();
    const assignedRole = userCount === 0 ? 'Admin' : (role || 'Member');

    const newUser = await User.create({
      name: name?.trim() || 'Church Member',
      ...(cleanEmail ? { email: cleanEmail } : {}),
      password,
      role: assignedRole,
      familyName: familyName || `${name || 'Member'} Family`,
      location: location || '',
      mobileNumber: cleanMobile,
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

    // Emit real-time Socket.IO notification to Admin Panel
    try {
      const io = (req as any).app.get('io');
      if (io) {
        io.emit('newMemberRegistered', {
          id: newUser._id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          departments: newUser.departments,
          mobileNumber: newUser.mobileNumber,
          createdAt: newUser.createdAt
        });
      }
    } catch (socketErr) {
      console.log('Socket notification error ignored:', socketErr);
    }

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
// @desc    Login user with email/mobile number & password
export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, mobileNumber, credential, password } = req.body;

    const identifier = (email || mobileNumber || credential || '').trim();

    if (!identifier || !password) {
      res.status(400).json({ success: false, message: 'Please provide your email address or mobile number and password.' });
      return;
    }

    const cleanLower = identifier.toLowerCase();

    // Query by either email or mobile number
    const user = await User.findOne({
      $or: [
        { email: cleanLower },
        { mobileNumber: identifier }
      ]
    }).select('+password');

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

    // Emit real-time notification to Admin Panel
    try {
      const io = (req as any).app.get('io');
      if (io) {
        io.emit('departmentInterestNotification', {
          userId: req.user._id,
          userName: updatedUser?.name || 'Member',
          userEmail: updatedUser?.email,
          departments,
          updatedAt: new Date()
        });
      }
    } catch (socketErr) {
      console.log('Socket notification error ignored:', socketErr);
    }

    res.status(200).json({
      success: true,
      message: 'Volunteer preferences saved.',
      user: updatedUser
    });
  } catch (error) {
    next(error);
  }
};
