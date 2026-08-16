import { apiClient } from './client';

export interface BiometricPolicyUsed {
  id: string;
  shiftStartTime: string;
  shiftEndTime: string;
  graceMinutes: number;
  breakMinutes: number;
  overtimeThresholdHours: number;
  overtimeMultiplier: number;
  effectiveFrom: string;
  projectName: string;
}

export interface BiometricStagingRow {
  rowIndex: number;
  stagingId?: string;
  date: string;
  employee: string;
  deviceCode: string | null;
  nationalId: string | null;
  status: string;
  statusCode: string;
  checkIn: string | null;
  checkOut: string | null;
  overtime: number;
  source: string;
  notes: string | null;
  rowStatus: 'valid' | 'duplicate' | 'invalid';
  errors: string[];
}

export interface BiometricImportUploadResponse {
  jobId: string;
  summary: {
    total: number;
    valid: number;
    duplicate: number;
    invalid: number;
  };
  detectedColumns: { [key: string]: number };
  policyUsed: BiometricPolicyUsed | null;
  rows: BiometricStagingRow[];
}

export interface CommitImportResponse {
  imported: number;
  skipped: number;
}

export const importsApi = {
  uploadBiometricAttendance: async (file: File): Promise<BiometricImportUploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.upload<BiometricImportUploadResponse>(
      '/imports/attendance-device/upload',
      formData,
    );
  },

  updateStagingRow: async (
    rowId: string,
    payload: { parsedData: any; status?: string },
  ): Promise<any> => {
    return apiClient.patch<any>(`/imports/staging/${rowId}`, payload);
  },

  commitImport: async (jobId: string): Promise<CommitImportResponse> => {
    return apiClient.post<CommitImportResponse>(`/imports/${jobId}/commit`);
  },
};
