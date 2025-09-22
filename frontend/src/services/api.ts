import axios from 'axios';
import { User, FileNode, Directory, Share, StorageStats, SearchFilters } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth API
export const authAPI = {
  login: async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },

  register: async (username: string, email: string, password: string) => {
    const response = await api.post('/auth/register', { username, email, password });
    return response.data;
  },
};

// Files API
export const filesAPI = {
  uploadFiles: async (files: File[], directory?: string) => {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    if (directory) formData.append('directory', directory);
    
    const response = await api.post('/files', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  getFiles: async (filters: SearchFilters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        params.append(key, value.toString());
      }
    });
    
    const response = await api.get(`/files?${params}`);
    return response.data;
  },

  downloadFile: async (fileId: number) => {
    const response = await api.get(`/files/${fileId}`, {
      responseType: 'blob',
    });
    return response;
  },

  deleteFile: async (fileId: number) => {
    const response = await api.delete(`/files/${fileId}`);
    return response.data;
  },
};

// Directory API
export const directoryAPI = {
  createDirectory: async (path: string, isPublic: boolean = false) => {
    const response = await api.post('/directories', { path, is_public: isPublic });
    return response.data;
  },

  listDirectory: async (path: string = '/') => {
    const response = await api.get(`/directories?path=${encodeURIComponent(path)}`);
    return response.data;
  },
};

// Sharing API
export const sharingAPI = {
  createShare: async (fileId: number, password?: string, expiresIn?: number) => {
    const response = await api.post(`/files/${fileId}/share`, {
      password,
      expires_in: expiresIn,
    });
    return response.data;
  },

  getSharedFile: async (token: string, password?: string) => {
    const params = password ? `?password=${encodeURIComponent(password)}` : '';
    const response = await api.get(`/share/${token}${params}`, {
      responseType: 'blob',
    });
    return response;
  },
};

// Linking API
export const linkingAPI = {
  createHardLink: async (sourcePath: string, destPath: string) => {
    const response = await api.post('/hard-links', {
      source_path: sourcePath,
      dest_path: destPath,
    });
    return response.data;
  },

  createSoftLink: async (sourcePath: string, destPath: string) => {
    const response = await api.post('/soft-links', {
      source_path: sourcePath,
      dest_path: destPath,
    });
    return response.data;
  },
};

// Admin API
export const adminAPI = {
  getUsers: async (): Promise<User[]> => {
    const response = await api.get('/admin/users');
    return response.data;
  },

  updateUserQuota: async (userId: number, quotaMax: number) => {
    const response = await api.put(`/admin/users/${userId}/quota`, { quota_max: quotaMax });
    return response.data;
  },

  getStorageStats: async (): Promise<StorageStats> => {
    const response = await api.get('/admin/stats');
    return response.data;
  },

  getAuditLogs: async () => {
    const response = await api.get('/admin/audit-logs');
    return response.data;
  },
};
