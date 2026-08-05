import { config } from '../config.js';

const ARGOCD_URL = config.argocd.url;
const ARGOCD_TOKEN = config.argocd.token;

export class ArgoCDError extends Error {
  statusCode: number;
  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

async function argocdRequest(path: string, method = 'GET', body?: any): Promise<any> {
  if (!ARGOCD_URL) {
    throw new ArgoCDError(500, 'ArgoCD URL not configured');
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (ARGOCD_TOKEN) {
    headers['Authorization'] = `Bearer ${ARGOCD_TOKEN}`;
  }

  const options: RequestInit = {
    method,
    headers,
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const res = await fetch(`${ARGOCD_URL}/api/v1${path}`, options);

  if (!res.ok) {
    const text = await res.text().catch(() => 'Unknown error');
    throw new ArgoCDError(res.status, `ArgoCD API error: ${text}`);
  }

  return res.json();
}

export interface ArgoCDApplication {
  name: string;
  namespace: string;
  project: string;
  status: {
    sync: {
      status: string;
      comparedTo?: any;
    };
    health: {
      status: string;
    };
  };
  spec: {
    source: {
      repoURL: string;
      path: string;
      targetRevision: string;
    };
    destination: {
      server: string;
      namespace: string;
    };
    syncPolicy?: any;
  };
}

export interface ArgoCDProject {
  name: string;
  namespace: string;
  description: string;
  sourceRepos: string[];
  destinations: { server: string; namespace: string }[];
}

// Application management
export async function listApplications(project?: string): Promise<ArgoCDApplication[]> {
  const query = project ? `?project=${project}` : '';
  const result = await argocdRequest(`/applications${query}`);
  return result.items || [];
}

export async function getApplication(name: string): Promise<ArgoCDApplication> {
  return argocdRequest(`/applications/${name}`);
}

export async function createApplication(app: {
  name: string;
  project?: string;
  repoURL: string;
  path: string;
  targetRevision?: string;
  destinationNamespace: string;
  syncPolicy?: any;
}): Promise<ArgoCDApplication> {
  return argocdRequest('/applications', 'POST', {
    apiVersion: 'argoproj.io/v1alpha1',
    kind: 'Application',
    metadata: {
      name: app.name,
      namespace: 'argocd',
    },
    spec: {
      project: app.project || 'default',
      source: {
        repoURL: app.repoURL,
        path: app.path,
        targetRevision: app.targetRevision || 'HEAD',
      },
      destination: {
        server: 'https://kubernetes.default.svc',
        namespace: app.destinationNamespace,
      },
      syncPolicy: app.syncPolicy || {
        automated: {
          prune: true,
          selfHeal: true,
        },
        syncOptions: ['CreateNamespace=true'],
      },
    },
  });
}

export async function deleteApplication(name: string): Promise<void> {
  await argocdRequest(`/applications/${name}`, 'DELETE');
}

export async function syncApplication(name: string): Promise<any> {
  return argocdRequest(`/applications/${name}/sync`, 'POST', {
    prune: true,
    force: false,
  });
}

export async function getApplicationLogs(name: string, podName?: string): Promise<string> {
  const endpoint = podName
    ? `/applications/${name}/logs/${podName}`
    : `/applications/${name}/logs`;
  return argocdRequest(endpoint);
}

// Project management
export async function listProjects(): Promise<ArgoCDProject[]> {
  const result = await argocdRequest('/projects');
  return result.items || [];
}

export async function getProject(name: string): Promise<ArgoCDProject> {
  return argocdRequest(`/projects/${name}`);
}

export async function createProject(project: {
  name: string;
  description?: string;
  sourceRepos: string[];
  destinations: { server: string; namespace: string }[];
}): Promise<ArgoCDProject> {
  return argocdRequest('/projects', 'POST', {
    project: {
      name: project.name,
      description: project.description || '',
      sourceRepos: project.sourceRepos,
      destinations: project.destinations,
    },
  });
}

export async function deleteProject(name: string): Promise<void> {
  await argocdRequest(`/projects/${name}`, 'DELETE');
}

// Repository management
export async function listRepositories(): Promise<any[]> {
  const result = await argocdRequest('/repositories');
  return result.items || [];
}

export async function addRepository(repo: {
  type: string;
  url: string;
  username?: string;
  password?: string;
  sshPrivateKey?: string;
}): Promise<any> {
  return argocdRequest('/repositories', 'POST', repo);
}

export async function deleteRepository(url: string): Promise<void> {
  await argocdRequest(`/repositories/${encodeURIComponent(url)}`, 'DELETE');
}

// Cluster information
export async function getClusterInfo(): Promise<any> {
  return argocdRequest('/clusters');
}

// Check if ArgoCD is available
export async function isArgoCDAvailable(): Promise<boolean> {
  try {
    await argocdRequest('/info');
    return true;
  } catch {
    return false;
  }
}
