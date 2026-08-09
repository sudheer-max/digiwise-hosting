import { FastifyInstance } from 'fastify';
import { prisma } from '../db/client.js';
import * as k8s from '../services/kubernetes.js';
import { execSync } from 'child_process';

export async function databaseRoutes(app: FastifyInstance) {
  // List database namespaces (PostgreSQL, MongoDB, Redis operators)
  app.get('/api/databases', {
    schema: {
      tags: ['Databases'],
      description: 'List available database operators and their status',
      security: [{ bearerAuth: [] }],
    },
    preHandler: app.authenticate,
  }, async () => {
    const operators = [
      { name: 'PostgreSQL', namespace: 'postgresql', status: 'unknown' },
      { name: 'MongoDB', namespace: 'mongodb', status: 'unknown' },
      { name: 'MySQL', namespace: 'mysql-operator', status: 'unknown' },
      { name: 'Redis', namespace: 'redis', status: 'unknown' },
    ];

    // Check operator status
    for (const op of operators) {
      try {
        const pods = await k8s.listPods(op.namespace);
        op.status = pods.some(p => p.phase === 'Running') ? 'running' : 'stopped';
      } catch {
        op.status = 'not-installed';
      }
    }

    return operators;
  });

  // Create a database instance
  app.post<{ Body: { type: string; name: string; namespace: string; size?: string } }>('/api/databases', {
    schema: {
      tags: ['Databases'],
      description: 'Create a database instance',
      body: {
        type: 'object',
        required: ['type', 'name', 'namespace'],
        properties: {
          type: { type: 'string', enum: ['postgresql', 'mongodb', 'mysql', 'redis'] },
          name: { type: 'string', minLength: 1, maxLength: 63 },
          namespace: { type: 'string' },
          size: { type: 'string', default: 'small' },
        },
      },
      security: [{ bearerAuth: [] }],
    },
    preHandler: app.authenticate,
  }, async (request, reply) => {
    const user = request.user as { id: string; role?: string };
    const { type, name, namespace, size = 'small' } = request.body;

    // Verify user owns the namespace (admins can access any project)
    const project = user.role === 'admin'
      ? await prisma.project.findFirst({ where: { k8sNamespace: namespace } })
      : await prisma.project.findFirst({ where: { k8sNamespace: namespace, userId: user.id } });

    if (!project) {
      return reply.status(404).send({ error: 'Project namespace not found' });
    }

    // Size presets
    const sizes: Record<string, { cpu: string; memory: string; storage: string }> = {
      small: { cpu: '500m', memory: '512Mi', storage: '5Gi' },
      medium: { cpu: '1', memory: '1Gi', storage: '20Gi' },
      large: { cpu: '2', memory: '2Gi', storage: '100Gi' },
    };

    const resources = sizes[size] || sizes.small;

    try {
      // Create database using K8s custom resources
      if (type === 'postgresql') {
        await createPostgresInstance(namespace, name, resources);
      } else if (type === 'mongodb') {
        await createMongoInstance(namespace, name, resources);
      } else if (type === 'mysql') {
        await createMysqlInstance(namespace, name, resources);
      } else if (type === 'redis') {
        await createRedisInstance(namespace, name, resources);
      }

      return reply.status(201).send({
        type,
        name,
        namespace,
        size,
        status: 'creating',
      });
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // List databases in a namespace
  app.get<{ Params: { namespace: string } }>('/api/databases/:namespace', {
    schema: {
      tags: ['Databases'],
      description: 'List databases in a namespace',
      params: { type: 'object', properties: { namespace: { type: 'string' } } },
      security: [{ bearerAuth: [] }],
    },
    preHandler: app.authenticate,
  }, async (request, reply) => {
    const user = request.user as { id: string; role?: string };
    const { namespace } = request.params;

    // Verify user owns the namespace (admins can access any project)
    const project = user.role === 'admin'
      ? await prisma.project.findFirst({ where: { k8sNamespace: namespace } })
      : await prisma.project.findFirst({ where: { k8sNamespace: namespace, userId: user.id } });

    if (!project) {
      return reply.status(404).send({ error: 'Project namespace not found' });
    }

    // List database instances by querying the operator CRDs
    const databases = [];

    // PostgreSQL instances (CloudNativePG)
    try {
      const res: any = await k8s.k8sCustomApi.listNamespacedCustomObject({
        group: 'postgresql.cnpg.io',
        version: 'v1',
        namespace,
        plural: 'clusters',
      });
      const items = res.items || (res.body && res.body.items) || [];
      for (const c of items) {
        databases.push({
          type: 'postgresql',
          name: c.metadata?.name,
          status: c.status?.phase || c.status?.conditions?.[0]?.status || 'Unknown',
          namespace,
        });
      }
    } catch { /* Ignore errors */ }

    // MongoDB instances (Percona)
    try {
      const res: any = await k8s.k8sCustomApi.listNamespacedCustomObject({
        group: 'psmdb.percona.com',
        version: 'v1',
        namespace,
        plural: 'perconaservermongodbs',
      });
      const items = res.items || (res.body && res.body.items) || [];
      for (const c of items) {
        databases.push({
          type: 'mongodb',
          name: c.metadata?.name,
          status: c.status?.state || 'Unknown',
          namespace,
        });
      }
    } catch { /* Ignore errors */ }

    // MySQL instances (MySQL Operator - InnoDBCluster)
    try {
      const res: any = await k8s.k8sCustomApi.listNamespacedCustomObject({
        group: 'mysql.oracle.com',
        version: 'v2',
        namespace,
        plural: 'innodbclusters',
      });
      const items = res.items || (res.body && res.body.items) || [];
      for (const c of items) {
        databases.push({
          type: 'mysql',
          name: c.metadata?.name,
          status: c.status?.cluster?.status || c.status?.status || 'Unknown',
          namespace,
        });
      }
    } catch { /* Ignore errors */ }

    // Redis instances (Spotahome)
    try {
      const res: any = await k8s.k8sCustomApi.listNamespacedCustomObject({
        group: 'databases.spotahome.com',
        version: 'v1',
        namespace,
        plural: 'redisfailovers',
      });
      const items = res.items || (res.body && res.body.items) || [];
      for (const c of items) {
        databases.push({
          type: 'redis',
          name: c.metadata?.name,
          status: c.status?.conditions?.[0]?.status || 'Unknown',
          namespace,
        });
      }
    } catch { /* Ignore errors */ }

    return databases;
  });

  // Get database connection variables (Railway-style)
  app.get<{ Params: { namespace: string; type: string; name: string } }>('/api/databases/:namespace/:type/:name/variables', {
    schema: {
      tags: ['Databases'],
      description: 'Get database connection variables, host, port, credentials, connection strings',
      params: {
        type: 'object',
        properties: {
          namespace: { type: 'string' },
          type: { type: 'string' },
          name: { type: 'string' },
        },
      },
      security: [{ bearerAuth: [] }],
    },
    preHandler: app.authenticate,
  }, async (request, reply) => {
    const user = request.user as { id: string; role?: string };
    const { namespace, type, name } = request.params;

    const project = user.role === 'admin'
      ? await prisma.project.findFirst({ where: { k8sNamespace: namespace } })
      : await prisma.project.findFirst({ where: { k8sNamespace: namespace, userId: user.id } });

    if (!project) {
      return reply.status(404).send({ error: 'Project namespace not found' });
    }

    try {
      const variables = await getDatabaseVariables(namespace, type, name);
      return variables;
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // Delete a database instance
  app.delete<{ Params: { namespace: string; type: string; name: string } }>('/api/databases/:namespace/:type/:name', {
    schema: {
      tags: ['Databases'],
      description: 'Delete a database instance',
      params: {
        type: 'object',
        properties: {
          namespace: { type: 'string' },
          type: { type: 'string' },
          name: { type: 'string' },
        },
      },
      security: [{ bearerAuth: [] }],
    },
    preHandler: app.authenticate,
  }, async (request, reply) => {
    const user = request.user as { id: string; role?: string };
    const { namespace, type, name } = request.params;

    // Verify user owns the namespace (admins can access any project)
    const project = user.role === 'admin'
      ? await prisma.project.findFirst({ where: { k8sNamespace: namespace } })
      : await prisma.project.findFirst({ where: { k8sNamespace: namespace, userId: user.id } });

    if (!project) {
      return reply.status(404).send({ error: 'Project namespace not found' });
    }

    try {
      // Delete the database CRD according to its type
      if (type === 'postgresql') {
        await k8s.k8sCustomApi.deleteNamespacedCustomObject({
          group: 'postgresql.cnpg.io', version: 'v1', namespace, plural: 'clusters', name,
        });
      } else if (type === 'mongodb') {
        await k8s.k8sCustomApi.deleteNamespacedCustomObject({
          group: 'psmdb.percona.com', version: 'v1', namespace, plural: 'perconaservermongodbs', name,
        });
      } else if (type === 'mysql') {
        await k8s.k8sCustomApi.deleteNamespacedCustomObject({
          group: 'mysql.oracle.com', version: 'v2', namespace, plural: 'innodbclusters', name,
        });
        // Remove the associated root credentials secret
        await k8s.k8sCoreApi.deleteNamespacedSecret({ name: `${name}-secret`, namespace }).catch(() => {});
      } else if (type === 'redis') {
        await k8s.k8sCustomApi.deleteNamespacedCustomObject({
          group: 'databases.spotahome.com', version: 'v1', namespace, plural: 'redisfailovers', name,
        });
      }

      return reply.status(200).send({ success: true, message: 'Database deletion initiated' });
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // Migrate data from external MongoDB (e.g. Railway) into this database
  app.post<{ Params: { namespace: string; type: string; name: string }; Body: { sourceUri: string } }>('/api/databases/:namespace/:type/:name/migrate', {
    schema: {
      tags: ['Databases'],
      description: 'Migrate data from an external MongoDB (e.g. Railway) into this database instance',
      params: {
        type: 'object',
        properties: {
          namespace: { type: 'string' },
          type: { type: 'string' },
          name: { type: 'string' },
        },
      },
      body: {
        type: 'object',
        required: ['sourceUri'],
        properties: {
          sourceUri: { type: 'string', description: 'MongoDB connection URI from Railway or other provider' },
        },
      },
      security: [{ bearerAuth: [] }],
    },
    preHandler: app.authenticate,
  }, async (request, reply) => {
    const user = request.user as { id: string; role?: string };
    const { namespace, type, name } = request.params;
    const { sourceUri } = request.body;

    if (type !== 'mongodb') {
      return reply.status(400).send({ error: 'Migration is currently only supported for MongoDB' });
    }

    // Verify ownership
    const project = user.role === 'admin'
      ? await prisma.project.findFirst({ where: { k8sNamespace: namespace } })
      : await prisma.project.findFirst({ where: { k8sNamespace: namespace, userId: user.id } });

    if (!project) {
      return reply.status(404).send({ error: 'Project namespace not found' });
    }

    // Get target connection details
    const vars = await getDatabaseVariables(namespace, type, name);
    const targetUri = `mongodb://${vars.username}:${vars.password}@${vars.host}:${vars.port}/${vars.databaseName}?authSource=admin`;

    // Find the MongoDB pod
    let podName = '';
    try {
      const podsRes: any = await k8s.k8sCoreApi.listNamespacedPod({
        namespace,
        labelSelector: `app.kubernetes.io/name=${name},app.kubernetes.io/component=rs0`,
      });
      const items = podsRes.items || (podsRes.body && podsRes.body.items) || [];
      podName = items[0]?.metadata?.name || '';
    } catch {
      // Fallback: try listing pods with name filter
      try {
        const podsRes: any = await k8s.k8sCoreApi.listNamespacedPod({ namespace });
        const items = podsRes.items || (podsRes.body && podsRes.body.items) || [];
        const found = items.find((p: any) => p.metadata?.name?.includes(name) && p.status?.phase === 'Running');
        podName = found?.metadata?.name || '';
      } catch { /* continue */ }
    }

    if (!podName) {
      return reply.status(404).send({ error: 'MongoDB pod not found. Is the database running?' });
    }

    try {
      // Run mongodump from source URI into the pod's tmp directory
      const dumpDir = `/tmp/migration-${Date.now()}`;

      // Step 1: mongodump from source (Railway)
      const dumpCmd = `kubectl exec -n ${namespace} ${podName} -- bash -c "mkdir -p ${dumpDir} && mongodump --uri=\\"${sourceUri}\\" --out=${dumpDir} --gzip"`;
      execSync(dumpCmd, { timeout: 300000, encoding: 'utf-8' });

      // Step 2: mongorestore into target
      const restoreCmd = `kubectl exec -n ${namespace} ${podName} -- bash -c "mongorestore --uri=\\"${targetUri}\\" --dir=${dumpDir} --gzip --drop"`;
      execSync(restoreCmd, { timeout: 300000, encoding: 'utf-8' });

      // Step 3: Cleanup
      const cleanupCmd = `kubectl exec -n ${namespace} ${podName} -- bash -c "rm -rf ${dumpDir}"`;
      execSync(cleanupCmd, { timeout: 30000, encoding: 'utf-8' });

      return reply.status(200).send({
        success: true,
        message: 'Migration completed successfully',
        target: {
          host: vars.host,
          port: vars.port,
          database: vars.databaseName,
        },
      });
    } catch (err: any) {
      const errMsg = err.stderr || err.message || 'Migration failed';
      return reply.status(500).send({
        error: 'Migration failed',
        details: errMsg.includes(' mongodump') ? 'Failed to dump data from source. Check your connection string.' :
                 errMsg.includes(' mongorestore') ? 'Failed to restore data to target. Check if the target database is accessible.' :
                 errMsg,
      });
    }
  });
}

// Helper functions for creating database instances
async function createPostgresInstance(namespace: string, name: string, resources: { cpu: string; memory: string; storage: string }) {
  // Create PostgreSQL instance using CloudNativePG CRD
  const postgresCRD = {
    apiVersion: 'postgresql.cnpg.io/v1',
    kind: 'Cluster',
    metadata: {
      name: name,
      namespace: namespace,
    },
    spec: {
      instances: 1,
      postgresql: {
        parameters: {
          max_connections: '100',
        },
      },
      bootstrap: {
        initdb: {
          database: name,
        },
      },
      storage: {
        size: resources.storage,
      },
      resources: {
        requests: {
          cpu: resources.cpu,
          memory: resources.memory,
        },
        limits: {
          cpu: resources.cpu,
          memory: resources.memory,
        },
      },
    },
  };

  await k8s.k8sCustomApi.createNamespacedCustomObject({
    group: 'postgresql.cnpg.io',
    version: 'v1',
    namespace,
    plural: 'clusters',
    body: postgresCRD,
  });
}

async function createMongoInstance(namespace: string, name: string, resources: { cpu: string; memory: string; storage: string }) {
  // Create MongoDB instance using Percona CRD
  const mongoCRD = {
    apiVersion: 'psmdb.percona.com/v1',
    kind: 'PerconaServerMongoDB',
    metadata: {
      name: name,
      namespace: namespace,
    },
    spec: {
      image: 'percona/percona-server-mongodb:6.0',
      imagePullPolicy: 'IfNotPresent',
      replsets: [
        {
          name: 'rs0',
          size: 1,
          resources: {
            requests: {
              cpu: resources.cpu,
              memory: resources.memory,
            },
            limits: {
              cpu: resources.cpu,
              memory: resources.memory,
            },
          },
          volumeSpec: {
            persistentVolumeClaim: {
              resources: {
                requests: {
                  storage: resources.storage,
                },
              },
            },
          },
        },
      ],
    },
  };

  await k8s.k8sCustomApi.createNamespacedCustomObject({
    group: 'psmdb.percona.com',
    version: 'v1',
    namespace,
    plural: 'perconaservermongodbs',
    body: mongoCRD,
  });
}

async function createMysqlInstance(namespace: string, name: string, resources: { cpu: string; memory: string; storage: string }) {
  // Create a Secret holding the MySQL root credentials (required by the MySQL Operator)
  const secretName = `${name}-secret`;
  const rootPassword = `Pw_${Math.random().toString(36).slice(2, 10)}_${Math.random().toString(36).slice(2, 8)}`;

  await k8s.k8sCoreApi.createNamespacedSecret({
    namespace,
    body: {
      apiVersion: 'v1',
      kind: 'Secret',
      metadata: { name: secretName, namespace },
      type: 'Opaque',
      stringData: {
        rootUser: 'root',
        rootHost: '%',
        rootPassword,
      },
    },
  });

  // Create the InnoDBCluster custom resource
  const mysqlCRD = {
    apiVersion: 'mysql.oracle.com/v2',
    kind: 'InnoDBCluster',
    metadata: {
      name: name,
      namespace: namespace,
    },
    spec: {
      secretName,
      tlsUseSelfSigned: true,
      instances: 1,
      router: { instances: 1 },
      version: '8.0.36',
      datadirVolumeClaimTemplate: {
        accessModes: ['ReadWriteOnce'],
        storageClassName: 'local-path',
        resources: { requests: { storage: resources.storage } },
      },
      podSpec: {
        resources: {
          requests: { cpu: '1', memory: '1Gi' },
          limits: { cpu: resources.cpu === '2' ? '2' : '1', memory: resources.memory === '2Gi' ? '2Gi' : '1Gi' },
        },
        containers: [
          {
            name: 'mysql',
            resources: {
              requests: { cpu: '1', memory: '1Gi' },
              limits: { cpu: resources.cpu === '2' ? '2' : '1', memory: resources.memory === '2Gi' ? '2Gi' : '1Gi' },
            },
          },
          {
            name: 'sidecar',
            resources: {
              requests: { cpu: '100m', memory: '128Mi' },
              limits: { cpu: '500m', memory: '512Mi' },
            },
          },
        ],
      },
    },
  };

  await k8s.k8sCustomApi.createNamespacedCustomObject({
    group: 'mysql.oracle.com',
    version: 'v2',
    namespace,
    plural: 'innodbclusters',
    body: mysqlCRD,
  });
}

async function createRedisInstance(namespace: string, name: string, resources: { cpu: string; memory: string; storage: string }) {
  // Create Redis instance using Spotahome CRD
  const redisCRD = {
    apiVersion: 'databases.spotahome.com/v1',
    kind: 'RedisFailover',
    metadata: {
      name: name,
      namespace: namespace,
    },
    spec: {
      sentinel: {
        replicas: 1,
      },
      redis: {
        replicas: 1,
        resources: {
          requests: {
            cpu: resources.cpu,
            memory: resources.memory,
          },
          limits: {
            cpu: resources.cpu,
            memory: resources.memory,
          },
        },
      },
    },
  };

  await k8s.k8sCustomApi.createNamespacedCustomObject({
    group: 'databases.spotahome.com',
    version: 'v1',
    namespace,
    plural: 'redisfailovers',
    body: redisCRD,
  });
}

// Helper: Get database connection variables from K8s secrets and services
async function getDatabaseVariables(namespace: string, type: string, name: string) {
  let host = '';
  let port = 0;
  let username = '';
  let password = '';
  let databaseName = name;
  let externalHost = '';
  let externalPort = 0;

  const defaults: Record<string, { port: number; user: string }> = {
    postgresql: { port: 5432, user: 'postgres' },
    mongodb: { port: 27017, user: 'mongodb' },
    mysql: { port: 3306, user: 'root' },
    redis: { port: 6379, user: 'default' },
  };

  const def = defaults[type] || defaults.postgresql;

  try {
    if (type === 'postgresql') {
      // CloudNativePG stores credentials in {name}-app secret
      const secret = await k8s.k8sCoreApi.readNamespacedSecret({ name: `${name}-app`, namespace });
      const data = secret.data || {};
      username = Buffer.from(data['username'] || '').toString('base64') || 'postgres';
      password = Buffer.from(data['password'] || '').toString('base64') || '';
      databaseName = Buffer.from(data['db-name'] || '').toString('base64') || name;
      host = `${name}-rw.${namespace}.svc.cluster.local`;
      port = def.port;
    } else if (type === 'mongodb') {
      // Percona stores credentials in {name}-cluster-admin-{name} secret
      try {
        const secret = await k8s.k8sCoreApi.readNamespacedSecret({ name: `${name}-cluster-admin-${name}`, namespace });
        const data = secret.data || {};
        username = Buffer.from(data['MONGODB_BACKUP_USER'] || data['MONGODB_USER'] || '').toString('base64') || 'mongodb';
        password = Buffer.from(data['MONGODB_BACKUP_PASSWORD'] || data['MONGODB_PASSWORD'] || '').toString('base64') || '';
      } catch {
        // Fallback: try Percona secrets
        try {
          const secret = await k8s.k8sCoreApi.readNamespacedSecret({ name: `${name}-secrets`, namespace });
          const data = secret.data || {};
          username = Buffer.from(data['MONGODB_BACKUP_USER'] || '').toString('base64') || 'mongodb';
          password = Buffer.from(data['MONGODB_BACKUP_PASSWORD'] || '').toString('base64') || '';
        } catch { /* use defaults */ }
      }
      host = `${name}-rs0.${namespace}.svc.cluster.local`;
      port = def.port;
    } else if (type === 'mysql') {
      // MySQL Operator stores credentials in {name}-secret
      const secret = await k8s.k8sCoreApi.readNamespacedSecret({ name: `${name}-secret`, namespace });
      const data = secret.data || {};
      username = Buffer.from(data['rootUser'] || '').toString('base64') || 'root';
      password = Buffer.from(data['rootPassword'] || '').toString('base64') || '';
      host = `${name}-router.${namespace}.svc.cluster.local`;
      port = def.port;
    } else if (type === 'redis') {
      // Spotahome Redis stores auth in {name}-auth secret (if configured)
      try {
        const secret = await k8s.k8sCoreApi.readNamespacedSecret({ name: `${name}-auth`, namespace });
        const data = secret.data || {};
        password = Buffer.from(data['password'] || '').toString('base64') || '';
      } catch { /* no auth */ }
      username = def.user;
      host = `${name}.${namespace}.svc.cluster.local`;
      port = def.port;
    }
  } catch {
    // Use defaults if secrets not found
    host = `${name}-rw.${namespace}.svc.cluster.local`;
    port = def.port;
    username = def.user;
  }

  // Build connection strings
  const internalConnectionString = buildConnectionString(type, host, port, username, password, databaseName);

  // External access via port-forward command
  const portForwardCmd = `kubectl port-forward -n ${namespace} svc/${type === 'postgresql' ? name + '-rw' : type === 'mongodb' ? name + '-rs0' : type === 'mysql' ? name + '-router' : name} ${port}:${port}`;
  const externalConnectionString = buildConnectionString(type, 'localhost', port, username, password, databaseName);

  // Environment variables
  const envVars: Record<string, string> = {};
  if (type === 'postgresql') {
    envVars['DATABASE_URL'] = internalConnectionString;
    envVars['POSTGRES_HOST'] = host;
    envVars['POSTGRES_PORT'] = String(port);
    envVars['POSTGRES_USER'] = username;
    envVars['POSTGRES_PASSWORD'] = password;
    envVars['POSTGRES_DB'] = databaseName;
  } else if (type === 'mongodb') {
    envVars['DATABASE_URL'] = internalConnectionString;
    envVars['MONGODB_HOST'] = host;
    envVars['MONGODB_PORT'] = String(port);
    envVars['MONGODB_USER'] = username;
    envVars['MONGODB_PASSWORD'] = password;
    envVars['MONGODB_DB'] = databaseName;
  } else if (type === 'mysql') {
    envVars['DATABASE_URL'] = internalConnectionString;
    envVars['MYSQL_HOST'] = host;
    envVars['MYSQL_PORT'] = String(port);
    envVars['MYSQL_USER'] = username;
    envVars['MYSQL_PASSWORD'] = password;
    envVars['MYSQL_DATABASE'] = databaseName;
  } else if (type === 'redis') {
    envVars['REDIS_URL'] = internalConnectionString;
    envVars['REDIS_HOST'] = host;
    envVars['REDIS_PORT'] = String(port);
    envVars['REDIS_PASSWORD'] = password;
  }

  return {
    type,
    name,
    namespace,
    host,
    port,
    username,
    password,
    databaseName,
    internalConnectionString,
    externalConnectionString,
    portForwardCmd,
    envVars,
  };
}

function buildConnectionString(type: string, host: string, port: number, user: string, pass: string, db: string): string {
  switch (type) {
    case 'postgresql':
      return `postgresql://${user}:${pass}@${host}:${port}/${db}?sslmode=disable`;
    case 'mongodb':
      return `mongodb://${user}:${pass}@${host}:${port}/${db}?authSource=admin`;
    case 'mysql':
      return `mysql://${user}:${pass}@${host}:${port}/${db}`;
    case 'redis':
      return pass ? `redis://:${pass}@${host}:${port}` : `redis://${host}:${port}`;
    default:
      return `${host}:${port}`;
  }
}

