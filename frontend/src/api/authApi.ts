import apiClient from './client';
import type { LoginCredentials, AuthResponse, User } from '../types';

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
};

export default authApi;

