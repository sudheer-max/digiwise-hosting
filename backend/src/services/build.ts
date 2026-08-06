import * as k8s from '@kubernetes/client-node';
import { k8sCustomApi, k8sCoreApi } from './kubernetes.js';

const kc = new k8s.KubeConfig();
try {
  kc.loadFromCluster();
} catch {
  try {
    kc.loadFromDefault();
  } catch {
    console.warn('Could not load KubeConfig for build service');
  }
}

const batchApi = kc.makeApiClient(k8s.BatchV1Api);

export interface BuildConfig {
  name: string;
  namespace: string;
  repoURL: string;
  branch: string;
  buildCommand?: string;
  startCommand?: string;
  port: number;
  env?: Record<string, string>;
  dockerfile?: string;
}

export interface BuildStatus {
  name: string;
  namespace: string;
  status: 'pending' | 'running' | 'succeeded' | 'failed';
  message?: string;
  imageTag?: string;
  startTime?: Date;
  endTime?: Date;
  logs?: string;
}

const KANIKO_IMAGE = 'gcr.io/kaniko-project/executor:latest';
const GIT_IMAGE = 'alpine/git:latest';
const HARBOR_REGISTRY = 'harbor.digiwisesoftech.com';
const HARBOR_PROJECT = 'digiwise';

// Create a Kaniko build Job
export async function createBuildJob(config: BuildConfig): Promise<BuildStatus> {
  const buildId = `build-${Date.now()}`;
  const jobName = `${config.name}-${buildId}`;
  const imageTag = `${HARBOR_REGISTRY}/${HARBOR_PROJECT}/${config.name}:${buildId}`;

  // Create a ConfigMap with the build script
  const buildScript = generateBuildScript(config);
  const configMapName = `${jobName}-script`;

  await k8sCoreApi.createNamespacedConfigMap({
    namespace: config.namespace,
    body: {
      metadata: {
        name: configMapName,
        namespace: config.namespace,
        labels: {
          app: config.name,
          'build-id': buildId,
          'managed-by': 'digiwise-hosting',
        },
      },
      data: {
        'build.sh': buildScript,
      },
    },
  });

  // Create Harbor registry secret if it doesn't exist
  const secretName = 'harbor-registry-secret';
  try {
    await k8sCoreApi.readNamespacedSecret({ name: secretName, namespace: config.namespace });
  } catch {
    // Create the secret - in production, use proper credentials
    await k8sCoreApi.createNamespacedSecret({
      namespace: config.namespace,
      body: {
        metadata: {
          name: secretName,
          namespace: config.namespace,
        },
        type: 'kubernetes.io/dockerconfigjson',
        stringData: {
          '.dockerconfigjson': JSON.stringify({
            auths: {
              [HARBOR_REGISTRY]: {
                auth: Buffer.from('admin:Harbor12345').toString('base64'),
              },
            },
          }),
        },
      },
    });
  }

  // Create the Kaniko build Job
  const job = {
    metadata: {
      name: jobName,
      namespace: config.namespace,
      labels: {
        app: config.name,
        'build-id': buildId,
        'managed-by': 'digiwise-hosting',
      },
    },
    spec: {
      backoffLimit: 2,
      activeDeadlineSeconds: 600, // 10 minute timeout
      ttlSecondsAfterFinished: 3600, // Cleanup after 1 hour
      template: {
        metadata: {
          labels: {
            app: config.name,
            'build-id': buildId,
            'managed-by': 'digiwise-hosting',
          },
        },
        spec: {
          serviceAccountName: 'default',
          restartPolicy: 'Never',
          initContainers: [
            {
              name: 'git-clone',
              image: GIT_IMAGE,
              command: ['/bin/sh', '-c'],
              args: [`git clone --depth 1 -b ${config.branch} ${config.repoURL} /workspace/source`],
              volumeMounts: [
                {
                  name: 'workspace',
                  mountPath: '/workspace',
                },
              ],
            },
            {
              name: 'generate-dockerfile',
              image: 'busybox:latest',
              command: ['/bin/sh', '-c'],
              args: [`cat /scripts/build.sh > /workspace/build.sh && chmod +x /workspace/build.sh`],
              volumeMounts: [
                {
                  name: 'workspace',
                  mountPath: '/workspace',
                },
                {
                  name: 'build-script',
                  mountPath: '/scripts',
                },
              ],
            },
          ],
          containers: [
            {
              name: 'kaniko',
              image: KANIKO_IMAGE,
              args: [
                `--dockerfile=/workspace/Dockerfile`,
                `--context=dir:///workspace/source`,
                `--destination=${imageTag}`,
                `--destination=${HARBOR_REGISTRY}/${HARBOR_PROJECT}/${config.name}:latest`,
                '--cache=true',
                '--cache-repo=' + `${HARBOR_REGISTRY}/${HARBOR_PROJECT}/cache`,
                '--snapshot-mode=redo',
                '--skip-tls-verify=false',
              ],
              env: [
                {
                  name: 'DOCKER_CONFIG',
                  value: '/kaniko/.docker',
                },
              ],
              volumeMounts: [
                {
                  name: 'workspace',
                  mountPath: '/workspace',
                },
                {
                  name: 'docker-config',
                  mountPath: '/kaniko/.docker',
                },
              ],
              resources: {
                requests: {
                  memory: '512Mi',
                  cpu: '500m',
                },
                limits: {
                  memory: '2Gi',
                  cpu: '2',
                },
              },
            },
          ],
          volumes: [
            {
              name: 'workspace',
              emptyDir: {},
            },
            {
              name: 'build-script',
              configMap: {
                name: configMapName,
              },
            },
            {
              name: 'docker-config',
              secret: {
                secretName: secretName,
              },
            },
          ],
        },
      },
    },
  };

  await batchApi.createNamespacedJob({
    namespace: config.namespace,
    body: job,
  });

  return {
    name: jobName,
    namespace: config.namespace,
    status: 'pending',
    imageTag,
    startTime: new Date(),
  };
}

