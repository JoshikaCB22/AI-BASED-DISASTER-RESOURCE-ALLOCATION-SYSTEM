import axios from 'axios'

const BASE = 'http://localhost:8000'

const api = axios.create({ baseURL: BASE })

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

api.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) {
      localStorage.clear()
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  me: () => api.get('/auth/me'),
}

export const dashAPI = {
  summary: () => api.get('/dashboard/summary'),
  severity: () => api.get('/dashboard/severity-chart'),
  resources: () => api.get('/dashboard/resource-chart'),
  allocation: () => api.get('/dashboard/allocation-chart'),
}

export const disasterAPI = {
  list: (p) => api.get('/disasters/', { params: p }),
  get: (id) => api.get(`/disasters/${id}`),
  create: (d) => api.post('/disasters/', d),
  update: (id, d) => api.put(`/disasters/${id}`, d),
  delete: (id) => api.delete(`/disasters/${id}`),
}

export const areaAPI = {
  list: (p) => api.get('/areas/', { params: p }),
  create: (d) => api.post('/areas/', d),
  update: (id, d) => api.put(`/areas/${id}`, d),
  delete: (id) => api.delete(`/areas/${id}`),
}

export const resourceAPI = {
  list: (p) => api.get('/resources/', { params: p }),
  create: (d) => api.post('/resources/', d),
  update: (id, d) => api.put(`/resources/${id}`, d),
  delete: (id) => api.delete(`/resources/${id}`),
  stock: (id, d) => api.post(`/resources/${id}/stock`, d),
}

export const allocAPI = {
  predictReqs: (did) => api.post(`/allocations/predict-requirements/${did}`),
  optimize: (did) => api.post(`/allocations/optimize/${did}`),
  list: (p) => api.get('/allocations/', { params: p }),
  approve: (id, comments) => api.post(`/allocations/${id}/approve`, { comments }),
  reject: (id, comments) => api.post(`/allocations/${id}/reject`, { comments }),
  dispatch: (id) => api.post(`/allocations/${id}/dispatch`),
  shortages: (did) => api.get(`/allocations/shortages/${did}`),
  simulate: (d) => api.post('/allocations/simulate', d),
}

export const predAPI = {
  severity: (d) => api.post('/predictions/severity', d),
  resources: (d) => api.post('/predictions/resources', d),
}

export const userAPI = {
  list: () => api.get('/users/'),
  create: (d) => api.post('/users/', d),
  update: (id, d) => api.put(`/users/${id}`, d),
  delete: (id) => api.delete(`/users/${id}`),
}

export const auditAPI = {
  list: (limit = 100) => api.get(`/audit/?limit=${limit}`),
}

export const reportAPI = {
  csv: (did) => api.get(`/reports/csv/${did}`, { responseType: 'blob' }),
}

export default api
