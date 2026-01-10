import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

export const sermonApi = {
  // Submit new sermon for processing
  async submitSermon(formData) {
    const response = await api.post('/sermons', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  // Get all sermons
  async getAllSermons() {
    const response = await api.get('/sermons');
    return response.data;
  },

  // Get specific sermon
  async getSermon(id) {
    const response = await api.get(`/sermons/${id}`);
    return response.data;
  },

  // Download specific file
  getFileDownloadUrl(id, fileType) {
    return `${API_BASE_URL}/sermons/${id}/files/${fileType}`;
  },

  // Download all files as ZIP
  getZipDownloadUrl(id) {
    return `${API_BASE_URL}/sermons/${id}/download`;
  },

  // Delete sermon
  async deleteSermon(id) {
    const response = await api.delete(`/sermons/${id}`);
    return response.data;
  }
};

export default api;
