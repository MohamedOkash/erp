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

export interface UserScope {
  id: string;
  projectId: string;
  projectName?: string;
  projectCode?: string;
  branchId?: string | null;
  branchName?: string | null;
  workAreaId?: string | null;
  workAreaName?: string | null;
}

export interface User {
  id: string;
  companyId: string;
  employeeId?: string;
  username: string;
  fullName: string;
  email?: string;
  phone?: string;
  roles: UserRole[];
  permissions: Array<string | UserPermission>;
  scopes?: UserScope[];
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
