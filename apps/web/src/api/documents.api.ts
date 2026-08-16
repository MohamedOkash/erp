import { apiClient } from './client';

export interface DocumentItem {
  id: string;
  company_id: string;
  category_id?: string;
  category_name?: string;
  project_id?: string;
  project_name?: string;
  title: string;
  document_number?: string;
  version: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  file_name?: string;
  file_url?: string;
  file_size?: number;
}

export interface DocumentVersionItem {
  id: string;
  document_id: string;
  version_number: number;
  file_name: string;
  file_url: string;
  file_size_bytes: number;
  notes?: string;
  uploaded_by: string;
  created_at: string;
  uploader_name?: string;
}

export interface DocumentListResponse {
  data: DocumentItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface QueryDocumentDto {
  projectId?: string;
  categoryId?: string;
  category?: string;
  page?: number;
  limit?: number;
}

export const documentsApi = {
  async list(query: QueryDocumentDto = {}): Promise<DocumentListResponse> {
    const params = new URLSearchParams();
    if (query.projectId) params.append('projectId', query.projectId);
    if (query.categoryId) params.append('categoryId', query.categoryId);
    if (query.category) params.append('category', query.category);
    if (query.page) params.append('page', String(query.page));
    if (query.limit) params.append('limit', String(query.limit));
    const qs = params.toString() ? `?${params.toString()}` : '';
    return apiClient.get(`/documents${qs}`);
  },

  async upload(formData: FormData): Promise<any> {
    // Need raw fetch / axios with multipart headers through apiClient or fetch directly
    const res = await fetch('/api/v1/documents/upload', {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'فشل رفع المستند');
    }
    return res.json();
  },

  async uploadNewVersion(id: string, formData: FormData): Promise<any> {
    const res = await fetch(`/api/v1/documents/${id}/upload-new-version`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'فشل رفع الإصدار الجديد');
    }
    return res.json();
  },

  async getVersions(id: string): Promise<DocumentVersionItem[]> {
    return apiClient.get(`/documents/${id}/versions`);
  },

  async download(id: string, fileName?: string, version?: number): Promise<void> {
    const qs = version ? `?version=${version}` : '';
    const res = await fetch(`/api/v1/documents/${id}/download${qs}`, {
      method: 'GET',
      credentials: 'include',
    });
    if (!res.ok) {
      throw new Error('فشل تحميل الملف');
    }
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName || `document-${id}.bin`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  async delete(id: string): Promise<void> {
    return apiClient.delete(`/documents/${id}`);
  },
};
