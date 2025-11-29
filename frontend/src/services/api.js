const API_BASE = '/api';

class ApiService {
  constructor() {
    this.token = localStorage.getItem('token');
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }

  getToken() {
    return this.token || localStorage.getItem('token');
  }

  async request(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (this.getToken()) {
      headers['Authorization'] = `Bearer ${this.getToken()}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers
    });

    if (response.status === 401) {
      this.setToken(null);
      window.location.href = '/admin/login';
      throw new Error('Unauthorized');
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Request failed');
    }

    return data;
  }

  async login(email, password) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    this.setToken(data.token);
    return data;
  }

  logout() {
    this.setToken(null);
  }

  async getProfile() {
    return this.request('/auth/profile');
  }

  async getPublicDeals(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/public/deals${query ? `?${query}` : ''}`);
  }

  async getPublicCategories() {
    return this.request('/public/categories');
  }

  async getUsers() {
    return this.request('/users');
  }

  async createUser(data) {
    return this.request('/users', { method: 'POST', body: JSON.stringify(data) });
  }

  async updateUser(id, data) {
    return this.request(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  }

  async deleteUser(id) {
    return this.request(`/users/${id}`, { method: 'DELETE' });
  }

  async getDeals(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/deals${query ? `?${query}` : ''}`);
  }

  async getDeal(id) {
    return this.request(`/deals/${id}`);
  }

  async createDeal(data) {
    return this.request('/deals', { method: 'POST', body: JSON.stringify(data) });
  }

  async updateDeal(id, data) {
    return this.request(`/deals/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  }

  async deleteDeal(id) {
    return this.request(`/deals/${id}`, { method: 'DELETE' });
  }

  async toggleDealActive(id) {
    return this.request(`/deals/${id}/toggle`, { method: 'PATCH' });
  }

  async getCategories() {
    return this.request('/categories');
  }

  async createCategory(data) {
    return this.request('/categories', { method: 'POST', body: JSON.stringify(data) });
  }

  async updateCategory(id, data) {
    return this.request(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  }

  async deleteCategory(id) {
    return this.request(`/categories/${id}`, { method: 'DELETE' });
  }

  async getRules() {
    return this.request('/rules');
  }

  async getRule(id) {
    return this.request(`/rules/${id}`);
  }

  async createRule(data) {
    return this.request('/rules', { method: 'POST', body: JSON.stringify(data) });
  }

  async updateRule(id, data) {
    return this.request(`/rules/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  }

  async deleteRule(id) {
    return this.request(`/rules/${id}`, { method: 'DELETE' });
  }

  async executeRule(id) {
    return this.request(`/rules/${id}/execute`, { method: 'POST' });
  }

  async getRuleLogs(id) {
    return this.request(`/rules/${id}/logs`);
  }

  async getStats() {
    return this.request('/stats');
  }

  async getLogs() {
    return this.request('/logs');
  }
}

export default new ApiService();

