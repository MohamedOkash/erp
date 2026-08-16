export interface ApiError {
  message: string;
  statusCode?: number;
  code?: string;
  error?: string;
}

class ApiClient {
  private baseUrl = '/api/v1';

  private getToken(): string | null {
    return localStorage.getItem('erp_auth_token');
  }

  public setToken(token: string | null) {
    if (token) {
      localStorage.setItem('erp_auth_token', token);
    } else {
      localStorage.removeItem('erp_auth_token');
    }
  }

  public async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const token = this.getToken();
    const isFormData = options.body instanceof FormData;
    const headers: Record<string, string> = {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const url = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (response.status === 401) {
        // If unauthenticated, clear token and emit custom event
        this.setToken(null);
        window.dispatchEvent(new Event('auth:unauthorized'));
      }

      const isJson = response.headers.get('content-type')?.includes('application/json');
      const data = isJson ? await response.json() : await response.text();

      if (!response.ok) {
        const errorObj = typeof data === 'object' ? data : { message: data || response.statusText };
        throw {
          statusCode: response.status,
          message: errorObj.message || 'حدث خطأ في معالجة الطلب',
          code: errorObj.code,
          error: errorObj.error,
        } as ApiError;
      }

      return data as T;
    } catch (error: any) {
      if (error.statusCode) {
        throw error;
      }
      throw {
        message: 'فشل الاتصال بالخادم، يرجى التأكد من تشغيل الـ Backend والاتصال بالشبكة.',
        statusCode: 500,
      } as ApiError;
    }
  }

  public get<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  public post<T>(endpoint: string, body?: any, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }

  public put<T>(endpoint: string, body?: any, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }

  public patch<T>(endpoint: string, body?: any, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }

  public delete<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }

  public upload<T>(endpoint: string, formData: FormData): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: formData,
    });
  }
}

export const apiClient = new ApiClient();
