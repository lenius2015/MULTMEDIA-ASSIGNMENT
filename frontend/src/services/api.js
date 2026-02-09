/**
 * API Service - Updated with Category APIs
 */

import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          const refreshResponse = await authAPI.refreshToken(refreshToken);
          if (refreshResponse.success) {
            localStorage.setItem('accessToken', refreshResponse.data.accessToken);
            localStorage.setItem('refreshToken', refreshResponse.data.refreshToken);
            originalRequest.headers.Authorization = `Bearer ${refreshResponse.data.accessToken}`;
            return api(originalRequest);
          }
        }
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
      }

      // If refresh fails, clear tokens and redirect
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }

    return Promise.reject(error.response?.data || { success: false, message: error.message });
  }
);

const normalizeProductList = (response) => {
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.products)) return response.products;
  if (Array.isArray(response?.items)) return response.items;
  if (Array.isArray(response)) return response;
  return [];
};

// Auth API
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (email, password) => api.post('/auth/login', { email, password }),
  getCurrentUser: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
  updateProfilePicture: (formData) => api.post('/auth/profile/picture', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  logout: () => api.post('/auth/logout')
};

// Product API
export const productAPI = {
  getAll: async (filters = {}, page = 1, limit = 12) => {
    const response = await api.get('/products', { params: { ...filters, page, limit } });
    return { success: true, data: normalizeProductList(response), pagination: response.pagination };
  },
  getOne: (id) => api.get(`/products/${id}`),
  getByCategory: (category, page = 1) => api.get(`/products/category/${category}`, { params: { page } }),
  getFeatured: async (limit = 8) => {
    const response = await api.get('/products', { params: { limit, sortBy: 'newest' } });
    return { success: true, data: normalizeProductList(response) };
  },
  getNewArrivals: async () => {
    const response = await api.get('/products/filter/new');
    return { success: true, data: normalizeProductList(response) };
  },
  getDiscounted: async () => {
    const response = await api.get('/products/filter/discounted');
    return { success: true, data: normalizeProductList(response) };
  },
  getCategories: () => api.get('/products/categories/list'),
  search: async (query, limit = 6) => {
    const response = await api.get('/products', { params: { search: query, limit } });
    return { success: true, data: normalizeProductList(response) };
  },
  create: (data) => api.post('/products', data),
  update: (id, data) => api.put(`/products/${id}`, data)
};

// Deals API - NEW
export const dealsAPI = {
  getDeals: (params = {}) => api.get('/deals', { params }),
  getActive: () => api.get('/deals/active'),
  getDeal: (slug) => api.get(`/deals/${slug}`),
  getCountdown: (id) => api.get(`/deals/countdown/${id}`),
  validatePurchase: (dealId, productId, quantity) => 
    api.post('/deals/validate-purchase', { dealId, productId, quantity }),
  purchase: (dealId, productId, quantity) =>
    api.post('/deals/purchase', { dealId, productId, quantity }),
  // Admin endpoints
  getAdminDeals: (params = {}) => api.get('/deals/admin/all', { params }),
  createDeal: (data) => api.post('/deals/admin/create', data),
  updateDeal: (id, data) => api.put(`/deals/admin/${id}`, data),
  activateDeal: (id) => api.put(`/deals/admin/${id}/activate`),
  pauseDeal: (id) => api.put(`/deals/admin/${id}/pause`),
  deleteDeal: (id) => api.delete(`/deals/admin/${id}`),
  getDealAnalytics: (id) => api.get(`/deals/admin/analytics/${id}`)
};

// Category API - NEW
export const categoryAPI = {
  getAll: (params = {}) => api.get('/categories', { params }),
  getCategory: (slug) => api.get(`/categories/${slug}`),
  getProducts: (slug, params = {}) => api.get(`/categories/${slug}/products`, { params }),
  getBrands: () => api.get('/categories/brands/list'),
  getBreadcrumb: (categoryId) => api.get(`/categories/breadcrumb/${categoryId}`),
  getTree: () => api.get('/categories/tree/all')
};

// Home API
export const homeAPI = {
  getHome: async () => {
    try {
      const response = await api.get('/home');
      return response;
    } catch (error) {
      return { success: false };
    }
  },
  getFeatured: async (limit = 8) => {
    try {
      const response = await api.get('/home/featured', { params: { limit } });
      return response;
    } catch (error) {
      return { success: false, data: [] };
    }
  },
  getCategories: async () => {
    try {
      const response = await api.get('/home/categories');
      return response;
    } catch (error) {
      return { success: false, data: [] };
    }
  },
  getDeals: async () => {
    try {
      const response = await api.get('/home/deals');
      return response;
    } catch (error) {
      return { success: false, data: [] };
    }
  },
  getPromotions: async () => {
    try {
      const response = await api.get('/home/promotions');
      return response;
    } catch (error) {
      return { success: false, data: [] };
    }
  },
  getAuctions: async () => {
    try {
      const response = await api.get('/home/auctions');
      return response;
    } catch (error) {
      return { success: false, data: [] };
    }
  },
  getHero: async () => {
    try {
      const response = await api.get('/home/hero');
      return response;
    } catch (error) {
      return { success: false, data: null };
    }
  },
  getDealsCountdown: async () => {
    try {
      const response = await api.get('/home/countdown');
      return response;
    } catch (error) {
      return { success: false, data: null };
    }
  },
  search: async (query, limit = 6) => {
    try {
      const response = await api.get('/home/search', { params: { q: query, limit } });
      return response;
    } catch (error) {
      return { success: false, data: [] };
    }
  },
  getStock: async (productId) => {
    try {
      const response = await api.get(`/home/product/${productId}/stock`);
      return response;
    } catch (error) {
      return { success: false, stock: { available: 0, status: 'unknown' } };
    }
  }
};

// Cart API
export const cartAPI = {
  getCart: () => api.get('/cart'),
  addToCart: (productId, quantity = 1) => api.post('/cart/items', { productId, quantity }),
  updateItem: (itemId, quantity) => api.patch(`/cart/items/${itemId}`, { quantity }),
  removeItem: (itemId) => api.delete(`/cart/items/${itemId}`),
  clearCart: () => api.delete('/cart')
};

// Wishlist API
export const wishlistAPI = {
  getWishlist: () => api.get('/wishlist'),
  addToWishlist: (productId) => api.post('/wishlist', { productId }),
  removeFromWishlist: (productId) => api.delete(`/wishlist/${productId}`),
  getCount: () => api.get('/wishlist/count'),
  moveToCart: (productId, quantity = 1) => api.post(`/wishlist/move-to-cart/${productId}`, { quantity })
};

// Order API
export const orderAPI = {
  create: (data) => api.post('/orders', data),
  getOne: (id) => api.get(`/orders/${id}`),
  getAll: (page = 1, limit = 10) => api.get('/orders', { params: { page, limit } }),
  updateStatus: (id, status) => api.patch(`/orders/${id}/status`, { status })
};

// Dashboard API
export const dashboardAPI = {
  getDashboard: () => api.get('/user/dashboard'),
  getProfile: () => api.get('/user/profile'),
  updateProfile: (data) => api.put('/user/profile', data),
  getAddresses: () => api.get('/user/addresses'),
  addAddress: (data) => api.post('/user/addresses', data),
  deleteAddress: (id) => api.delete(`/user/addresses/${id}`)
};

export default api;
