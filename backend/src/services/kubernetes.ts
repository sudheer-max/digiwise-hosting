import * as k8s from '@kubernetes/client-node';

const kc = new k8s.KubeConfig();

try {
  kc.loadFromCluster();
} catch {
  try {
    kc.loadFromDefault();
  } catch {
    console.warn('⚠️  Could not load Kubernetes config. K8s features will be unavailable.');
  }
}

const coreApi = kc.makeApiClient(k8s.CoreV1Api);
const appsApi = kc.makeApiClient(k8s.AppsV1Api);

export interface DeploymentInfo {
  name: string;
  namespace: string;
  status: string;
  replicas: number;
  readyReplicas: number;
  image: string;
  createdAt?: string | Date;
}

export interface ServiceInfo {
  name: string;
  namespace: string;
  status: string;
  type: string;
  clusterIP: string;
  ports: { port: number; targetPort: number; protocol: string }[];
  createdAt?: string | Date;
}

export interface PodInfo {
  name: string;
  namespace: string;
  status: string;
  phase: string;
  restartCount: number;
  nodeName?: string;
  createdAt?: string | Date;
}

export interface NamespaceInfo {
  name: string;
  namespace: string;
  status: string;
  labels: Record<string, string>;
  createdAt?: string | Date;
}

export async function createNamespace(name: string, labels?: Record<string, string>): Promise<NamespaceInfo> {
  const sanitizeLabel = (v: string) => v.replace(/[^a-zA-Z0-9._-]/g, '-').replace(/^-+|-+$/g, '').slice(0, 63);
  const sanitizedLabels: Record<string, string> = {};
  if (labels) {
    for (const [k, v] of Object.entries(labels)) {
      sanitizedLabels[sanitizeLabel(k)] = sanitizeLabel(v);
    }
  }
  const result = await coreApi.createNamespace({
    body: {
      metadata: {
        name,
        labels: {
          ...sanitizedLabels,
          'managed-by': 'digiwise-hosting',
        },
      },
    },
  });
  return {
    name: result.metadata?.name || name,
    namespace: name,
    status: 'Active',
    labels: (result.metadata?.labels || {}) as Record<string, string>,
    createdAt: result.metadata?.creationTimestamp,
  };
}

export async function deleteNamespace(name: string): Promise<void> {
  await coreApi.deleteNamespace({ name });
}

export async function listNamespaces(): Promise<NamespaceInfo[]> {
  const result = await coreApi.listNamespace();
  return (result.items || [])
    .filter((ns) => ns.metadata?.labels?.['managed-by'] === 'digiwise-hosting')
    .map((ns) => ({
      name: ns.metadata?.name || '',
      namespace: ns.metadata?.name || '',
      status: (ns.status?.phase as string) || 'Unknown',
      labels: (ns.metadata?.labels || {}) as Record<string, string>,
      createdAt: ns.metadata?.creationTimestamp,
    }));
}

export async function getNamespace(name: string): Promise<NamespaceInfo | null> {
  try {
    const result = await coreApi.readNamespace({ name });
    return {
      name: result.metadata?.name || name,
      namespace: name,
      status: (result.status?.phase as string) || 'Unknown',
      labels: (result.metadata?.labels || {}) as Record<string, string>,
      createdAt: result.metadata?.creationTimestamp,
    };
  } catch {
    return null;
  }
}

export async function createDeployment(
  namespace: string,
  name: string,
  image: string,
  port: number,
  env?: Record<string, string>,
  replicas = 1
): Promise<DeploymentInfo> {
  const result = await appsApi.createNamespacedDeployment({
    namespace,
    body: {
      metadata: {
        name,
        namespace,
        labels: { app: name, 'managed-by': 'digiwise-hosting' },
      },
      spec: {
        replicas,
        selector: { matchLabels: { app: name } },
        template: {
          metadata: { labels: { app: name } },
          spec: {
            containers: [
              {
                name,
                image,
                ports: [{ containerPort: port }],
                env: env
                  ? Object.entries(env).map(([key, value]) => ({ name: key, value }))
                  : [],
                resources: {
                  requests: { memory: '128Mi', cpu: '100m' },
                  limits: { memory: '256Mi', cpu: '200m' },
                },
              },
            ],
          },
        },
      },
    },
  });
  return {
    name: result.metadata?.name || name,
    namespace,
    status: 'Created',
    replicas: result.spec?.replicas || 1,
    readyReplicas: 0,
    image,
    createdAt: result.metadata?.creationTimestamp,
  };
}

export async function listDeployments(namespace: string): Promise<DeploymentInfo[]> {
  const result = await appsApi.listNamespacedDeployment({ namespace });
  return (result.items || []).map((dep) => ({
    name: dep.metadata?.name || '',
    namespace,
    status: dep.status?.readyReplicas === dep.spec?.replicas ? 'Running' : 'Pending',
    replicas: dep.spec?.replicas || 0,
    readyReplicas: dep.status?.readyReplicas || 0,
    image: dep.spec?.template?.spec?.containers?.[0]?.image || '',
    createdAt: dep.metadata?.creationTimestamp,
  }));
}

export async function deleteDeployment(namespace: string, name: string): Promise<void> {
  await appsApi.deleteNamespacedDeployment({ name, namespace });
}

export async function scaleDeployment(namespace: string, name: string, replicas: number): Promise<void> {
  const patch = [{ op: 'replace', path: '/spec/replicas', value: replicas }];
  await appsApi.patchNamespacedDeployment({
    name,
    namespace,
    body: patch,
  });
}

