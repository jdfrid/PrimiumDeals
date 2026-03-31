/** Same convention as AdminLogin: optional full backend origin (no trailing slash). Required if the UI is hosted separately from the API. */
const API_ORIGIN = (import.meta.env.VITE_API_URL || '').trim().replace(/\/$/, '');
const API_BASE = API_ORIGIN ? `${API_ORIGIN}/api` : '/api';

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
    const method = (options.method || 'GET').toUpperCase();
    /** Render free cold starts often return 502 until Node is up; safe to retry read-only calls. */
    const allowGatewayRetry = method === 'GET' || method === 'HEAD';
    const maxAttempts = allowGatewayRetry ? 3 : 1;

    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (this.getToken()) {
      headers['Authorization'] = `Bearer ${this.getToken()}`;
    }

    const url = `${API_BASE}${endpoint}`;
    let response;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      if (attempt > 0) {
        await new Promise(r => setTimeout(r, 1300 * attempt));
      }
      try {
        response = await fetch(url, {
          ...options,
          headers
        });
      } catch (netErr) {
        if (!allowGatewayRetry || attempt === maxAttempts - 1) {
          throw netErr;
        }
        continue;
      }

      if (response.status === 401) {
        this.setToken(null);
        window.location.href = '/admin/login';
        throw new Error('Unauthorized');
      }

      const gateway = response.status === 502 || response.status === 503 || response.status === 504;
      if (allowGatewayRetry && gateway && attempt < maxAttempts - 1) {
        continue;
      }
      break;
    }

    const raw = await response.text();
    let data = {};
    if (raw) {
      try {
        data = JSON.parse(raw);
      } catch {
        const st = response.status;
        const snippet = raw.slice(0, 80).replace(/\s+/g, ' ');
        let hint;
        if (st === 502 || st === 503 || st === 504) {
          hint =
            `HTTP ${st}: proxy/gateway could not reach your Node app (Render sleep, crash, deploy, or OOM). Open Render → Logs and Events. ` +
            'If you set VITE_API_URL in build env, it must be this backend’s live URL only — wrong URL also returns gateway HTML.';
        } else if (API_ORIGIN) {
          hint = `HTTP ${st}. Requests go to ${API_BASE}; if that host is wrong or down you get HTML error pages.`;
        } else {
          hint =
            `HTTP ${st}: got HTML instead of JSON (often SPA index.html from CDN, or an error page). ` +
            'If the UI is not served by the same Node service, set VITE_API_URL to your Render backend URL at vite build time, rebuild, redeploy.';
        }
        throw new Error(`Invalid JSON from API — ${hint} Snippet: ${snippet}`);
      }
    }

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

  async getProviders() {
    return this.request('/providers');
  }

  async saveProviders(providers) {
    return this.request('/providers', { method: 'POST', body: JSON.stringify({ providers }) });
  }

  /** Neutral path — some proxies/WAFs block URLs containing "tiktok". */
  async getTikTokSettings() {
    return this.request('/admin/video-studio/settings');
  }

  async saveTikTokSettings(data) {
    return this.request('/admin/video-studio/settings', { method: 'PUT', body: JSON.stringify(data) });
  }

  async getTikTokStatus() {
    return this.request('/admin/video-studio/status');
  }

  async getVideoEngineStatus() {
    return this.request('/admin/video-engine/status');
  }

  async getTikTokJobs(limit = 40) {
    return this.request(`/admin/video-studio/jobs?limit=${limit}`);
  }

  async getTikTokJob(id) {
    return this.request(`/admin/video-studio/jobs/${id}`);
  }

  async runTikTokJob(dealId = null) {
    return this.runVideoEngineJob(dealId);
  }

  /** Short-form MP4 only — does not post to TikTok or any network. */
  async runVideoEngineJob(dealId = null) {
    return this.request('/admin/video-engine/run', {
      method: 'POST',
      body: JSON.stringify({ dealId: dealId != null && dealId !== '' ? dealId : null })
    });
  }

  async retryTikTokJob(jobId) {
    return this.request(`/admin/video-studio/jobs/${jobId}/retry`, { method: 'POST', body: JSON.stringify({}) });
  }

  async downloadTikTokVideo(jobId) {
    const headers = {
      Authorization: `Bearer ${this.getToken()}`
    };
    const res = await fetch(`${API_BASE}/admin/video-studio/jobs/${jobId}/download`, { headers });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Download failed');
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tiktok-job-${jobId}.mp4`;
    a.click();
    URL.revokeObjectURL(url);
  }
}

export default new ApiService();


