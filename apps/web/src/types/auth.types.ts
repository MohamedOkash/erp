export interface UserRole {
  roleName: string;
  roleCode: string;
  scopeType: string;
  scopeId?: string | null;
}

export interface UserPermission {
  module: string;
  action: string;
}

export interface User {
  id: string;
  companyId: string;
  username: string;
  fullName: string;
  roles: UserRole[];
  permissions: UserPermission[];
}

export interface LoginResponse {
  token: string;
  user: User;
  expiresAt: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}
