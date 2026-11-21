import axios from 'axios';

const api = axios.create({ baseURL: '/api', timeout: 45000 });
api.interceptors.request.use(config => {
  const token = localStorage.getItem('repoverse-token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
export function apiMessage(error, fallback = 'Something went wrong. Please try again.') {
  return error.response?.data?.message || error.message || fallback;
}
export default api;
