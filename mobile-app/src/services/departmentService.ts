import { apiClient } from './apiClient';

export interface DepartmentItem {
  _id: string;
  name: string;
  description?: string;
  createdAt?: string;
}

class DepartmentService {
  // Fetch all voluntary departments from backend API
  async getDepartments(): Promise<{ success: boolean; departments: DepartmentItem[]; message?: string }> {
    try {
      const res = await apiClient.get('/api/departments');
      if (res.success && Array.isArray(res.departments)) {
        return { success: true, departments: res.departments };
      }
      return { success: false, departments: [], message: res.message || 'Failed to fetch departments.' };
    } catch (err: any) {
      console.error('getDepartments error:', err);
      return { success: false, departments: [], message: err.message || 'Network error fetching departments.' };
    }
  }

  // Create a new voluntary department (Admin only)
  async createDepartment(name: string, description?: string): Promise<{ success: boolean; department?: DepartmentItem; message?: string }> {
    try {
      const res = await apiClient.post('/api/departments', { name, description });
      return res;
    } catch (err: any) {
      console.error('createDepartment error:', err);
      return { success: false, message: err.message || 'Failed to create department.' };
    }
  }

  // Delete a voluntary department (Admin only)
  async deleteDepartment(id: string): Promise<{ success: boolean; message?: string }> {
    try {
      const res = await apiClient.delete(`/api/departments/${id}`);
      return res;
    } catch (err: any) {
      console.error('deleteDepartment error:', err);
      return { success: false, message: err.message || 'Failed to delete department.' };
    }
  }
}

export const departmentService = new DepartmentService();
