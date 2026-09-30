import apiClient from './client';
import type { LoginCredentials, AuthResponse, User, CreateStaffPayload, SecurityAuditLog } from '../types';

export const authApi = {
  /**
   * Authenticate user with username or email and password.
   */
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/login', credentials);
    return response.data;
  },

  /**
   * Fetch current authenticated user's profile.
   */
  getMe: async (): Promise<User> => {
    const response = await apiClient.get<User>('/auth/me');
    return response.data;
  },

  /**
   * Logout user and record audit log.
   */
  logout: async (): Promise<{ status: string; message: string }> => {
    const response = await apiClient.post<{ status: string; message: string }>('/auth/logout');
    return response.data;
  },

  /**
   * Verify administrative privileges (strictly requires ADMIN role).
   */
  checkAdmin: async (): Promise<User> => {
    const response = await apiClient.get<User>('/auth/admin-check');
    return response.data;
  },

  /**
   * Retrieve all staff accounts (Admin Only).
   */
  getUsers: async (): Promise<User[]> => {
    const response = await apiClient.get<User[]>('/admin/users');
    return response.data;
  },

  /**
   * Create an authorized staff account (Admin Only).
   */
  createStaff: async (payload: CreateStaffPayload): Promise<User> => {
    const response = await apiClient.post<User>('/admin/users', payload);
    return response.data;
  },

  /**
   * Update active/inactive status of a staff account (Admin Only).
   */
  updateUserStatus: async (userId: number, isActive: boolean): Promise<User> => {
    const response = await apiClient.patch<User>(`/admin/users/${userId}/status`, {
      is_active: isActive,
    });
    return response.data;
  },

  /**
   * Delete a staff account (Admin Only).
   */
  deleteUser: async (userId: number): Promise<{ status: string; message: string }> => {
    const response = await apiClient.delete<{ status: string; message: string }>(`/admin/users/${userId}`);
    return response.data;
  },

  /**
   * Fetch security audit logs (Admin Only).
   */
  getAuditLogs: async (limit: number = 50): Promise<SecurityAuditLog[]> => {
    const response = await apiClient.get<SecurityAuditLog[]>(`/admin/audit-logs?limit=${limit}`);
    return response.data;
  },
};

export default authApi;

