import api from './api';

const reportService = {
  getData: (period = 'month', type = 'general') =>
    api.get('/reports/data/', { params: { period, type } }),

  exportPDF: (period = 'month', type = 'general') =>
    api.get('/reports/export/', {
      params: { period, type, fmt: 'pdf' },
      responseType: 'blob',
    }),

  exportExcel: (period = 'month', type = 'general') =>
    api.get('/reports/export/', {
      params: { period, type, fmt: 'excel' },
      responseType: 'blob',
    }),
};

export default reportService;
