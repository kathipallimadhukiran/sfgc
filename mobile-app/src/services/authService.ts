import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from './apiClient';

export interface DutyAssignment {
  _id?: string;
  id?: string;
  title: string;
  role: string;
  date?: string;
  department?: string;
  notes?: string;
  status?: 'Assigned' | 'Confirmed' | 'Completed' | 'Declined';
  assignedBy?: string;
  createdAt?: string;
}

export interface UserProfile {
  _id?: string;
  id?: string;
  name: string;
  email: string;
  password?: string;
  role?: string;
  familyName?: string;
  location?: string;
  mobileNumber?: string;
  familyHeadMobileNumber?: string;
  familyHeadName?: string;
  familyMembersCount?: number | string;
  birthday?: string;
  baptismDate?: string;
  ministry?: string;
  address?: string;
  departments?: string[];
  assignments?: DutyAssignment[];
  favorites?: string[];
  createdAt?: string;
  updatedAt?: string;
}

class AuthService {
  // Register a new user: Strictly saves into MongoDB via Backend API
  async register(userData: Partial<UserProfile>): Promise<{ success: boolean; token?: string; user?: any; message?: string }> {
    try {
      const email = userData.email?.trim().toLowerCase();
      if (!email || !userData.password) {
        return { success: false, message: 'Email and password are required.' };
      }

      const res = await apiClient.post('/api/auth/register', {
        ...userData,
        email,
      });

      if (res.success && res.token && res.user) {
        // Permanently persist token & user session
        await AsyncStorage.setItem('userToken', res.token);
        await AsyncStorage.setItem('userData', JSON.stringify(res.user));
        return {
          success: true,
          token: res.token,
          user: res.user,
          message: res.message || 'Registration successful.',
        };
      }

      return {
        success: false,
        message: res.message || 'Registration failed on server.',
      };
    } catch (err: any) {
      console.error('Registration API error:', err);
      return { success: false, message: err.message || 'Failed to connect to backend server.' };
    }
  }

  // Login user: Authenticates directly against MongoDB via Backend API
  async login(email: string, password: string): Promise<{ success: boolean; token?: string; user?: any; message?: string }> {
    try {
      const cleanEmail = email.trim().toLowerCase();
      if (!cleanEmail || !password) {
        return { success: false, message: 'Please enter both email and password.' };
      }

      const res = await apiClient.post('/api/auth/login', { email: cleanEmail, password });

      if (res.success && res.token && res.user) {
        // Permanently persist token & user session for 1-time sign in
        await AsyncStorage.setItem('userToken', res.token);
        await AsyncStorage.setItem('userData', JSON.stringify(res.user));
        return {
          success: true,
          token: res.token,
          user: res.user,
          message: res.message || 'Login successful.',
        };
      }

      return {
        success: false,
        message: res.message || 'Invalid email or password.',
      };
    } catch (err: any) {
      console.error('Login API error:', err);
      return { success: false, message: err.message || 'Failed to connect to backend server.' };
    }
  }

  // Get current user profile from MongoDB
  async getMe(): Promise<{ success: boolean; user?: any; message?: string }> {
    try {
      const res = await apiClient.get('/api/auth/me');
      if (res.success && res.user) {
        await AsyncStorage.setItem('userData', JSON.stringify(res.user));
        return res;
      }
      return { success: false };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  }

  // Update profile / family details in MongoDB
  async updateProfile(userId: string, profileData: Partial<UserProfile>): Promise<{ success: boolean; user?: any; message?: string }> {
    try {
      const res = await apiClient.put('/api/auth/profile', profileData);
      if (res.success && res.user) {
        await AsyncStorage.setItem('userData', JSON.stringify(res.user));
        return res;
      }
      return { success: false, message: res.message || 'Update failed.' };
    } catch (err: any) {
      console.error('Update profile error:', err);
      return { success: false, message: err.message || 'Update profile failed.' };
    }
  }

  // Save volunteering preferences in MongoDB
  async saveVolunteering(userId: string, departments: string[]): Promise<boolean> {
    try {
      const res = await apiClient.post('/api/auth/volunteering', { departments });
      if (res.success && res.user) {
        await AsyncStorage.setItem('userData', JSON.stringify(res.user));
        return true;
      }
      return false;
    } catch (err) {
      console.error('Save volunteering error:', err);
      return false;
    }
  }

  // Get all members directory from MongoDB
  async getMembers(): Promise<{ success: boolean; members: any[] }> {
    try {
      const res = await apiClient.get('/api/users');
      if (res.success && Array.isArray(res.members)) {
        return res;
      }
      return { success: false, members: [] };
    } catch (err: any) {
      console.error('Get members error:', err);
      return { success: false, members: [] };
    }
  }

  // Add Duty Assignment in MongoDB
  async addAssignment(memberId: string, assignment: Partial<DutyAssignment>): Promise<{ success: boolean; message?: string; member?: any }> {
    try {
      const res = await apiClient.post(`/api/users/${memberId}/assignments`, assignment);
      return res;
    } catch (err: any) {
      console.error('Add assignment error:', err);
      return { success: false, message: err.message || 'Failed to add assignment.' };
    }
  }

  // Delete member from MongoDB
  async deleteMember(memberId: string): Promise<{ success: boolean; message?: string }> {
    try {
      const res = await apiClient.delete(`/api/users/${memberId}`);
      return res;
    } catch (err: any) {
      console.error('Delete member error:', err);
      return { success: false, message: err.message || 'Failed to delete member' };
    }
  }
}

export const authService = new AuthService();
