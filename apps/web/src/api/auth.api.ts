import { apiClient } from './client';
import type { LoginResponse, User } from '../types/auth.types';

export interface LoginDto {
  username: string;
  password?: string;
}

export interface UpdateProfilePayload {
  username?: string;
  fullName?: string;
  email?: string;
  phone?: string;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
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
   * Update current user profile info
   */
  async updateProfile(dto: UpdateProfilePayload): Promise<{ user: User }> {
    return apiClient.patch<{ user: User }>('/auth/me', dto);
  },

  /**
   * Change current user password
   */
  async changePassword(dto: ChangePasswordPayload): Promise<{ success: boolean; message: string }> {
    return apiClient.post<{ success: boolean; message: string }>('/auth/change-password', dto);
  },

  /**
   * Logout current session
   */
  async logout(): Promise<{ message: string }> {
    return apiClient.post<{ message: string }>('/auth/logout');
  },
};

