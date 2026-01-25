import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

export const submissionApi = {
  // Submit single video
  async submitSingleVideo(data) {
    const response = await api.post('/submissions/single', data);
    return response.data;
  },

  // Get active processing jobs
  async getActiveProcessing() {
    const response = await api.get('/submissions/active');
    return response.data;
  },

  // Get dashboard statistics
  async getDashboardStats() {
    const response = await api.get('/submissions/stats');
    return response.data;
  },

  // Get recent activity
  async getRecentActivity() {
    const response = await api.get('/submissions/activity');
    return response.data;
  },

  // Check integration health
  async checkIntegrationHealth() {
    const response = await api.get('/submissions/health');
    return response.data;
  },

  // Cancel processing
  async cancelProcessing(id) {
    const response = await api.post(`/submissions/${id}/cancel`);
    return response.data;
  },

  // Retry processing
  async retryProcessing(id) {
    const response = await api.post(`/submissions/${id}/retry`);
    return response.data;
  }
};

export const subscriptionApi = {
  // Create channel subscription
  async createSubscription(data) {
    const response = await api.post('/subscriptions', data);
    return response.data;
  }
};

export default submissionApi;