import axios from 'axios';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach Authorization headers
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: async (email, password) => {
    // FastAPI OAuth2PasswordRequestForm expects form-urlencoded data
    const params = new URLSearchParams();
    params.append('username', email);
    params.append('password', password);
    
    const response = await axios.post('http://localhost:8000/api/auth/login', params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    return response.data;
  },
  register: async (userData) => {
    const response = await API.post('/api/auth/register', userData);
    return response.data;
  },
  me: async () => {
    const response = await API.get('/api/auth/me');
    return response.data;
  },
};

export default API;
