import { apiClient } from './client';

export interface Permission {
  id: string;
  code: string;
  module: string;
  action: string;
  description?: string;
  name?: string;
}

export interface Role {
  id: string;
  code: string;
  name: string;
  description?: string;
  scopeType?: string;
  companyId?: string | null;
  createdAt?: string;
}

export interface RolePermissionsResponse {
  roleId: string;
  roleCode: string;
  roleName: string;
  permissionIds: string[];
}

export const rolesApi = {
  /**
   * Fetch all permissions catalogue
   */
  async listPermissions(): Promise<Permission[]> {
    return apiClient.get<Permission[]>('/permissions');
  },

  /**
   * Fetch all roles
   */
  async listRoles(): Promise<Role[]> {
    return apiClient.get<Role[]>('/roles');
  },

  /**
   * Get permissions assigned to a specific role
   */
  async getRolePermissions(roleId: string): Promise<RolePermissionsResponse> {
    return apiClient.get<RolePermissionsResponse>(`/roles/${roleId}/permissions`);
  },

  /**
   * Update permissions for a specific role
   */
  async updateRolePermissions(roleId: string, permissionIds: string[]): Promise<RolePermissionsResponse> {
    return apiClient.put<RolePermissionsResponse>(`/roles/${roleId}/permissions`, { permissionIds });
  },
};
