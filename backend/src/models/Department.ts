import mongoose, { Document, Schema } from 'mongoose';

export interface IDepartment extends Document {
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

const DepartmentSchema = new Schema<IDepartment>({
  name: { type: String, required: true, unique: true, trim: true },
  description: { type: String, default: '' },
}, {
  timestamps: true,
});

export const Department = mongoose.model<IDepartment>('Department', DepartmentSchema);
