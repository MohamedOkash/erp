export interface StagingRowResponse {
  rowIndex: number;
  name: string | null;
  nationalId: string | null;
  phone: string | null;
  branch: string | null;
  wage: number;
  status: 'valid' | 'duplicate' | 'invalid';
  errors: string[];
}

export interface ImportSummary {
  total: number;
  valid: number;
  duplicate: number;
  invalid: number;
}

export interface ImportUploadResponseDto {
  jobId: string;
  summary: ImportSummary;
  rows: StagingRowResponse[];
}
