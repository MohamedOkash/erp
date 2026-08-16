import { apiClient } from './client';

export interface IncentiveRule {
  id: string;
  company_id?: string;
  name: string;
  rule_type: 'production_bonus' | 'quality_bonus' | 'attendance_bonus' | string;
  threshold_percentage: number | string;
  reward_amount: number | string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CreateIncentiveRulePayload {
  name: string;
  type: string;
  thresholdPercentage: number;
  rewardAmount: number;
  enabled?: boolean;
}

export interface UpdateIncentiveRulePayload {
  name?: string;
  type?: string;
  thresholdPercentage?: number;
  rewardAmount?: number;
  enabled?: boolean;
}

export interface IncentiveCalculationItem {
  employeeId: string;
  employeeName: string;
  projectId?: string;
  ruleId: string;
  ruleName: string;
  amount: number;
  reason: string;
  percentage?: number;
}

export interface IncentiveCalculationResponse {
  calculations: IncentiveCalculationItem[];
  totalAmount: number;
}

export interface IncentiveLedgerItem {
  id: string;
  company_id: string;
  rule_id?: string;
  employee_id: string;
  project_id?: string;
  date: string;
  amount: number | string;
  status: 'pending' | 'approved' | 'paid' | string;
  notes?: string;
  created_at: string;
  updated_at: string;
  employee_name?: string;
  employee_code?: string;
  rule_name?: string;
  project_name?: string;
}

export interface IncentiveLedgerResponse {
  data: IncentiveLedgerItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  summary: {
    totalPending: number;
    totalPaid: number;
    grandTotal: number;
  };
}

export interface QueryIncentiveDto {
  page?: number;
  limit?: number;
  fromDate?: string;
  toDate?: string;
  employeeId?: string;
  status?: string;
}

export const incentivesApi = {
  async listRules(query: QueryIncentiveDto = {}): Promise<{ data: IncentiveRule[]; total: number; page: number; limit: number; totalPages: number }> {
    const params = new URLSearchParams();
    if (query.page) params.append('page', String(query.page));
    if (query.limit) params.append('limit', String(query.limit));
    const qs = params.toString() ? `?${params.toString()}` : '';
    return apiClient.get(`/incentive-rules${qs}`);
  },

  async createRule(payload: CreateIncentiveRulePayload): Promise<IncentiveRule> {
    return apiClient.post('/incentive-rules', payload);
  },

  async updateRule(id: string, payload: UpdateIncentiveRulePayload): Promise<IncentiveRule> {
    return apiClient.patch(`/incentive-rules/${id}`, payload);
  },

  async deleteRule(id: string): Promise<void> {
    return apiClient.delete(`/incentive-rules/${id}`);
  },

  async calculate(payload: { fromDate?: string; toDate?: string; employeeIds?: string[] }): Promise<IncentiveCalculationResponse> {
    return apiClient.post('/incentives/calculate', payload);
  },

  async approve(payload: { calculations: Array<{ employeeId: string; ruleId: string; amount: number; projectId?: string; reason?: string; notes?: string; date?: string }> }): Promise<{ message: string; approvedCount: number }> {
    return apiClient.post('/incentives/approve', payload);
  },

  async listLedger(query: QueryIncentiveDto = {}): Promise<IncentiveLedgerResponse> {
    const params = new URLSearchParams();
    if (query.page) params.append('page', String(query.page));
    if (query.limit) params.append('limit', String(query.limit));
    if (query.fromDate) params.append('fromDate', query.fromDate);
    if (query.toDate) params.append('toDate', query.toDate);
    if (query.employeeId) params.append('employeeId', query.employeeId);
    if (query.status) params.append('status', query.status);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return apiClient.get(`/incentive-ledger${qs}`);
  },

  async markPaid(id: string): Promise<IncentiveLedgerItem> {
    return apiClient.patch(`/incentive-ledger/${id}/mark-paid`, {});
  },
};