export async function createService(
  namespace: string,
  name: string,
  port: number,
  targetPort: number,
  type: 'ClusterIP' | 'NodePort' | 'LoadBalancer' = 'ClusterIP'
): Promise<ServiceInfo> {
  const result = await coreApi.createNamespacedService({
    namespace,
    body: {
      metadata: {
        name,
        namespace,
        labels: { app: name, 'managed-by': 'digiwise-hosting' },
      },
      spec: {
        selector: { app: name },
        ports: [{ port, targetPort, protocol: 'TCP' }],
        type,
      },
    },
  });
  return {
    name: result.metadata?.name || name,
    namespace,
    status: 'Active',
    type: (result.spec?.type as string) || 'ClusterIP',
    clusterIP: result.spec?.clusterIP || '',
    ports: (result.spec?.ports || []).map((p) => ({
      port: p.port || 0,
      targetPort: (p.targetPort as number) || 0,
      protocol: p.protocol || 'TCP',
    })),
    createdAt: result.metadata?.creationTimestamp,
  };
}

export async function listServices(namespace: string): Promise<ServiceInfo[]> {
  const result = await coreApi.listNamespacedService({ namespace });
  return (result.items || []).map((svc) => ({
    name: svc.metadata?.name || '',
    namespace,
    status: 'Active',
    type: (svc.spec?.type as string) || 'ClusterIP',
    clusterIP: svc.spec?.clusterIP || '',
    ports: (svc.spec?.ports || []).map((p) => ({
      port: p.port || 0,
      targetPort: (p.targetPort as number) || 0,
      protocol: p.protocol || 'TCP',
    })),
    createdAt: svc.metadata?.creationTimestamp,
  }));
}

export async function deleteService(namespace: string, name: string): Promise<void> {
  await coreApi.deleteNamespacedService({ name, namespace });
}

export async function listPods(namespace: string): Promise<PodInfo[]> {
  const result = await coreApi.listNamespacedPod({ namespace });
  return (result.items || []).map((pod) => ({
    name: pod.metadata?.name || '',
    namespace,
    status: (pod.status?.phase as string) || 'Unknown',
    phase: (pod.status?.phase as string) || 'Unknown',
    restartCount: pod.status?.containerStatuses?.[0]?.restartCount || 0,
    nodeName: pod.spec?.nodeName,
    createdAt: pod.metadata?.creationTimestamp,
  }));
}

export async function getPodLogs(namespace: string, name: string, lines = 100): Promise<string> {
  try {
    const result = await coreApi.readNamespacedPodLog({ name, namespace, tailLines: lines });
    return result as unknown as string;
  } catch {
    return 'Unable to fetch logs';
  }
}

export async function createResourceQuota(
  namespace: string,
  name: string,
  limits: { cpu?: string; memory?: string; pods?: string }
): Promise<void> {
  await coreApi.createNamespacedResourceQuota({
    namespace,
    body: {
      metadata: { name, namespace },
      spec: {
        hard: {
          ...(limits.cpu && { 'limits.cpu': limits.cpu }),
          ...(limits.memory && { 'limits.memory': limits.memory }),
          ...(limits.pods && { pods: limits.pods }),
        },
      },
    },
  });
}

export async function createLimitRange(
  namespace: string,
  name: string,
  defaults: { cpu?: string; memory?: string }
): Promise<void> {
  await coreApi.createNamespacedLimitRange({
    namespace,
    body: {
      metadata: { name, namespace },
      spec: {
        limits: [
          {
            type: 'Container',
            _default: {
              ...(defaults.cpu && { cpu: defaults.cpu }),
              ...(defaults.memory && { memory: defaults.memory }),
            },
            defaultRequest: {
              ...(defaults.cpu && { cpu: defaults.cpu }),
              ...(defaults.memory && { memory: defaults.memory }),
            },
          },
        ],
      },
    },
  });
}

export async function isKubernetesAvailable(): Promise<boolean> {
  try {
    await coreApi.listNamespace();
    return true;
  } catch {
    return false;
  }
}

export const k8sCoreApi = coreApi;
export const k8sAppsApi = appsApi;
export const k8sCustomApi = kc.makeApiClient(k8s.CustomObjectsApi);

// Create Traefik IngressRoute for external access
export async function createIngressRoute(
  namespace: string,
  name: string,
  host: string,
  servicePort: number,
  tlsSecretName?: string
): Promise<void> {
  const ingressRoute = {
    apiVersion: 'traefik.io/v1alpha1',
    kind: 'IngressRoute',
    metadata: {
      name: `${name}-ingress`,
      namespace,
      labels: { app: name, 'managed-by': 'digiwise-hosting' },
    },
    spec: {
      entryPoints: ['websecure'],
      routes: [
        {
          match: `Host(\`${host}\`)`,
          kind: 'Rule',
          services: [
            {
              name: name,
              port: servicePort,
            },
          ],
        },
      ],
      tls: tlsSecretName ? { secretName: tlsSecretName } : undefined,
    },
  };

  try {
    // Try to create, if exists update
    await k8sCustomApi.createNamespacedCustomObject({
      group: 'traefik.io',
      version: 'v1alpha1',
      namespace,
      plural: 'ingressroutes',
      body: ingressRoute,
    });
  } catch (err: any) {
    if (err?.body?.reason === 'AlreadyExists') {
      await k8sCustomApi.replaceNamespacedCustomObject({
        group: 'traefik.io',
        version: 'v1alpha1',
        namespace,
        plural: 'ingressroutes',
        name: `${name}-ingress`,
        body: ingressRoute,
      });
    } else {
      throw err;
    }
  }
}

// Delete Traefik IngressRoute
export async function deleteIngressRoute(namespace: string, name: string): Promise<void> {
  try {
    await k8sCustomApi.deleteNamespacedCustomObject({
      group: 'traefik.io',
      version: 'v1alpha1',
      namespace,
      plural: 'ingressroutes',
      name: `${name}-ingress`,
    });
  } catch { /* ignore if not found */ }
}


