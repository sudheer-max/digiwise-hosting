import { FastifyInstance } from 'fastify';
import { prisma } from '../db/client.js';
import * as k8s from '../services/kubernetes.js';
import { execSync, execFileSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

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

      // Create NodePort for external access
      const port = type === 'postgresql' ? 5432 : type === 'mongodb' ? 27017 : type === 'mysql' ? 3306 : 6379;
      const targetSvc = type === 'postgresql' ? `${name}-rw` : type === 'mongodb' ? name : type === 'mysql' ? `${name}-router` : name;
      try {
        await k8s.k8sCoreApi.createNamespacedService({
          namespace,
          body: {
            apiVersion: 'v1',
            kind: 'Service',
            metadata: { name: `${name}-rw-external`, namespace },
            spec: {
              type: 'NodePort',
              selector: type === 'postgresql'
                ? { ['cnpg.io/cluster']: name, role: 'primary' }
                : { app: name },
              ports: [{ port, targetPort: port, nodePort: 30100 + Math.floor(Math.random() * 2600) }],
            },
          },
        });
      } catch { /* external service may already exist */ }

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

    // MongoDB instances (simple StatefulSet fallback)
    try {
      const stsRes: any = await k8s.k8sAppsApi.listNamespacedStatefulSet({ namespace });
      const stsItems = stsRes.items || (stsRes.body && stsRes.body.items) || [];
      const existingMongoNames = new Set(databases.filter(d => d.type === 'mongodb').map(d => d.name));
      for (const sts of stsItems) {
        const stsName = sts.metadata?.name || '';
        if (existingMongoNames.has(stsName)) continue;
        const image = sts.spec?.template?.spec?.containers?.[0]?.image || '';
        if (image.includes('mongo')) {
          const readyReplicas = sts.status?.readyReplicas || 0;
          const replicas = sts.spec?.replicas || 1;
          databases.push({
            type: 'mongodb',
            name: stsName,
            status: readyReplicas >= replicas ? 'Running' : 'Pending',
            namespace,
          });
        }
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

  // Health check for a database instance
  app.get<{ Params: { namespace: string; type: string; name: string } }>('/api/databases/:namespace/:type/:name/health', {
    schema: {
      tags: ['Databases'],
      description: 'Check database health status',
      params: {
        type: 'object',
        properties: {
          namespace: { type: 'string' },
          type: { type: 'string' },
          name: { type: 'string' },
        },
        required: ['namespace', 'type', 'name'],
      },
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
      const pods = await k8s.k8sCoreApi.listNamespacedPod({
        namespace,
        labelSelector: `cnpg.io/cluster=${name}`,
      });

      if (!pods.items || pods.items.length === 0) {
        // Try simple StatefulSet label (MongoDB, Redis, etc.)
        const simplePods = await k8s.k8sCoreApi.listNamespacedPod({
          namespace,
          labelSelector: `app=${name}`,
        });
        if (!simplePods.items || simplePods.items.length === 0) {
          return { status: 'unknown', pods: [], ready: 0, total: 0 };
        }
        const podStatuses = simplePods.items.map(p => ({
          name: p.metadata?.name || '',
          status: p.status?.phase || 'Unknown',
          ready: p.status?.conditions?.find(c => c.type === 'Ready')?.status === 'True',
          restarts: p.status?.containerStatuses?.[0]?.restartCount || 0,
          age: p.metadata?.creationTimestamp || '',
        }));
        const readyCount = podStatuses.filter(p => p.ready).length;
        return {
          status: readyCount > 0 ? 'healthy' : 'unhealthy',
          pods: podStatuses,
          ready: readyCount,
          total: podStatuses.length,
        };
      }

      const podStatuses = pods.items.map(p => ({
        name: p.metadata?.name || '',
        status: p.status?.phase || 'Unknown',
        ready: p.status?.conditions?.find(c => c.type === 'Ready')?.status === 'True',
        restarts: p.status?.containerStatuses?.[0]?.restartCount || 0,
        role: p.metadata?.labels?.['cnpg.io/role'] || '',
        age: p.metadata?.creationTimestamp || '',
      }));

      const readyCount = podStatuses.filter(p => p.ready).length;
      return {
        status: readyCount > 0 ? 'healthy' : 'unhealthy',
        pods: podStatuses,
        ready: readyCount,
        total: podStatuses.length,
      };
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // Browse database data (tables + rows)
  app.get<{ Params: { namespace: string; type: string; name: string }; Querystring: { table?: string; limit?: string } }>('/api/databases/:namespace/:type/:name/browse', {
    schema: {
      tags: ['Databases'],
      description: 'Browse database tables and data',
      params: { type: 'object', properties: { namespace: { type: 'string' }, type: { type: 'string' }, name: { type: 'string' } }, required: ['namespace', 'type', 'name'] },
      querystring: { type: 'object', properties: { table: { type: 'string' }, limit: { type: 'string' } } },
    },
    preHandler: app.authenticate,
  }, async (request, reply) => {
    const user = request.user as { id: string; role?: string };
    const { namespace, type, name } = request.params;
    const { table, limit: rowLimit } = request.query;
    const limit = parseInt(rowLimit || '50', 10) || 50;

    const project = user.role === 'admin'
      ? await prisma.project.findFirst({ where: { k8sNamespace: namespace } })
      : await prisma.project.findFirst({ where: { k8sNamespace: namespace, userId: user.id } });

    if (!project) return reply.status(404).send({ error: 'Project namespace not found' });

    try {
      const vars = await getDatabaseVariables(namespace, type, name);

      // Find running pod dynamically (CNPG starts at 1, StatefulSets at 0)
      let podName = '';
      try {
        const podsRes: any = await k8s.k8sCoreApi.listNamespacedPod({ namespace });
        const items = podsRes.items || (podsRes.body && podsRes.body.items) || [];
        const running = items.find((p: any) =>
          p.status?.phase === 'Running' && p.metadata?.name?.startsWith(`${name}-`)
        );
        podName = running?.metadata?.name || '';
      } catch { /* continue */ }

      if (!podName) {
        return reply.status(404).send({ error: 'No running pod found for database' });
      }

      if (type === 'postgresql') {
        // Use kubectl exec but force TCP connection with -h flag to avoid peer auth
        const pgHost = `${name}-rw.${namespace}.svc.cluster.local`;
        const pgPort = '5432';
        const pgUser = vars.username;
        const pgPass = vars.password;
        const pgDb = vars.databaseName;

        const listCmd = `kubectl exec -n ${namespace} ${podName} -- env PGPASSWORD="${pgPass}" psql -h ${pgHost} -p ${pgPort} -U ${pgUser} -d ${pgDb} -t -A -c "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename"`;
        const tableList = execSync(listCmd, { encoding: 'utf-8', stdio: 'pipe' }).trim().split('\n').filter(Boolean);

        if (table) {
          const dataCmd = `kubectl exec -n ${namespace} ${podName} -- env PGPASSWORD="${pgPass}" psql -h ${pgHost} -p ${pgPort} -U ${pgUser} -d ${pgDb} -t -A -F '|' -c "SELECT * FROM \\"${table}\\" LIMIT ${limit}"`;
          const colCmd = `kubectl exec -n ${namespace} ${podName} -- env PGPASSWORD="${pgPass}" psql -h ${pgHost} -p ${pgPort} -U ${pgUser} -d ${pgDb} -t -A -c "SELECT column_name FROM information_schema.columns WHERE table_name='${table}' AND table_schema='public' ORDER BY ordinal_position"`;
          const countCmd = `kubectl exec -n ${namespace} ${podName} -- env PGPASSWORD="${pgPass}" psql -h ${pgHost} -p ${pgPort} -U ${pgUser} -d ${pgDb} -t -A -c "SELECT count(*) FROM \\"${table}\\""`;

          const columns = execSync(colCmd, { encoding: 'utf-8', stdio: 'pipe' }).trim().split('\n').filter(Boolean);
          const rawRows = execSync(dataCmd, { encoding: 'utf-8', stdio: 'pipe' }).trim().split('\n').filter(Boolean);
          const total = parseInt(execSync(countCmd, { encoding: 'utf-8', stdio: 'pipe' }).trim(), 10);

          const rows = rawRows.map(r => {
            const vals = r.split('|');
            const obj: Record<string, string> = {};
            columns.forEach((col, i) => { obj[col] = vals[i] ?? ''; });
            return obj;
          });

          return {
            tables: tableList,
            selectedTable: table,
            columns,
            rows,
            total,
            limit,
          };
        }

        return { tables: tableList, selectedTable: null, columns: [], rows: [], total: 0 };
      }

      if (type === 'mongodb') {
        // List collections
        const listCmd = `kubectl exec -n ${namespace} ${podName} -- mongosh -u ${vars.username} -p ${vars.password} --authenticationDatabase admin ${vars.databaseName} --eval "db.getCollectionNames()" --quiet`;
        const raw = execSync(listCmd, { encoding: 'utf-8', stdio: 'pipe' }).trim();
        const collections = raw.replace(/[\[\]"']/g, '').split(',').map(s => s.trim()).filter(Boolean);

        if (table) {
          const dataCmd = `kubectl exec -n ${namespace} ${podName} -- mongosh -u ${vars.username} -p ${vars.password} --authenticationDatabase admin ${vars.databaseName} --eval "JSON.stringify(db.${table}.find().limit(${limit}).toArray())" --quiet`;
          const countCmd = `kubectl exec -n ${namespace} ${podName} -- mongosh -u ${vars.username} -p ${vars.password} --authenticationDatabase admin ${vars.databaseName} --eval "db.${table}.countDocuments()" --quiet`;

          const rawData = execSync(dataCmd, { encoding: 'utf-8', stdio: 'pipe' }).trim();
          const rows = JSON.parse(rawData || '[]');
          const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
          const total = parseInt(execSync(countCmd, { encoding: 'utf-8', stdio: 'pipe' }).trim(), 10);

          return {
            tables: collections,
            selectedTable: table,
            columns,
            rows,
            total,
            limit,
          };
        }

        return { tables: collections, selectedTable: null, columns: [], rows: [], total: 0 };
      }

      return reply.status(400).send({ error: 'Data browsing only supported for PostgreSQL and MongoDB' });
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // Delete a row from database table
  app.delete<{ Params: { namespace: string; type: string; name: string }; Querystring: { table: string; id: string; idColumn?: string } }>('/api/databases/:namespace/:type/:name/row', {
    schema: {
      tags: ['Databases'],
      description: 'Delete a row from a database table',
      params: { type: 'object', properties: { namespace: { type: 'string' }, type: { type: 'string' }, name: { type: 'string' } }, required: ['namespace', 'type', 'name'] },
      querystring: { type: 'object', properties: { table: { type: 'string' }, id: { type: 'string' }, idColumn: { type: 'string' } }, required: ['table', 'id'] },
    },
    preHandler: app.authenticate,
  }, async (request, reply) => {
    const user = request.user as { id: string; role?: string };
    const { namespace, type, name } = request.params;
    const { table, id, idColumn = 'id' } = request.query;

    const project = user.role === 'admin'
      ? await prisma.project.findFirst({ where: { k8sNamespace: namespace } })
      : await prisma.project.findFirst({ where: { k8sNamespace: namespace, userId: user.id } });
    if (!project) return reply.status(404).send({ error: 'Project namespace not found' });

    if (!table || !id) return reply.status(400).send({ error: 'table and id query params required' });

    try {
      const vars = await getDatabaseVariables(namespace, type, name);

      // Find running pod
      let podName = '';
      try {
        const podsRes: any = await k8s.k8sCoreApi.listNamespacedPod({ namespace });
        const items = podsRes.items || (podsRes.body && podsRes.body.items) || [];
        const running = items.find((p: any) =>
          p.status?.phase === 'Running' && p.metadata?.name?.startsWith(`${name}-`)
        );
        podName = running?.metadata?.name || '';
      } catch { /* continue */ }

      if (!podName) return reply.status(404).send({ error: 'Database pod not found' });

      if (type === 'postgresql') {
        const pgHost = `${name}-rw.${namespace}.svc.cluster.local`;
        const cmd = `kubectl exec -n ${namespace} ${podName} -- env PGPASSWORD="${vars.password}" psql -h ${pgHost} -p 5432 -U ${vars.username} -d ${vars.databaseName} -t -A -c "DELETE FROM \\"${table}\\" WHERE \\"${idColumn}\\" = '${id.replace(/'/g, "''")}'"`;
        execSync(cmd, { encoding: 'utf-8', stdio: 'pipe' });
        return { success: true, message: `Row deleted from ${table}` };
      }

      if (type === 'mongodb') {
        const cmd = `kubectl exec -n ${namespace} ${podName} -- mongosh -u ${vars.username} -p ${vars.password} --authenticationDatabase admin ${vars.databaseName} --eval "db.${table}.deleteOne({_id: ObjectId('${id}')})" --quiet`;
        execSync(cmd, { encoding: 'utf-8', stdio: 'pipe' });
        return { success: true, message: `Row deleted from ${table}` };
      }

      return reply.status(400).send({ error: 'Delete only supported for PostgreSQL and MongoDB' });
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
        // Try Percona CRD first, then simple StatefulSet
        try {
          await k8s.k8sCustomApi.deleteNamespacedCustomObject({
            group: 'psmdb.percona.com', version: 'v1', namespace, plural: 'perconaservermongodbs', name,
          });
        } catch {
          // Simple StatefulSet deployment
          await k8s.k8sAppsApi.deleteNamespacedStatefulSet({ name, namespace }).catch(() => {});
          await k8s.k8sCoreApi.deleteNamespacedService({ name, namespace }).catch(() => {});
          await k8s.k8sCoreApi.deleteNamespacedSecret({ name: `${name}-credentials`, namespace }).catch(() => {});
        }
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

  // Migrate data from external database (e.g. Railway) into this database
  app.post<{ Params: { namespace: string; type: string; name: string }; Body: { sourceUri: string } }>('/api/databases/:namespace/:type/:name/migrate', {
    schema: {
      tags: ['Databases'],
      description: 'Migrate data from an external database (e.g. Railway, Atlas) into this database instance',
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
          sourceUri: { type: 'string', description: 'Database connection URI from Railway, Atlas, or other provider' },
        },
      },
      security: [{ bearerAuth: [] }],
    },
    preHandler: app.authenticate,
  }, async (request, reply) => {
    const user = request.user as { id: string; role?: string };
    const { namespace, type, name } = request.params;
    const { sourceUri } = request.body;

    if (type !== 'mongodb' && type !== 'postgresql') {
      return reply.status(400).send({ error: 'Migration is currently supported for MongoDB and PostgreSQL' });
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

    // Find the database pod — try multiple label selectors and fallback to name match
    let podName = '';
    const labelSelectors: string[] = [];
    if (type === 'mongodb') {
      // Percona MongoDB pod labels vary by version
      labelSelectors.push(
        `app.kubernetes.io/name=${name},app.kubernetes.io/component=rs0`,
        `app.kubernetes.io/instance=${name}`,
        `app=${name}-rs0`,
        `percona.com/cluster=${name}`,
      );
    } else if (type === 'postgresql') {
      labelSelectors.push(`cnpg.io/cluster=${name}`);
    }

    for (const ls of labelSelectors) {
      if (podName) break;
      try {
        const podsRes: any = await k8s.k8sCoreApi.listNamespacedPod({ namespace, labelSelector: ls });
        const items = podsRes.items || (podsRes.body && podsRes.body.items) || [];
        const running = items.find((p: any) => p.status?.phase === 'Running');
        podName = running?.metadata?.name || items[0]?.metadata?.name || '';
      } catch { /* try next selector */ }
    }

    // Fallback: list all pods and find one matching the database name
    if (!podName) {
      try {
        const podsRes: any = await k8s.k8sCoreApi.listNamespacedPod({ namespace });
        const items = podsRes.items || (podsRes.body && podsRes.body.items) || [];
        const running = items.find((p: any) =>
          p.status?.phase === 'Running' && (
            p.metadata?.name?.includes(name) ||
            p.metadata?.name?.startsWith(`${name}-`)
          )
        );
        podName = running?.metadata?.name || '';
      } catch { /* continue */ }
    }

    if (!podName) {
      const prettyName = type === 'mongodb' ? 'MongoDB' : 'PostgreSQL';
      return reply.status(404).send({
        error: `${prettyName} pod not found. Is the database running?`,
        hint: `No running pods found in namespace "${namespace}" matching database "${name}". Check the operator status and pod logs.`,
      });
    }

    try {
      const dumpDir = `/tmp/migration-${Date.now()}`;

      if (type === 'mongodb') {
        // MongoDB: mongodump + mongorestore — ALL steps in a single kubectl exec
        // Separate exec calls fail silently, so chain everything in one bash -c
        const targetUri = `mongodb://${vars.username}:${vars.password}@${vars.host}:${vars.port}/${vars.databaseName}?authSource=admin`;

        const script = [
          `rm -rf ${dumpDir}`,
          `mkdir -p ${dumpDir}`,
          `mongodump --uri='${sourceUri}' --out=${dumpDir} --gzip`,
          `rm -rf ${dumpDir}/admin ${dumpDir}/config ${dumpDir}/local`,
          `cd ${dumpDir} && for d in */; do n=$(basename "$d"); if [ "$n" != "${vars.databaseName}" ]; then mv "$n" ${vars.databaseName}; break; fi; done`,
          `mongorestore --uri='${targetUri}' --dir=${dumpDir} --gzip --drop 2>&1`,
          `rm -rf ${dumpDir}`,
        ].join(' && ');

        const output = execFileSync('kubectl', ['exec', '-n', namespace, podName, '--', 'bash', '-c', script], {
          encoding: 'utf-8',
          timeout: 300000,
          stdio: ['pipe', 'pipe', 'pipe'],
        });

        if (output.includes('0 document(s) restored successfully') || output.includes('no target database was specified')) {
          throw new Error('Migration completed but 0 documents were restored. Check source connection.');
        }
      } else if (type === 'postgresql') {
        // PostgreSQL: pg_dump + pg_restore — all in a single kubectl exec
        const dumpFile = `${dumpDir}/dump.sql`;
        const pgScript = [
          `mkdir -p ${dumpDir}`,
          `pg_dump '${sourceUri}' > ${dumpFile}`,
          `PGPASSWORD='${vars.password}' pg_restore -h ${vars.host} -p ${vars.port} -U ${vars.username} -d ${vars.databaseName} --clean --if-exists < ${dumpFile}`,
          `rm -rf ${dumpDir}`,
        ].join(' && ');
        execFileSync('kubectl', ['exec', '-n', namespace, podName, '--', 'bash', '-c', pgScript], {
          encoding: 'utf-8', timeout: 300000, stdio: ['pipe', 'pipe', 'pipe'],
        });
      }

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
      const toolName = type === 'mongodb' ? 'mongodump' : 'pg_dump';
      const restoreName = type === 'mongodb' ? 'mongorestore' : 'pg_restore';
      return reply.status(500).send({
        error: 'Migration failed',
        details: errMsg.includes(toolName) ? `Failed to dump data from source. Check your connection string.` :
                 errMsg.includes(restoreName) ? `Failed to restore data to target. Check if the target database is accessible.` :
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
        pvcTemplate: {
          storageClassName: 'local-path',
        },
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
  const rootPassword = `Pw_${Math.random().toString(36).slice(2, 10)}_${Math.random().toString(36).slice(2, 8)}`;

  // Create credentials secret
  await k8s.k8sCoreApi.createNamespacedSecret({
    namespace,
    body: {
      apiVersion: 'v1',
      kind: 'Secret',
      metadata: { name: `${name}-credentials`, namespace },
      type: 'Opaque',
      stringData: {
        MONGO_INITDB_ROOT_USERNAME: 'mongodb',
        MONGO_INITDB_ROOT_PASSWORD: rootPassword,
      },
    },
  });

  // Create StatefulSet with official mongo image (no Percona dependency)
  const statefulSet = {
    apiVersion: 'apps/v1',
    kind: 'StatefulSet',
    metadata: { name, namespace },
    spec: {
      serviceName: name,
      replicas: 1,
      selector: { matchLabels: { app: name } },
      template: {
        metadata: { labels: { app: name } },
        spec: {
          containers: [{
            name: 'mongod',
            image: 'mongo:6.0',
            ports: [{ containerPort: 27017 }],
            env: [
              { name: 'MONGO_INITDB_ROOT_USERNAME', valueFrom: { secretKeyRef: { name: `${name}-credentials`, key: 'MONGO_INITDB_ROOT_USERNAME' } } },
              { name: 'MONGO_INITDB_ROOT_PASSWORD', valueFrom: { secretKeyRef: { name: `${name}-credentials`, key: 'MONGO_INITDB_ROOT_PASSWORD' } } },
            ],
            volumeMounts: [{ name: 'data', mountPath: '/data/db' }],
            resources: {
              requests: { cpu: '250m', memory: '512Mi' },
              limits: { cpu: resources.cpu, memory: resources.memory },
            },
          }],
        },
      },
      volumeClaimTemplates: [{
        metadata: { name: 'data' },
        spec: {
          accessModes: ['ReadWriteOnce'],
          storageClassName: 'local-path',
          resources: { requests: { storage: resources.storage } },
        },
      }],
    },
  };

  await k8s.k8sAppsApi.createNamespacedStatefulSet({ namespace, body: statefulSet });

  // Create headless Service
  const service = {
    apiVersion: 'v1',
    kind: 'Service',
    metadata: { name, namespace },
    spec: {
      selector: { app: name },
      ports: [{ port: 27017, targetPort: 27017 }],
      clusterIP: 'None',
    },
  };

  await k8s.k8sCoreApi.createNamespacedService({ namespace, body: service });
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
      username = Buffer.from(data['username'] || '', 'base64').toString('utf-8') || 'postgres';
      password = Buffer.from(data['password'] || '', 'base64').toString('utf-8') || '';
      databaseName = Buffer.from(data['db-name'] || '', 'base64').toString('utf-8') || name;
      host = `${name}-rw.${namespace}.svc.cluster.local`;
      port = def.port;
    } else if (type === 'mongodb') {
      // Simple mongo StatefulSet: credentials in {name}-credentials secret
      try {
        const secret = await k8s.k8sCoreApi.readNamespacedSecret({ name: `${name}-credentials`, namespace });
        const data = secret.data || {};
        username = Buffer.from(data['MONGO_INITDB_ROOT_USERNAME'] || '', 'base64').toString('utf-8') || 'mongodb';
        password = Buffer.from(data['MONGO_INITDB_ROOT_PASSWORD'] || '', 'base64').toString('utf-8') || '';
      } catch {
        // Fallback: try Percona secrets
        try {
          const secret = await k8s.k8sCoreApi.readNamespacedSecret({ name: `${name}-cluster-admin-${name}`, namespace });
          const data = secret.data || {};
          username = Buffer.from(data['MONGODB_BACKUP_USER'] || data['MONGODB_USER'] || '', 'base64').toString('utf-8') || 'mongodb';
          password = Buffer.from(data['MONGODB_BACKUP_PASSWORD'] || data['MONGODB_PASSWORD'] || '', 'base64').toString('utf-8') || '';
        } catch {
          try {
            const secret = await k8s.k8sCoreApi.readNamespacedSecret({ name: `${name}-secrets`, namespace });
            const data = secret.data || {};
            username = Buffer.from(data['MONGODB_BACKUP_USER'] || '', 'base64').toString('utf-8') || 'mongodb';
            password = Buffer.from(data['MONGODB_BACKUP_PASSWORD'] || '', 'base64').toString('utf-8') || '';
          } catch { /* use defaults */ }
        }
      }
      host = `${name}.${namespace}.svc.cluster.local`;
      port = def.port;
    } else if (type === 'mysql') {
      // MySQL Operator stores credentials in {name}-secret
      const secret = await k8s.k8sCoreApi.readNamespacedSecret({ name: `${name}-secret`, namespace });
      const data = secret.data || {};
      username = Buffer.from(data['rootUser'] || '', 'base64').toString('utf-8') || 'root';
      password = Buffer.from(data['rootPassword'] || '', 'base64').toString('utf-8') || '';
      host = `${name}-router.${namespace}.svc.cluster.local`;
      port = def.port;
    } else if (type === 'redis') {
      // Spotahome Redis stores auth in {name}-auth secret (if configured)
      try {
        const secret = await k8s.k8sCoreApi.readNamespacedSecret({ name: `${name}-auth`, namespace });
        const data = secret.data || {};
        password = Buffer.from(data['password'] || '', 'base64').toString('utf-8') || '';
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
  const portForwardCmd = `kubectl port-forward -n ${namespace} svc/${type === 'postgresql' ? name + '-rw' : type === 'mongodb' ? name : type === 'mysql' ? name + '-router' : name} ${port}:${port}`;
  const externalConnectionString = buildConnectionString(type, 'localhost', port, username, password, databaseName);

  // Public Network: look up NodePort for external access
  let publicHost = '';
  let publicPort = 0;
  let publicConnectionString = '';
  try {
    const svcName = `${name}-rw-external`;
    const svc = await k8s.k8sCoreApi.readNamespacedService({ name: svcName, namespace });
    const nodePort = svc.spec?.ports?.[0]?.nodePort;
    if (nodePort) {
      publicHost = '172.105.49.201';
      publicPort = nodePort;
      publicConnectionString = buildConnectionString(type, publicHost, publicPort, username, password, databaseName);
    }
  } catch { /* no external service */ }

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
    publicHost,
    publicPort,
    publicConnectionString,
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

