import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

export const searchAPI = {
  search: (niche, city, limit = 20) =>
    api.post('/search', { niche, city, limit }).then(r => r.data),

  enrichOne: (id) =>
    api.post(`/search/enrich/${id}`).then(r => r.data),

  enrichAll: (retryFailed = false) =>
    api.post('/search/enrich-all', { retryFailed }).then(r => r.data),
};

export const leadsAPI = {
  getAll: (filters = {}) =>
    api.get('/leads', { params: filters }).then(r => r.data),

  getStats: () =>
    api.get('/leads/stats').then(r => r.data),

  update: (id, data) =>
    api.patch(`/leads/${id}`, data).then(r => r.data),

  delete: (id) =>
    api.delete(`/leads/${id}`).then(r => r.data),

  clearAll: () =>
    api.delete('/leads').then(r => r.data),

  exportCSV: () =>
    window.open('/api/leads/export.csv', '_blank'),
};

export const emailAPI = {
  generate: (leadId) =>
    api.post(`/email/generate/${leadId}`).then(r => r.data),

  generateBulk: () =>
    api.post('/email/generate-bulk').then(r => r.data),

  send: (leadId, overrides = {}) =>
    api.post(`/email/send/${leadId}`, overrides).then(r => r.data),

  getLogs: () =>
    api.get('/email/logs').then(r => r.data),

  verify: () =>
    api.get('/email/verify').then(r => r.data),
};