// Get build status
export async function getBuildStatus(namespace: string, jobName: string): Promise<BuildStatus> {
  try {
    const job = await batchApi.readNamespacedJob({ name: jobName, namespace });

    const conditions = job.status?.conditions || [];
    const succeededCondition = conditions.find((c: any) => c.type === 'Complete');
    const failedCondition = conditions.find((c: any) => c.type === 'Failed');

    let status: BuildStatus['status'] = 'pending';
    let message = '';

    if (succeededCondition) {
      status = 'succeeded';
      message = succeededCondition.message || 'Build completed successfully';
    } else if (failedCondition) {
      status = 'failed';
      message = failedCondition.message || 'Build failed';
    } else if (job.status?.active) {
      status = 'running';
      message = 'Build is running';
    }

    return {
      name: jobName,
      namespace,
      status,
      message,
      startTime: job.status?.startTime,
      endTime: succeededCondition?.lastTransitionTime || failedCondition?.lastTransitionTime,
    };
  } catch (err: any) {
    return {
      name: jobName,
      namespace,
      status: 'failed',
      message: err.message,
    };
  }
}

// Get build logs
export async function getBuildLogs(namespace: string, jobName: string): Promise<string> {
  try {
    // Find pods belonging to this job
    const pods = await k8sCoreApi.listNamespacedPod({
      namespace,
      labelSelector: `job-name=${jobName}`,
    });

    const pod = pods.items[0];
    if (!pod) {
      return 'No pods found for this build';
    }

    const podName = pod.metadata?.name;
    if (!podName) {
      return 'Pod name not found';
    }

    // Get logs from the kaniko container
    const logs = await k8sCoreApi.readNamespacedPodLog({
      name: podName,
      namespace,
      container: 'kaniko',
      tailLines: 500,
    });

    return logs as unknown as string;
  } catch (err: any) {
    return `Unable to fetch logs: ${err.message}`;
  }
}

// List builds for an application
export async function listBuilds(namespace: string, appName: string): Promise<BuildStatus[]> {
  try {
    const jobs = await batchApi.listNamespacedJob({
      namespace,
      labelSelector: `app=${appName},managed-by=digiwise-hosting`,
    });

    const builds: BuildStatus[] = [];

    for (const job of jobs.items || []) {
      const jobName = job.metadata?.name || '';
      const build = await getBuildStatus(namespace, jobName);
      builds.push(build);
    }

    return builds.sort((a, b) => {
      if (a.startTime && b.startTime) {
        return b.startTime.getTime() - a.startTime.getTime();
      }
      return 0;
    });
  } catch {
    return [];
  }
}

