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

  private async request(path: string, options: RequestInit = {}, timeoutMs = 8000) {
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string> || {}),
    };
    if (options.body) {
      headers['Content-Type'] = 'application/json';
    }
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(`${API_BASE}${path}`, { ...options, headers, signal: controller.signal });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      return res.json();
    } finally {
      clearTimeout(timer);
    }
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

  sendOtp(email: string, purpose: 'signup' | 'reset') {
    return this.request('/auth/send-otp', {
      method: 'POST',
      body: JSON.stringify({ email, purpose }),
    });
  }

  verifyOtp(email: string, code: string, purpose: 'signup' | 'reset') {
    return this.request('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ email, code, purpose }),
    });
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

  planCheckout(plan: string, billing: string = 'twoYear') {
    return this.request('/plan/checkout', {
      method: 'POST',
      body: JSON.stringify({ plan, billing }),
    });
  }

  activatePayg() {
    return this.request('/plan/activate-payg', {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }

  adminActivatePlan(plan: string, billing: string = 'monthly') {
    return this.request('/plan/admin-activate', {
      method: 'POST',
      body: JSON.stringify({ plan, billing }),
    });
  }

  getPlanCallbackUrl() {
    return `${API_BASE}/plan/razorpay-callback`;
  }

  getPlanCancelUrl() {
    return `${API_BASE}/plan/razorpay-cancel`;
  }

  // Upload ZIP deployment
  uploadZip(projectId: string, opts: { name: string; port: number; file: File }) {
    const formData = new FormData();
    formData.append('file', opts.file);
    formData.append('name', opts.name);
    formData.append('port', String(opts.port));

    return fetch(`${API_BASE}/api/projects/${projectId}/apps/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.getToken()}`,
      },
      body: formData,
    }).then(async (r) => {
      if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        throw new Error(body.error || body.message || `HTTP ${r.status}`);
      }
      return r.json();
    });
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
    }, 30000);
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
    }, 30000);
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
    }, 30000);
  }

  getDatabaseVariables(namespace: string, type: string, name: string) {
    return this.request(`/databases/${namespace}/${type}/${name}/variables`);
  }

  getDatabaseHealth(namespace: string, type: string, name: string) {
    return this.request(`/databases/${namespace}/${type}/${name}/health`);
  }

  browseDatabase(namespace: string, type: string, name: string, table?: string, limit?: number) {
    const params = new URLSearchParams();
    if (table) params.set('table', table);
    if (limit) params.set('limit', String(limit));
    const qs = params.toString() ? `?${params}` : '';
    return this.request(`/databases/${namespace}/${type}/${name}/browse${qs}`);
  }

  deleteDatabaseRow(namespace: string, type: string, name: string, table: string, id: string, idColumn?: string) {
    const params = new URLSearchParams({ table, id });
    if (idColumn) params.set('idColumn', idColumn);
    return this.request(`/databases/${namespace}/${type}/${name}/row?${params}`, { method: 'DELETE' });
  }

  migrateDatabase(namespace: string, type: string, name: string, sourceUri: string) {
    return this.request(`/databases/${namespace}/${type}/${name}/migrate`, {
      method: 'POST',
      body: JSON.stringify({ sourceUri }),
    }, 600000);
  }

  // === DATABASE BACKUP/IMPORT ===

  backupDatabase(namespace: string, type: string, name: string) {
    return fetch(`${API_BASE}/api/databases/${namespace}/${type}/${name}/backup`, {
      headers: { 'Authorization': `Bearer ${this.getToken()}` },
    }).then(async (r) => {
      if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error || 'Backup failed'); }
      return r;
    });
  }

  importDatabase(namespace: string, type: string, name: string, file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return fetch(`${API_BASE}/api/databases/${namespace}/${type}/${name}/import`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${this.getToken()}` },
      body: formData,
    }).then(async (r) => {
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Import failed');
      return data;
    });
  }

  // === EMAIL (Session-based, no auth required) ===

  private emailToken: string | null = null;

  setEmailToken(token: string) {
    this.emailToken = token;
    if (typeof window !== 'undefined') localStorage.setItem('email_token', token);
  }

  getEmailToken(): string | null {
    if (!this.emailToken) {
      this.emailToken = typeof window !== 'undefined' ? localStorage.getItem('email_token') : null;
    }
    return this.emailToken;
  }

  clearEmailToken() {
    this.emailToken = null;
    if (typeof window !== 'undefined') localStorage.removeItem('email_token');
  }

  private emailRequest(path: string, options: RequestInit = {}) {
    const token = this.getEmailToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };
    if (token) headers['X-Email-Token'] = token;
    return fetch(`${API_BASE}${path}`, { ...options, headers }).then(async (r) => {
      if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error || 'Request failed'); }
      return r.json();
    });
  }

  createEmailSession(config: { email: string; password: string; host?: string; port?: number; secure?: boolean; fromName?: string }) {
    return fetch(`${API_BASE}/api/email/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    }).then(async (r) => {
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Failed to create session');
      if (data.token) this.setEmailToken(data.token);
      return data;
    });
  }

  checkEmailSession() {
    return this.emailRequest('/api/email/session');
  }

  deleteEmailSession() {
    return this.emailRequest('/api/email/session', { method: 'DELETE' }).then((r) => {
      this.clearEmailToken();
      return r;
    });
  }

  sendEmail(to: string, subject: string, body: string, html?: string, cc?: string, bcc?: string, attachments?: { id: string; name: string; mimeType: string }[]) {
    return this.emailRequest('/api/email/send', {
      method: 'POST',
      body: JSON.stringify({ to, subject, body, html, cc, bcc, attachments }),
    });
  }

  listInbox() {
    return this.emailRequest('/api/email/inbox');
  }

  listSent() {
    return this.emailRequest('/api/email/sent');
  }

  getEmailMessage(id: string) {
    return this.emailRequest(`/api/email/messages/${id}`);
  }

  deleteEmailMessage(id: string) {
    return this.emailRequest(`/api/email/messages/${id}`, { method: 'DELETE' });
  }

  // === EMAIL ACCOUNTS ===

  getEmailAccounts() {
    return this.emailRequest('/api/email/accounts');
  }

  getEmailAccount(id: string) {
    return this.emailRequest(`/api/email/accounts/${id}`);
  }

  createEmailAccount(account: { email: string; provider: string; imapHost: string; imapPort: number; smtpHost: string; smtpPort: number; username?: string; password: string; fromName?: string }) {
    return this.emailRequest('/api/email/accounts', {
      method: 'POST',
      body: JSON.stringify(account),
    });
  }

  updateEmailAccount(id: string, data: Record<string, any>) {
    return this.emailRequest(`/api/email/accounts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  deleteEmailAccount(id: string) {
    return this.emailRequest(`/api/email/accounts/${id}`, { method: 'DELETE' });
  }

  // === EMAIL ATTACHMENTS ===

  async uploadEmailAttachment(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    const token = this.getEmailToken();
    const headers: Record<string, string> = {};
    if (token) headers['X-Email-Token'] = token;
    const r = await fetch(`${API_BASE}/api/email/attachments`, {
      method: 'POST',
      headers,
      body: formData,
    });
    if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error || 'Upload failed'); }
    return r.json();
  }

  downloadEmailAttachment(id: string) {
    const token = this.getEmailToken();
    const headers: Record<string, string> = {};
    if (token) headers['X-Email-Token'] = token;
    return fetch(`${API_BASE}/api/email/attachments/${id}`, { headers });
  }

  deleteEmailAttachment(id: string) {
    return this.emailRequest(`/api/email/attachments/${id}`, { method: 'DELETE' });
  }

  // === EMAIL TEMPLATES ===

  getEmailTemplates() {
    return this.emailRequest('/api/email/templates');
  }

  createEmailTemplate(template: { name: string; subject: string; body: string; html?: string }) {
    return this.emailRequest('/api/email/templates', {
      method: 'POST',
      body: JSON.stringify(template),
    });
  }

  updateEmailTemplate(id: string, data: Record<string, any>) {
    return this.emailRequest(`/api/email/templates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  deleteEmailTemplate(id: string) {
    return this.emailRequest(`/api/email/templates/${id}`, { method: 'DELETE' });
  }

  sendEmailWithTemplate(to: string, templateId: string, variables?: Record<string, string>) {
    return this.emailRequest('/api/email/send/template', {
      method: 'POST',
      body: JSON.stringify({ to, templateId, variables }),
    });
  }

  // === EMAIL HOSTING PURCHASE ===

  emailHostCheckout(plan: string, billing: string) {
    return this.emailRequest('/api/email/hosting/checkout', {
      method: 'POST',
      body: JSON.stringify({ plan, billing }),
    });
  }

  verifyEmailHostPayment(data: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string; plan: string; billing: string }) {
    return this.emailRequest('/api/email/hosting/verify', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  getEmailHostPlans() {
    return this.emailRequest('/api/email/hosting/plans');
  }

  // === GITHUB DEPLOY ===

  deployFromGitHub(projectId: string, input: { name: string; repoURL: string; branch?: string; buildCommand?: string; startCommand?: string; port: number; env?: Record<string, string> }) {
    return this.request(`/projects/${projectId}/apps/deploy-github`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  getAppVariables(projectId: string, name: string) {
    return this.request(`/projects/${projectId}/apps/${name}/variables`);
  }

  // === ENVIRONMENT VARIABLES (CRUD) ===

  setAppVariables(projectId: string, name: string, variables: Record<string, string>) {
    return this.request(`/projects/${projectId}/apps/${name}/variables`, {
      method: 'PUT',
      body: JSON.stringify({ variables }),
    });
  }

  setAppVariable(projectId: string, name: string, key: string, value: string) {
    return this.request(`/projects/${projectId}/apps/${name}/variables`, {
      method: 'PATCH',
      body: JSON.stringify({ key, value }),
    });
  }

  deleteAppVariable(projectId: string, name: string, key: string) {
    return this.request(`/projects/${projectId}/apps/${name}/variables/${encodeURIComponent(key)}`, {
      method: 'DELETE',
    });
  }

  // === BUILD PIPELINE ===

  triggerBuild(projectId: string, appName: string, input: {
    repoURL: string; branch?: string; buildCommand?: string;
    startCommand?: string; port: number; env?: Record<string, string>;
  }) {
    return this.request(`/projects/${projectId}/apps/${appName}/builds`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  getBuildStatus(projectId: string, appName: string, buildId: string) {
    return this.request(`/projects/${projectId}/apps/${appName}/builds/${buildId}`);
  }

  getBuildLogs(projectId: string, appName: string, buildId: string) {
    return this.request(`/projects/${projectId}/apps/${appName}/builds/${buildId}/logs`);
  }

  listBuilds(projectId: string, appName: string) {
    return this.request(`/projects/${projectId}/apps/${appName}/builds`);
  }

  cancelBuild(projectId: string, appName: string, buildId: string) {
    return this.request(`/projects/${projectId}/apps/${appName}/builds/${buildId}/cancel`, {
      method: 'POST',
    });
  }

  // === CUSTOM DOMAINS ===

  listDomains(projectId: string, appName: string) {
    return this.request(`/projects/${projectId}/apps/${appName}/domains`);
  }

  addDomain(projectId: string, appName: string, domain: string, port?: number) {
    return this.request(`/projects/${projectId}/apps/${appName}/domains`, {
      method: 'POST',
      body: JSON.stringify({ domain, port }),
    });
  }

  verifyDomain(projectId: string, appName: string, domain: string) {
    return this.request(`/projects/${projectId}/apps/${appName}/domains/${domain}/verify`, {
      method: 'POST',
    });
  }

  deleteDomain(projectId: string, appName: string, domain: string) {
    return this.request(`/projects/${projectId}/apps/${appName}/domains/${domain}`, {
      method: 'DELETE',
    });
  }

  getDomainSslStatus(projectId: string, appName: string, domain: string) {
    return this.request(`/projects/${projectId}/apps/${appName}/domains/${domain}/ssl`);
  }

  // === AUDIT LOGS ===

  listAuditLogs(params?: { userId?: string; action?: string; resource?: string; limit?: number; offset?: number }) {
    const qs = new URLSearchParams();
    if (params?.userId) qs.append('userId', params.userId);
    if (params?.action) qs.append('action', params.action);
    if (params?.resource) qs.append('resource', params.resource);
    if (params?.limit) qs.append('limit', String(params.limit));
    if (params?.offset) qs.append('offset', String(params.offset));
    const q = qs.toString() ? `?${qs.toString()}` : '';
    return this.request(`/audit-logs${q}`);
  }

  getMyAuditLogs(params?: { action?: string; resource?: string; limit?: number }) {
    const qs = new URLSearchParams();
    if (params?.action) qs.append('action', params.action);
    if (params?.resource) qs.append('resource', params.resource);
    if (params?.limit) qs.append('limit', String(params.limit));
    const q = qs.toString() ? `?${qs.toString()}` : '';
    return this.request(`/audit-logs/mine${q}`);
  }

  getAuditLogStats() {
    return this.request('/audit-logs/stats');
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
