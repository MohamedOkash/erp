import { apiClient } from './client';
import type { LoginResponse, User } from '../types/auth.types';

export interface LoginDto {
  username: string;
  password?: string;
}

export const authApi = {
  /**
   * Login user with username and password
   */
  async login(dto: LoginDto): Promise<LoginResponse> {
    return apiClient.post<LoginResponse>('/auth/login', dto);
  },

  /**
   * Get current authenticated user profile
   */
  async getProfile(): Promise<User> {
    return apiClient.get<User>('/auth/me');
  },

  /**
   * Logout current session
   */
  async logout(): Promise<{ message: string }> {
    return apiClient.post<{ message: string }>('/auth/logout');
  },
};
