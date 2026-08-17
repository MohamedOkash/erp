import { apiClient } from './client';

export interface UserScopeItem {
  id?: string;
  projectId: string;
  projectName?: string;
  projectCode?: string;
  branchId?: string | null;
  branchName?: string | null;
  workAreaId?: string | null;
  workAreaName?: string | null;
}

export interface UserRoleItem {
  roleId: string;
  roleName: string;
  roleCode: string;
  scopeType?: string;
  scopeId?: string | null;
}

export interface UserAccount {
  id: string;
  companyId: string;
  employeeId?: string | null;
  username: string;
  email?: string | null;
  fullName: string;
  phone?: string | null;
  isActive: boolean;
  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt: string;
  employee?: {
    id: string;
    name: string;
    code: string;
    roleType?: string;
  } | null;
  roles: UserRoleItem[];
  scopes: UserScopeItem[];
}

export interface PaginatedUsersResponse {
  data: UserAccount[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface QueryUserParams {
  page?: number;
  limit?: number;
  search?: string;
  roleCode?: string;
  branchId?: string;
  projectId?: string;
  isActive?: boolean;
}

export interface CreateUserDto {
  employeeId?: string;
  username: string;
  password: string;
  fullName?: string;
  email?: string;
  phone?: string;
  roleCodes: string[];
  scopes?: Array<{
    projectId: string;
    branchId?: string;
    workAreaId?: string;
  }>;
  isActive?: boolean;
}

export interface UpdateUserDto {
  fullName?: string;
  email?: string;
  phone?: string;
  employeeId?: string;
  roleCodes?: string[];
  scopes?: Array<{
    projectId: string;
    branchId?: string;
    workAreaId?: string;
  }>;
  isActive?: boolean;
}

export interface UserOverrideItem {
  permissionId: string;
  permissionCode: string;
  permissionName?: string;
  module?: string;
  grantType: 'grant' | 'deny';
}

export interface UserOverridesResponse {
  userId: string;
  username: string;
  fullName: string;
  rolePermissions: string[];
  overrides: UserOverrideItem[];
  effectivePermissions: string[];
}

export interface UpdateOverridesDto {
  overrides: Array<{
    permissionId?: string;
    permissionCode?: string;
    grantType: 'grant' | 'deny';
  }>;
}

export const usersApi = {
  /**
   * List users with pagination and filters
   */
  async listUsers(params?: QueryUserParams): Promise<PaginatedUsersResponse> {
    return apiClient.get<PaginatedUsersResponse>('/users', params as any);
  },

  /**
   * Get single user by ID
   */
  async getUser(id: string): Promise<UserAccount> {
    return apiClient.get<UserAccount>(`/users/${id}`);
  },

  /**
   * Create new user account
   */
  async createUser(dto: CreateUserDto): Promise<UserAccount> {
    return apiClient.post<UserAccount>('/users', dto);
  },

  /**
   * Update user details, roles and project scopes
   */
  async updateUser(id: string, dto: UpdateUserDto): Promise<UserAccount> {
    return apiClient.patch<UserAccount>(`/users/${id}`, dto);
  },

  /**
   * Reset user password
   */
  async resetPassword(id: string, newPassword: string): Promise<{ message: string }> {
    return apiClient.post<{ message: string }>(`/users/${id}/reset-password`, { newPassword });
  },

  /**
   * Soft delete / deactivate user
   */
  async deleteUser(id: string): Promise<{ message: string }> {
    return apiClient.delete<{ message: string }>(`/users/${id}`);
  },

  /**
   * Get user permission overrides
   */
  async getUserOverrides(id: string): Promise<UserOverridesResponse> {
    return apiClient.get<UserOverridesResponse>(`/users/${id}/overrides`);
  },

  /**
   * Update user permission overrides
   */
  async updateUserOverrides(id: string, dto: UpdateOverridesDto): Promise<UserOverridesResponse> {
    return apiClient.put<UserOverridesResponse>(`/users/${id}/overrides`, dto);
  },
};
