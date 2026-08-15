export class EmployeeAssignmentDto {
  projectId: string;
  projectName: string;
  projectCode: string;
  assignedRole: string;
  startDate: string;
}

export class EmployeeResponseDto {
  id: string;
  companyId: string;
  identityNumber: string;
  nationalId?: string;
  identityType?: string;
  identityExpiryDate?: string;
  nationality?: string;
  name: string;
  code: string;
  phone: string;
  roleType: string;
  role?: string;
  primaryBranchId: string;
  branchId?: string;
  branchName?: string;
  dailyWage: number;
  hireDate: string;
  isActive: boolean;
  assignments?: EmployeeAssignmentDto[];
}
