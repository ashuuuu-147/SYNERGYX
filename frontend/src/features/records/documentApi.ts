import { apiClient, ApiError } from '../../lib/apiClient';
import { authStorage } from '../../lib/authStorage';

export interface DocumentItem {
  id: string;
  organization_id: string;
  storage_provider: string;
  storage_path: string;
  original_filename: string;
  mime_type: string;
  size_bytes: number;
  uploaded_by: string | null;
  created_at: string;
  is_linked: boolean;
}

export interface DocumentDownloadInfo {
  download_url: string;
  expires_in_seconds: number;
  original_filename: string;
}

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1').replace(/\/+$/, '');

export const documentApi = {
  getDocuments: async (): Promise<DocumentItem[]> => {
    return apiClient<DocumentItem[]>('/documents', { method: 'GET' });
  },

  getDownloadUrl: async (documentId: string): Promise<DocumentDownloadInfo> => {
    return apiClient<DocumentDownloadInfo>(`/documents/${documentId}/download`, { method: 'GET' });
  },

  deleteDocument: async (documentId: string): Promise<void> => {
    return apiClient<void>(`/documents/${documentId}`, { method: 'DELETE' });
  },

  /**
   * Uploads file using native XMLHttpRequest for authentic progress reporting (Blueprint 13.4).
   */
  uploadDocument: (file: File, onProgress?: (percentage: number) => void): Promise<DocumentItem> => {
    return new Promise((resolve, reject) => {
      const token = authStorage.getToken();
      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      formData.append('file', file);

      xhr.open('POST', `${API_BASE_URL}/documents`);

      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }

      if (xhr.upload && onProgress) {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percentComplete = Math.round((event.loaded / event.total) * 100);
            onProgress(percentComplete);
          }
        };
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText) as DocumentItem;
            resolve(response);
          } catch {
            reject(new ApiError(xhr.status, 'Invalid JSON response from server.'));
          }
        } else {
          try {
            const errData = JSON.parse(xhr.responseText);
            reject(new ApiError(xhr.status, errData.detail || 'Upload failed.', errData.code || 'UPLOAD_FAILED'));
          } catch {
            reject(new ApiError(xhr.status, 'Failed to upload document.', 'UPLOAD_FAILED'));
          }
        }
      };

      xhr.onerror = () => {
        reject(new ApiError(0, 'Network error during upload.', 'NETWORK_ERROR'));
      };

      xhr.send(formData);
    });
  },
};