// Delete a build Job
export async function deleteBuildJob(namespace: string, jobName: string): Promise<void> {
  try {
    await batchApi.deleteNamespacedJob({ name: jobName, namespace });
  } catch {
    // Ignore if not found
  }

  // Clean up config map
  try {
    await k8sCoreApi.deleteNamespacedConfigMap({ name: `${jobName}-script`, namespace });
  } catch {
    // Ignore if not found
  }
}

// Generate build script based on detected framework
function generateBuildScript(config: BuildConfig): string {
  const repoDir = '/workspace/source';

  return `#!/bin/sh
set -e

cd ${repoDir}

# Detect framework and generate Dockerfile
if [ -f "package.json" ]; then
  # Node.js project
  if grep -q '"next"' package.json; then
    # Next.js
    cat > Dockerfile << 'DOCKERFILE'
FROM node:22-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
EXPOSE ${config.port}
CMD ["npx", "next", "start", "-p", "${config.port}"]
DOCKERFILE
  elif grep -q '"vite"' package.json; then
    # Vite/React/Vue
    cat > Dockerfile << 'DOCKERFILE'
FROM node:22-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-slim
WORKDIR /app
RUN npm install -g serve
COPY --from=builder /app/dist ./dist
EXPOSE ${config.port}
CMD ["serve", "-s", "dist", "-l", "${config.port}"]
DOCKERFILE
  else
    # Generic Node.js
    cat > Dockerfile << 'DOCKERFILE'
FROM node:22-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
${config.buildCommand ? `RUN ${config.buildCommand}` : ''}
EXPOSE ${config.port}
CMD ${config.startCommand ? `["sh", "-c", "${config.startCommand}"]` : '["node", "index.js"]'}
DOCKERFILE
  fi
elif [ -f "requirements.txt" ]; then
  # Python project
  cat > Dockerfile << 'DOCKERFILE'
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
${config.buildCommand ? `RUN ${config.buildCommand}` : ''}
EXPOSE ${config.port}
CMD ${config.startCommand ? `["sh", "-c", "${config.startCommand}"]` : '["python", "app.py"]'}
DOCKERFILE
elif [ -f "go.mod" ]; then
  # Go project
  cat > Dockerfile << 'DOCKERFILE'
FROM golang:1.22 AS builder
WORKDIR /app
COPY go.mod go.sum* ./
RUN go mod download
COPY . .
${config.buildCommand ? `RUN ${config.buildCommand}` : 'RUN CGO_ENABLED=0 go build -o main .'}
RUN go build -o main .

FROM alpine:latest
WORKDIR /app
COPY --from=builder /app/main .
EXPOSE ${config.port}
CMD ["./main"]
DOCKERFILE
elif [ -f "Gemfile" ]; then
  # Ruby project
  cat > Dockerfile << 'DOCKERFILE'
FROM ruby:3.2-slim
WORKDIR /app
COPY Gemfile* ./
RUN bundle install
COPY . .
${config.buildCommand ? `RUN ${config.buildCommand}` : ''}
EXPOSE ${config.port}
CMD ${config.startCommand ? `["sh", "-c", "${config.startCommand}"]` : '["ruby", "app.rb"]'}
DOCKERFILE
else
  # Default: static file server
  cat > Dockerfile << 'DOCKERFILE'
FROM node:22-slim
WORKDIR /app
COPY . .
RUN npm install -g serve
EXPOSE ${config.port}
CMD ["serve", "-s", ".", "-l", "${config.port}"]
DOCKERFILE
fi

echo "Build script generated successfully"
`;
}

// Cancel a running build
export async function cancelBuild(namespace: string, jobName: string): Promise<void> {
  try {
    // Delete the job to cancel the build
    await deleteBuildJob(namespace, jobName);
  } catch (err: any) {
    throw new Error(`Failed to cancel build: ${err.message}`);
  }
}
