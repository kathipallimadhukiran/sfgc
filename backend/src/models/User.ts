import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IDutyAssignment {
  id?: string;
  title: string;
  role: string;
  date?: string;
  department?: string;
  notes?: string;
  status: 'Assigned' | 'Confirmed' | 'Completed' | 'Declined';
  assignedBy?: string;
  createdAt: Date;
}

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  role: 'Admin' | 'Super Admin' | 'Worship Leader' | 'Media Team' | 'Event Coordinator' | 'Notice Manager' | 'Member' | 'Guest';
  familyName?: string;
  location?: string;
  mobileNumber?: string;
  familyHeadName?: string;
  familyHeadMobileNumber?: string;
  familyHeadEmail?: string;
  familyMembersCount?: number;
  birthday?: string;
  baptismDate?: string;
  ministry?: string;
  address?: string;
  departments: string[];
  assignments: IDutyAssignment[];
  favorites: string[];
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const DutyAssignmentSchema = new Schema<IDutyAssignment>({
  id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
  title: { type: String, required: true },
  role: { type: String, required: true },
  date: { type: String },
  department: { type: String },
  notes: { type: String },
  status: { 
    type: String, 
    enum: ['Assigned', 'Confirmed', 'Completed', 'Declined'],
    default: 'Assigned' 
  },
  assignedBy: { type: String, default: 'Admin' },
  createdAt: { type: Date, default: Date.now },
});

const UserSchema = new Schema<IUser>({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: false, sparse: true, lowercase: true, trim: true },
  password: { type: String, required: true, select: false },
  role: { 
    type: String, 
    enum: ['Admin', 'Super Admin', 'Worship Leader', 'Media Team', 'Event Coordinator', 'Notice Manager', 'Member', 'Guest'],
    default: 'Member' 
  },
  familyName: { type: String, default: '' },
  location: { type: String, default: '' },
  mobileNumber: { type: String, default: '', trim: true },
  familyHeadName: { type: String, default: '' },
  familyHeadMobileNumber: { type: String, default: '' },
  familyHeadEmail: { type: String, default: '' },
  familyMembersCount: { type: Number, default: 1 },
  birthday: { type: String, default: '' },
  baptismDate: { type: String, default: '' },
  ministry: { type: String, default: '' },
  address: { type: String, default: '' },
  departments: { type: [String], default: [] },
  assignments: { type: [DutyAssignmentSchema], default: [] },
  favorites: { type: [String], default: [] },
}, {
  timestamps: true,
  toJSON: {
    transform: (doc, ret) => {
      delete ret.password;
      return ret;
    }
  }
});

// Encrypt password before save
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Match user password (supports bcrypt as well as legacy/direct hashes)
UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  if (!this.password) return false;
  if (this.password.startsWith('$2a$') || this.password.startsWith('$2b$')) {
    return await bcrypt.compare(candidatePassword, this.password);
  }
  return this.password === candidatePassword;
};

export const User = mongoose.model<IUser>('User', UserSchema);
