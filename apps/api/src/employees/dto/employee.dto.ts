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
  nationalId: string;
  name: string;
  code: string;
  phone: string;
  roleType: string;
  primaryBranchId: string;
  branchName?: string;
  dailyWage: number;
  hireDate: string;
  isActive: boolean;
  assignments?: EmployeeAssignmentDto[];
}
