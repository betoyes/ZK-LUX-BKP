// API client for backend requests
import { getCsrfToken } from './csrf';

const API_BASE = '/api';

const UNSAFE_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

class APIClient {
  private async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options?.headers as Record<string, string>),
    };

    const method = (options?.method || 'GET').toUpperCase();
    if (UNSAFE_METHODS.includes(method)) {
      const csrfToken = getCsrfToken();
      if (csrfToken) {
        headers['x-csrf-token'] = csrfToken;
      }
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      const errorObj: any = new Error(error.message || `HTTP ${response.status}`);
      errorObj.needsVerification = error.needsVerification;
      errorObj.email = error.email;
      throw errorObj;
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return null as T;
    }

    return response.json();
  }

  // Auth endpoints
  auth = {
    login: (username: string, password: string) =>
      this.request<{ id: number; username: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      }),
    
    logout: () =>
      this.request<{ message: string }>('/auth/logout', {
        method: 'POST',
      }),
    
    me: () =>
      this.request<{ id: number; username: string } | { message: string }>('/auth/me'),
    
    register: (username: string, password: string) =>
      this.request<{ id: number; username: string }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      }),
    
    changePassword: (currentPassword: string, newPassword: string) =>
      this.request<{ ok: boolean }>('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      }),
  };

  // Products endpoints
  products = {
    getAll: (params?: { category?: string; collection?: string; bestsellers?: boolean; new?: boolean }) => {
      const query = new URLSearchParams();
      if (params?.category) query.set('category', params.category);
      if (params?.collection) query.set('collection', params.collection);
      if (params?.bestsellers) query.set('bestsellers', 'true');
      if (params?.new) query.set('new', 'true');
      
      const queryString = query.toString();
      return this.request<any[]>(`/products${queryString ? `?${queryString}` : ''}`);
    },
    
    getById: (id: number) =>
      this.request<any>(`/products/${id}`),
    
    create: (data: any) =>
      this.request<any>('/products', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    
    update: (id: number, data: any) =>
      this.request<any>(`/products/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    
    delete: (id: number) =>
      this.request<void>(`/products/${id}`, {
        method: 'DELETE',
      }),
  };

  // Categories endpoints
  categories = {
    getAll: () => this.request<any[]>('/categories'),
    
    getBySlug: (slug: string) =>
      this.request<any>(`/categories/${slug}`),
    
    create: (data: any) =>
      this.request<any>('/categories', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    
    update: (id: number, data: any) =>
      this.request<any>(`/categories/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    
    delete: (id: number) =>
      this.request<void>(`/categories/${id}`, {
        method: 'DELETE',
      }),
  };

  // Collections endpoints
  collections = {
    getAll: () => this.request<any[]>('/collections'),
    
    getBySlug: (slug: string) =>
      this.request<any>(`/collections/${slug}`),
    
    create: (data: any) =>
      this.request<any>('/collections', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    
    update: (id: number, data: any) =>
      this.request<any>(`/collections/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    
    delete: (id: number) =>
      this.request<void>(`/collections/${id}`, {
        method: 'DELETE',
      }),
  };

  // Journal endpoints
  journal = {
    getAll: () => this.request<any[]>('/journal'),
    
    getById: (id: number) =>
      this.request<any>(`/journal/${id}`),
    
    create: (data: any) =>
      this.request<any>('/journal', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    
    update: (id: number, data: any) =>
      this.request<any>(`/journal/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    
    delete: (id: number) =>
      this.request<void>(`/journal/${id}`, {
        method: 'DELETE',
      }),
  };

  // Subscribers endpoints
  subscribers = {
    getAll: () => this.request<any[]>('/subscribers'),
    
    create: (data: { email: string; date: string; status: string }) =>
      this.request<any>('/subscribers', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    
    update: (id: number, data: any) =>
      this.request<any>(`/subscribers/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    
    delete: (id: number) =>
      this.request<void>(`/subscribers/${id}`, {
        method: 'DELETE',
      }),
  };

  // Customers endpoints
  customers = {
    getAll: () => this.request<any[]>('/customers'),
    
    create: (data: any) =>
      this.request<any>('/customers', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    
    update: (id: number, data: any) =>
      this.request<any>(`/customers/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    
    delete: (id: number) =>
      this.request<void>(`/customers/${id}`, {
        method: 'DELETE',
      }),
  };

  // Orders endpoints
  orders = {
    getAll: () => this.request<any[]>('/orders'),
    
    create: (data: any) =>
      this.request<any>('/orders', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    
    update: (id: number, data: any) =>
      this.request<any>(`/orders/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    
    delete: (id: number) =>
      this.request<void>(`/orders/${id}`, {
        method: 'DELETE',
      }),
  };

  // Branding endpoints
  branding = {
    get: () => this.request<any>('/branding'),
    
    createOrUpdate: (data: any) =>
      this.request<any>('/branding', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  };
}

export const api = new APIClient();
