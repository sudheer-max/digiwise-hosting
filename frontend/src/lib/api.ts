const API_BASE = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_URL) || process.env.NEXT_PUBLIC_API_URL || '/api';

class ApiClient {
  private token: string | null = null;

  constructor() {
    if (typeof localStorage !== 'undefined') {
      this.token = localStorage.getItem('digiwise_token');
    }
  }

  setToken(token: string | null) {
    this.token = token;
    if (typeof localStorage === 'undefined') return;
    if (token) {
      localStorage.setItem('digiwise_token', token);
    } else {
      localStorage.removeItem('digiwise_token');
    }
  }

  getToken() {
    return this.token;
  }

  private async request(path: string, options: RequestInit = {}) {
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string> || {}),
    };
    if (options.body) {
      headers['Content-Type'] = 'application/json';
    }
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json();
  }

  // Auth
  login(email: string, password: string) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  register(email: string, password: string, name?: string) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
  }

  githubAuth(code: string) {
    return this.request('/auth/github', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  }

  getMe() {
    return this.request('/auth/me');
  }

  // Payment / checkout
  checkoutDomains(items: { name: string; price: number; type: string }[], customer: any, countryCode = 'US', provider: 'razorpay' = 'razorpay') {
    return this.request('/domains/checkout', {
      method: 'POST',
      body: JSON.stringify({ items, customer, countryCode, provider }),
    });
  }

  getCurrencies() {
    return this.request('/domains/currencies');
  }

  getCallbackUrl() {
    return `${API_BASE}/checkout/razorpay-callback`;
  }

  getCancelUrl() {
    return `${API_BASE}/checkout/razorpay-cancel`;
  }

  sendConfirmation(data: { planName: string; orderId: string; clientName?: string; email?: string }) {
    return this.request('/checkout/send-confirmation', { method: 'POST', body: JSON.stringify(data) });
  }

  getPaymentConfig() {
    return this.request('/config/payments');
  }

  // Plan / usage
  getPlan() {
    return this.request('/plan');
  }

  planCheckout(plan: string) {
    return this.request('/plan/checkout', {
      method: 'POST',
      body: JSON.stringify({ plan }),
    });
  }

  activatePayg() {
    return this.request('/plan/activate-payg', {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }

  getPlanCallbackUrl() {
    return `${API_BASE}/plan/razorpay-callback`;
  }

  getPlanCancelUrl() {
    return `${API_BASE}/plan/razorpay-cancel`;
  }

  // Admin
  getAdminStats() {
    return this.request('/admin/stats');
  }

  getAdminUsers() {
    return this.request('/admin/users');
  }

  getAdminProjects() {
    return this.request('/admin/projects');
  }

  getAdminHealth() {
    return this.request('/admin/health');
  }

  getAdminCluster() {
    return this.request('/admin/cluster');
  }

  getAdminClusterPods() {
    return this.request('/admin/cluster/pods');
  }

  // Geo / Country detection
  getCountry() {
    return this.request('/geo/country');
  }

  // Health
  healthCheck() {
    return this.request('/health');
  }

  // === KUBERNETES-NATIVE PROJECTS ===

  listProjects() {
    return this.request('/projects');
  }

  getProject(id: string) {
    return this.request(`/projects/${id}`);
  }

  createProject(input: { name: string; description?: string }) {
    return this.request('/projects', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  updateProject(id: string, input: { name?: string; description?: string }) {
    return this.request(`/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    });
  }

  deleteProject(id: string) {
    return this.request(`/projects/${id}`, {
      method: 'DELETE',
    });
  }

  listProjectDeployments(id: string) {
    return this.request(`/projects/${id}/deployments`);
  }

  listProjectPods(id: string) {
    return this.request(`/projects/${id}/pods`);
  }

  getProjectLogs(id: string, pod?: string, lines?: number) {
    const params = new URLSearchParams();
    if (pod) params.append('pod', pod);
    if (lines) params.append('lines', String(lines));
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/projects/${id}/logs${qs}`);
  }

  deployToProject(id: string, input: { name: string; repoURL: string; path: string; targetRevision?: string }) {
    return this.request(`/projects/${id}/deploy`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  // === KUBERNETES-NATIVE APPLICATIONS ===

  listApps(projectId: string) {
    return this.request(`/projects/${projectId}/apps`);
  }

  getApp(projectId: string, name: string) {
    return this.request(`/projects/${projectId}/apps/${name}`);
  }

  createApp(projectId: string, input: { name: string; image: string; port: number; env?: Record<string, string>; replicas?: number }) {
    return this.request(`/projects/${projectId}/apps`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  updateApp(projectId: string, name: string, input: { image?: string; env?: Record<string, string>; replicas?: number }) {
    return this.request(`/projects/${projectId}/apps/${name}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    });
  }

  deleteApp(projectId: string, name: string) {
    return this.request(`/projects/${projectId}/apps/${name}`, {
      method: 'DELETE',
    });
  }

  scaleApp(projectId: string, name: string, replicas: number) {
    return this.request(`/projects/${projectId}/apps/${name}/scale`, {
      method: 'POST',
      body: JSON.stringify({ replicas }),
    });
  }

  getAppLogs(projectId: string, name: string, lines?: number) {
    const params = new URLSearchParams();
    if (lines) params.append('lines', String(lines));
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/projects/${projectId}/apps/${name}/logs${qs}`);
  }

  restartApp(projectId: string, name: string) {
    return this.request(`/projects/${projectId}/apps/${name}/restart`, {
      method: 'POST',
    });
  }

  // === DATABASES ===

  listDatabaseOperators() {
    return this.request('/databases');
  }

  listDatabases(namespace: string) {
    return this.request(`/databases/${namespace}`);
  }

  createDatabase(input: { type: string; name: string; namespace: string; size?: string }) {
    return this.request('/databases', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  deleteDatabase(namespace: string, type: string, name: string) {
    return this.request(`/databases/${namespace}/${type}/${name}`, {
      method: 'DELETE',
    });
  }

  // === MONITORING (via proxy) ===

  getGrafanaUrl() {
    return 'https://grafana.digiwisesoftech.com';
  }

  getPrometheusUrl() {
    return 'https://prometheus.digiwisesoftech.com';
  }
}

const api = new ApiClient();
export default api;
