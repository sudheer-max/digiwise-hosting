import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, Play, RefreshCw, Settings, Terminal, Database, Cpu, 
  HardDrive, Activity, Trash2, Key, CheckCircle, AlertTriangle, 
  ExternalLink, Github, Layers, Globe, Server, Code, ChevronRight, 
  Search, ShieldCheck, Check, Copy, Sliders, BarChart3, Clock, ArrowRight,
  Sparkles, X, Send, SlidersHorizontal
} from 'lucide-react';
import api from '../lib/api';

interface Service {
  id: string;
  name: string;
  type: 'web' | 'db' | 'vps' | 'redis';
  status: 'ACTIVE' | 'BUILDING' | 'OFFLINE';
  repo?: string;
  branch?: string;
  ip?: string;
  cpu: number;
  memory: string;
  uptime: string;
  port?: number;
  dbType?: string;
  created: string;
  projectId?: string;
  k8sNamespace?: string;
}

const initialServices: Service[] = [
  {
    id: 'web-frontend',
    name: 'retail-frontend',
    type: 'web',
    status: 'ACTIVE',
    repo: 'github.com/digiwise/retail-frontend',
    branch: 'main',
    cpu: 4,
    memory: '128 MB',
    uptime: '14d 6h',
    port: 3000,
    created: '2026-06-01'
  },
  {
    id: 'api-server',
    name: 'retail-backend-api',
    type: 'web',
    status: 'ACTIVE',
    repo: 'github.com/digiwise/retail-backend',
    branch: 'release/v2',
    cpu: 8,
    memory: '256 MB',
    uptime: '14d 6h',
    port: 8080,
    created: '2026-06-01'
  },
  {
    id: 'postgres-db',
    name: 'postgres-production',
    type: 'db',
    status: 'ACTIVE',
    dbType: 'PostgreSQL 16',
    cpu: 12,
    memory: '512 MB',
    uptime: '38d 12h',
    port: 5432,
    created: '2026-05-12'
  },
  {
    id: 'redis-cache',
    name: 'redis-memory-cache',
    type: 'redis',
    status: 'ACTIVE',
    dbType: 'Redis 7.2',
    cpu: 2,
    memory: '64 MB',
    uptime: '38d 12h',
    port: 6379,
    created: '2026-05-12'
  },
  {
    id: 'vps-linux-core',
    name: 'vps-ubuntu-core-01',
    type: 'vps',
    status: 'ACTIVE',
    ip: '142.250.190.46',
    cpu: 18,
    memory: '2048 MB',
    uptime: '92d 1h',
    created: '2026-03-20'
  }
];

const initialDbTables = {
  users: [
    { id: 1, name: 'Alice Smith', email: 'alice@domain.io', role: 'admin', created: '2026-01-10' },
    { id: 2, name: 'Bob Johnson', email: 'bob@domain.io', role: 'developer', created: '2026-02-15' },
    { id: 3, name: 'Charlie Brown', email: 'charlie@domain.io', role: 'guest', created: '2026-03-01' },
    { id: 4, name: 'Diana Prince', email: 'diana@amazon.com', role: 'developer', created: '2026-05-20' }
  ],
  products: [
    { id: 101, name: 'Cloud Compute Micro', price: 4.99, stock: 99 },
    { id: 102, name: 'Relational DB Node', price: 12.00, stock: 45 },
    { id: 103, name: 'Redis Cache Unit', price: 8.50, stock: 120 },
    { id: 104, name: 'NVMe Linux VPS Tier 1', price: 15.99, stock: 200 }
  ],
  deployments: [
    { id: 501, service: 'retail-frontend', duration: '42s', status: 'SUCCESS', author: 'suddymax0001' },
    { id: 502, service: 'retail-backend-api', duration: '1m 5s', status: 'SUCCESS', author: 'suddymax0001' },
    { id: 503, service: 'postgres-production', duration: '12s', status: 'STABLE', author: 'system' }
  ]
};

const initialVariables: { [key: string]: { key: string; value: string }[] } = {
  'web-frontend': [
    { key: 'VITE_API_URL', value: 'https://retail-backend-api.digiwise.app' },
    { key: 'NODE_ENV', value: 'production' },
    { key: 'PORT', value: '3000' }
  ],
  'api-server': [
    { key: 'DATABASE_URL', value: 'postgresql://postgres:********@postgres-production.digiwise.app:5432/retail' },
    { key: 'REDIS_URL', value: 'redis://:********@redis-memory-cache.digiwise.app:6379' },
    { key: 'JWT_SECRET', value: 'super-secret-auth-key-digiwise-node-2026' },
    { key: 'PORT', value: '8080' }
  ]
};

const initialLogs: { [key: string]: string[] } = {
  'web-frontend': [
    '[00:54:12] [vite] - Local dev server booted.',
    '[00:54:15] [vite] - Building client package bundle...',
    '[00:54:21] [vite] - Client HTML page rendered successfully.',
    '[00:54:22] [infra] - Route mapped: https://retail-frontend.digiwise.app -> Node 3000.',
    '[00:54:23] [infra] - Health check passed (HTTP 200). Status is active.',
  ],
  'api-server': [
    '[00:52:10] [node] - Initializing Express v5 server daemon...',
    '[00:52:11] [node] - Connecting to database client on port 5432...',
    '[00:52:12] [node] - PostgreSQL pool initialized. Max 20 concurrent connections.',
    '[00:52:13] [node] - Express listener listening on host 0.0.0.0, port 8080.',
    '[00:52:14] [infra] - Health check passed (HTTP 200).'
  ],
  'postgres-db': [
    '2026-07-19 00:00:01 UTC [system] - PostgreSQL 16 server daemon launched.',
    '2026-07-19 00:00:02 UTC [system] - Ready to accept client SSL TCP connections.',
    '2026-07-19 00:00:05 UTC [connection] - Established SSL channel for user "postgres" from host 10.2.14.99.',
    '2026-07-19 00:05:41 UTC [query] - VACUUM ANALYZE executed on retail.users.'
  ],
  'redis-cache': [
    '1:M 19 Jul 2026 00:00:01.120 * Running Redis server version 7.2.1',
    '1:M 19 Jul 2026 00:00:01.121 * Server initialized on TCP port 6379.',
    '1:M 19 Jul 2026 00:00:01.150 * DB loaded from disk: 0.002 seconds.',
    '1:M 19 Jul 2026 00:00:01.151 * Ready to accept Redis protocol connections.'
  ],
  'vps-linux-core': [
    'Welcome to Ubuntu 24.04 LTS (GNU/Linux 6.8.0-1008-gcp x86_64)',
    ' * Documentation:  https://help.ubuntu.com',
    ' * Support:        https://ubuntu.com/pro',
    'System load:  0.08               Processes:             112',
    'Usage of /:   18.4% of 19.56GB   IP address for eth0:   142.250.190.46',
    'Memory usage: 12%                Swap usage:            0%',
    'Last login: Sun Jul 19 00:15:32 2026 from 102.43.1.88'
  ]
};

export default function DashboardView({ onNavigate }: { onNavigate: (tabId: string) => void }) {
  const [services, setServices] = useState<Service[]>(initialServices);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const projects = await api.listProjects();
        if (!projects?.length) return;
        const mapped: Service[] = [];
        for (const p of projects.slice(0, 10)) {
          mapped.push({
            id: p.id,
            name: p.name,
            type: 'web',
            status: 'ACTIVE',
            cpu: 2,
            memory: '128 MB',
            uptime: 'N/A',
            created: p.createdAt?.slice(0, 10) || 'N/A',
            projectId: p.id,
            k8sNamespace: p.k8sNamespace,
          });
          try {
            const apps = await api.listApps(p.id);
            if (apps?.length) {
              for (const s of apps) {
                const st = (s.status || 'IDLE').toUpperCase();
                mapped.push({
                  id: s.name,
                  name: s.name,
                  type: 'web',
                  status: st === 'RUNNING' || st === 'DONE' || st === 'ACTIVE' ? 'ACTIVE' : st === 'IDLE' || st === 'STOPPED' ? 'OFFLINE' : 'BUILDING',
                  cpu: 2,
                  memory: '128 MB',
                  uptime: 'N/A',
                  port: s.port || undefined,
                  created: s.createdAt?.slice(0, 10) || 'N/A',
                  projectId: p.id,
                  k8sNamespace: p.k8sNamespace,
                });
              }
            }
          } catch {}
        }
        if (mapped.length > 0) setServices(mapped);
      } catch {}
    })();
  }, []);

  useEffect(() => {
    (async () => {
      if (!selectedServiceId) return;
      const svc = services.find(s => s.id === selectedServiceId);
      if (!svc?.projectId || !svc?.name) return;
      try {
        const res = await api.getAppLogs(svc.projectId, svc.name, 100);
        if (res?.logs?.length) {
          setServiceLogs(prev => ({
            ...prev,
            [svc.id]: res.logs.map((l: any) => typeof l === 'string' ? l : JSON.stringify(l))
          }));
        }
      } catch {}
    })();
  }, [selectedServiceId]);

  const [activeConsoleTab, setActiveConsoleTab] = useState<'deploys' | 'variables' | 'metrics' | 'terminal' | 'database' | 'redis' | 'settings'>('deploys');
  
  const [isNewServiceModalOpen, setIsNewServiceModalOpen] = useState(false);
  const [newServiceName, setNewServiceName] = useState('');
  const [newServiceType, setNewServiceType] = useState<'web' | 'db' | 'vps' | 'redis'>('web');
  const [newServiceRepo, setNewServiceRepo] = useState('');
  const [newServiceDbType, setNewServiceDbType] = useState('PostgreSQL 16');
  
  const [variables, setVariables] = useState<{ [key: string]: { key: string; value: string }[] }>(initialVariables);
  const [newVarKey, setNewVarKey] = useState('');
  const [newVarVal, setNewVarVal] = useState('');
  
  const [dbData, setDbData] = useState<any>(initialDbTables);
  const [activeDbTable, setActiveDbTable] = useState<'users' | 'products' | 'deployments'>('users');
  const [sqlQueryInput, setSqlQueryInput] = useState('SELECT * FROM ' + activeDbTable + ';');
  const [sqlQueryResult, setSqlQueryResult] = useState<string | null>(null);
  const [userForm, setUserForm] = useState({ name: '', email: '', role: 'developer' });
  const [productForm, setProductForm] = useState({ name: '', price: 0, stock: 100 });
  const [deploymentForm, setDeploymentForm] = useState({ service: 'retail-frontend', duration: '30s', status: 'SUCCESS', author: 'user' });

  const [redisConsoleHistory, setRedisConsoleHistory] = useState<{ command: string; output: string }[]>([
    { command: 'INFO', output: '# Server\nredis_version:7.2.1\nuptime_in_seconds:3283200\nconnected_clients:3' }
  ]);
  const [redisCmdInput, setRedisCmdInput] = useState('');
  const [redisMemory, setRedisMemory] = useState<{ [key: string]: string }>({
    'session_token:abc123xyz': '{"uid": 4, "role": "developer"}',
    'cache:home_products': '[{"id":101,"name":"Cloud Compute Micro"}]',
    'rate_limit:10.2.14.99': '14'
  });

  const [vpsConsoleHistory, setVpsConsoleHistory] = useState<{ command: string; output: string }[]>([
    { command: '', output: 'Welcome to DigiWise VPS Cloud Environment v1.0\nType "help" to list available infrastructure commands.' }
  ]);
  const [vpsCmdInput, setVpsCmdInput] = useState('');

  const [serviceLogs, setServiceLogs] = useState<{ [key: string]: string[] }>(initialLogs);
  const [isBuilding, setIsBuilding] = useState(false);
  const [buildLogs, setBuildLogs] = useState<string[]>([]);
  const logEndRef = useRef<HTMLDivElement>(null);

  const [liveMetrics, setLiveMetrics] = useState({
    cpu: 12,
    ram: 4.2,
    bandwidth: 850
  });

  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [buildLogs, vpsConsoleHistory, redisConsoleHistory]);

  useEffect(() => {
    const timer = setInterval(() => {
      setLiveMetrics(prev => {
        const deltaCpu = (Math.random() - 0.5) * 4;
        const newCpu = Math.max(2, Math.min(95, parseFloat((prev.cpu + deltaCpu).toFixed(1))));
        const deltaRam = (Math.random() - 0.5) * 0.1;
        const newRam = Math.max(1.5, Math.min(7.9, parseFloat((prev.ram + deltaRam).toFixed(2))));
        const newBandwidth = prev.bandwidth + parseFloat((Math.random() * 0.5).toFixed(2));
        return {
          cpu: newCpu,
          ram: newRam,
          bandwidth: parseFloat(newBandwidth.toFixed(2))
        };
      });
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setSqlQueryInput(`SELECT * FROM ${activeDbTable};`);
    setSqlQueryResult(null);
  }, [activeDbTable]);

  const handleSelectService = (serviceId: string) => {
    setSelectedServiceId(serviceId);
    const service = services.find(s => s.id === serviceId);
    if (!service) return;
    if (service.type === 'db') setActiveConsoleTab('database');
    else if (service.type === 'redis') setActiveConsoleTab('redis');
    else if (service.type === 'vps') setActiveConsoleTab('terminal');
    else setActiveConsoleTab('deploys');
  };

  const handleRedeploy = async (serviceId: string) => {
    const service = services.find(s => s.id === serviceId);
    if (!service) return;
    setIsBuilding(true);
    setActiveConsoleTab('deploys');
    setBuildLogs([]);
    if (service.projectId && service.name && service.type === 'web') {
      try { await api.restartApp(service.projectId, service.name); } catch {}
    }
    const steps = [
      `[info] Preparing deployment pipeline for ${service.name}...`,
      `[info] Synchronized latest commits from GitHub repository branch: ${service.branch || 'main'}`,
      '[info] Pulling base docker runtime container image (node:20-alpine)...',
      '[build] yarn install v1.22.19',
      '[build] [1/4] Resolving packages...',
      '[build] [2/4] Fetching packages...',
      '[build] [3/4] Linking dependencies...',
      '[build] [4/4] Building fresh production assets...',
      '[build] vite v5.1.4 building for production...',
      '[build] transform... [====================] 100%',
      '[build] dist/index.html                     0.45 KiB',
      '[build] dist/assets/index-D7A31F4.js       184.22 KiB',
      '[build] dist/assets/index-B1F34C2.css       38.90 KiB',
      '[build] Done in 2.12s.',
      '[infra] Initializing cluster container image verification check...',
      `[infra] Routing port ${service.port || 3000} allocation block...`,
      '[infra] Dispatching server container health audit...',
      '[infra] STATUS CHECK: OK. HTTP 200 returned on path "/"',
      '[infra] Deployed successfully to DigiWise Edge cluster!',
      `[infra] Host mapped: https://${service.name}.digiwise.app`
    ];
    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep < steps.length) {
        setBuildLogs(prev => [...prev, steps[currentStep]]);
        currentStep++;
      } else {
        clearInterval(interval);
        setIsBuilding(false);
        setServices(prev => prev.map(s => s.id === serviceId ? { ...s, status: 'ACTIVE', uptime: '1m' } : s));
        setServiceLogs(prev => ({
          ...prev,
          [serviceId]: [
            `[${new Date().toLocaleTimeString()}] Deployment refreshed via system redeploy action.`,
            ...steps,
            ...prev[serviceId]
          ]
        }));
      }
    }, 400);
  };

  const handleAddVariable = (serviceId: string) => {
    if (!newVarKey.trim() || !newVarVal.trim()) return;
    const currentVars = variables[serviceId] || [];
    const exists = currentVars.some(v => v.key === newVarKey);
    const updatedVars = exists
      ? currentVars.map(v => v.key === newVarKey ? { key: newVarKey, value: newVarVal } : v)
      : [...currentVars, { key: newVarKey, value: newVarVal }];
    setVariables({ ...variables, [serviceId]: updatedVars });
    setNewVarKey('');
    setNewVarVal('');
  };

  const handleRemoveVariable = (serviceId: string, key: string) => {
    const updatedVars = (variables[serviceId] || []).filter(v => v.key !== key);
    setVariables({ ...variables, [serviceId]: updatedVars });
  };

  const handleCreateService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newServiceName.trim()) return;
    const formattedName = newServiceName.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    const newId = `service-${Date.now()}`;
    let createdProjectId: string | undefined;
    let createdNamespace: string | undefined;
    if (newServiceType === 'web') {
      try {
        const proj: any = await api.createProject({ name: formattedName });
        const created = proj?.project || proj;
        createdProjectId = created?.id; createdNamespace = created?.k8sNamespace;
        try {
          await api.createApp(createdProjectId!, { name: formattedName, image: newServiceRepo || 'node:20-alpine', port: 3000, env: { PORT: '3000', NODE_ENV: 'production' } });
        } catch {}
      } catch {}
    } else if (newServiceType === 'db') {
      try {
        const proj: any = await api.createProject({ name: formattedName });
        const created = proj?.project || proj;
        createdProjectId = created?.id; createdNamespace = created?.k8sNamespace;
        try {
          await api.createDatabase({ type: newServiceDbType.includes('Postgres') ? 'postgresql' : newServiceDbType.includes('Mongo') ? 'mongodb' : 'redis', name: formattedName, namespace: createdNamespace || 'default' });
        } catch {}
      } catch {}
    }
    const newlyCreated: Service = {
      id: newId, name: formattedName, type: newServiceType, status: 'ACTIVE',
      cpu: newServiceType === 'vps' ? 16 : newServiceType === 'db' ? 12 : 4,
      memory: newServiceType === 'vps' ? '1024 MB' : newServiceType === 'db' ? '512 MB' : '128 MB',
      uptime: '0m', created: new Date().toISOString().split('T')[0],
      projectId: createdProjectId, k8sNamespace: createdNamespace,
      ...(newServiceType === 'web' && { repo: newServiceRepo || `github.com/user/${formattedName}`, branch: 'main', port: 3000 }),
      ...(newServiceType === 'db' && { dbType: newServiceDbType, port: newServiceDbType.includes('Postgres') ? 5432 : 3306 }),
      ...(newServiceType === 'redis' && { dbType: 'Redis 7.2', port: 6379 }),
      ...(newServiceType === 'vps' && { ip: `142.250.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}` })
    };
    setServices([...services, newlyCreated]);
    setServiceLogs({ ...serviceLogs, [newId]: [
      `[${new Date().toLocaleTimeString()}] Provisioning initiated for node: ${formattedName}`,
      `[${new Date().toLocaleTimeString()}] Resources successfully bound: ${newlyCreated.cpu} vCPUs, ${newlyCreated.memory} RAM.`,
      `[${new Date().toLocaleTimeString()}] System status changed to: ACTIVE`
    ]});
    if (newServiceType === 'web') { setVariables({ ...variables, [newId]: [{ key: 'PORT', value: '3000' }, { key: 'NODE_ENV', value: 'production' }] }); }
    setIsNewServiceModalOpen(false); setNewServiceName(''); setNewServiceRepo(''); setSelectedServiceId(newId); handleSelectService(newId);
  };

  const handleDeleteService = async (serviceId: string) => {
    if (confirm('Are you absolutely sure you want to completely delete and decommission this service? All data will be lost.')) {
      const svc = services.find(s => s.id === serviceId);
      if (svc?.projectId) {
        try {
          if (svc.type === 'web' && svc.name) await api.deleteApp(svc.projectId, svc.name);
          await api.deleteProject(svc.projectId);
        } catch {}
      }
      setServices(services.filter(s => s.id !== serviceId));
      setSelectedServiceId(null);
    }
  };
  const handleVpsCommandSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vpsCmdInput.trim()) return;
    const cmd = vpsCmdInput.trim();
    let output = '';
    const lowerCmd = cmd.toLowerCase();
    if (lowerCmd === 'help') {
      output = `Available system infrastructure utilities:\n  help               Show this core help summary\n  ls                 List active workspace file system paths\n  cat <file>         Print code parameters of a workspace file\n  top                Show real-time active core kernel CPU/RAM workloads\n  df -h              Examine current solid state NVMe storage margins\n  whoami             Report logged-in system user authority\n  docker ps          Analyze running containerized micro-processes\n  ping -c 3 <host>   Perform high-frequency network route latency test\n  clear              Purge console display rows`;
    } else if (lowerCmd === 'ls') {
      output = `drwxr-xr-x   4 root  root   4096 Jul 19 00:00 app\ndrwxr-xr-x   2 root  root   4096 Jul 19 00:00 database\n-rw-r--r--   1 root  root    512 Jul 19 00:00 package.json\n-rw-r--r--   1 root  root   2048 Jul 19 00:00 server.ts\ndrwxr-xr-x  85 root  root   4096 Jul 19 00:05 node_modules`;
    } else if (lowerCmd === 'clear') {
      setVpsConsoleHistory([]); setVpsCmdInput(''); return;
    } else if (lowerCmd.startsWith('cat ')) {
      const file = cmd.substring(4).trim();
      if (file === 'package.json') { output = '{\n  "name": "digiwise-infra-node",\n  "version": "2.4.0",\n  "private": true,\n  "type": "module",\n  "scripts": {\n    "dev": "tsx server.ts",\n    "build": "vite build",\n    "start": "node dist/server.cjs"\n  },\n  "dependencies": {\n    "express": "^5.0.0",\n    "pg": "^8.11.0",\n    "redis": "^4.6.0"\n  }\n}';
      } else if (file === 'server.ts') { output = 'import express from "express";\nconst app = express();\nconst PORT = process.env.PORT || 3000;\n\napp.get("/api/health", (req, res) => {\n  res.json({ status: "healthy", database: "connected" });\n});\n\napp.listen(PORT, "0.0.0.0", () => {\n  console.log("Server listening on port " + PORT);\n});';
      } else { output = `cat: ${file}: No such file or directory in active context.`; }
    } else if (lowerCmd === 'top') {
      output = `Tasks: 112 total,   2 running, 110 sleeping,   0 stopped\n%Cpu(s):  ${liveMetrics.cpu}%us,  2.1%sy,  0.0%ni, 91.2%id\nMiB Mem :   2048.0 total,    412.5 free,   1250.2 used,    385.3 buff/cache\n\n  PID USER      PR  NI    VIRT    RES    SHR S  %CPU  %MEM     TIME+ COMMAND\n 3205 root      20   0  712421  85104  32041 R   4.2   4.1   0:12.45 node\n 3211 root      20   0  114250  12410   8420 S   1.8   0.6   0:08.12 postgres\n 1408 root      20   0   42145   3110   1210 S   0.0   0.1   0:00.15 redis-server\n 4511 root      20   0   14102   2410   1810 R   0.1   0.1   0:00.02 top`;
    } else if (lowerCmd === 'df -h') {
      output = 'Filesystem      Size  Used Avail Use% Mounted on\n/dev/nvme0n1p1   20G  3.6G   16G  19% /\ntmpfs           1.0G     0  1.0G   0% /dev/shm\n/dev/nvme0n1p15 124M  12M   112M  10% /boot/efi';
    } else if (lowerCmd === 'whoami') { output = 'root';
    } else if (lowerCmd === 'docker ps') {
      output = 'CONTAINER ID   IMAGE                 COMMAND                  CREATED        STATUS        PORTS                    NAMES\na8e527d95311   node:20-alpine        "docker-entrypoint.s..."   2 hours ago    Up 2 hours    0.0.0.0:3000->3000/tcp   retail-frontend\nf231e5f884a1   node:20-alpine        "docker-entrypoint.s..."   2 hours ago    Up 2 hours    0.0.0.0:8080->8080/tcp   retail-backend-api\nd7a12b45e999   postgres:16-alpine    "docker-entrypoint.s..."   5 hours ago    Up 5 hours    0.0.0.0:5432->5432/tcp   postgres-production';
    } else if (lowerCmd.startsWith('ping ')) {
      output = `PING ${cmd.split(' ')[1] || 'google.com'} (142.250.190.46) 56(84) bytes of data.\n64 bytes from 142.250.190.46: icmp_seq=1 ttl=118 time=8.41 ms\n64 bytes from 142.250.190.46: icmp_seq=2 ttl=118 time=8.10 ms\n64 bytes from 142.250.190.46: icmp_seq=3 ttl=118 time=8.53 ms\n\n--- google.com ping statistics ---\n3 packets transmitted, 3 received, 0% packet loss, time 2003ms\nrtt min/avg/max/mdev = 8.102/8.347/8.532/0.176 ms`;
    } else { output = `bash: command not found: ${cmd}. Type "help" to view the cloud system utility dictionary.`; }
    setVpsConsoleHistory(prev => [...prev, { command: cmd, output }]);
    setVpsCmdInput('');
  };

  const handleRedisCommandSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!redisCmdInput.trim()) return;
    const cmd = redisCmdInput.trim();
    const parts = cmd.split(' ');
    const mainAction = parts[0].toUpperCase();
    let output = '';
    if (mainAction === 'HELP') {
      output = 'Available Redis command simulations:\n  SET <key> <val>    Set value of key parameter\n  GET <key>          Retrieve value of target key\n  KEYS *             List all key allocations inside the cache index\n  DEL <key>          Erase target key parameter\n  FLUSHALL           Purge memory cache database completely\n  INFO               Retrieve memory profile analytics';
    } else if (mainAction === 'SET') {
      if (parts.length < 3) { output = "(error) ERR wrong number of arguments for 'set' command"; }
      else { const key = parts[1]; const val = parts.slice(2).join(' '); setRedisMemory(prev => ({ ...prev, [key]: val })); output = 'OK'; }
    } else if (mainAction === 'GET') {
      if (parts.length < 2) { output = "(error) ERR wrong number of arguments for 'get' command"; }
      else { const key = parts[1]; const val = redisMemory[key]; output = val !== undefined ? `"${val}"` : '(nil)'; }
    } else if (mainAction === 'KEYS') {
      if (parts[1] !== '*') { output = '(error) ERR only pattern "*" is supported in simulation'; }
      else { const keys = Object.keys(redisMemory); output = keys.length === 0 ? '(empty array)' : keys.map((k, i) => `${i + 1}) "${k}"`).join('\n'); }
    } else if (mainAction === 'DEL') {
      if (parts.length < 2) { output = "(error) ERR wrong number of arguments for 'del' command"; }
      else {
        const key = parts[1];
        if (redisMemory[key] !== undefined) { setRedisMemory(prev => { const next = { ...prev }; delete next[key]; return next; }); output = '(integer) 1'; }
        else { output = '(integer) 0'; }
      }
    } else if (mainAction === 'FLUSHALL') { setRedisMemory({}); output = 'OK';
    } else if (mainAction === 'INFO') {
      output = `# Memory\nused_memory:${Object.keys(redisMemory).length * 128}\nused_memory_human:${(Object.keys(redisMemory).length * 0.12).toFixed(2)}K\ntotal_system_memory:67108864\ntotal_system_memory_human:64M\n# Keyspace\ndb0:keys=${Object.keys(redisMemory).length},expires=0,avg_ttl=0`;
    } else { output = `(error) ERR unknown command '${parts[0]}', with args beginning with: ${parts.slice(1).join(' ')}`; }
    setRedisConsoleHistory(prev => [...prev, { command: cmd, output }]);
    setRedisCmdInput('');
  };

  const handleRunSqlQuery = (e: React.FormEvent) => {
    e.preventDefault();
    const query = sqlQueryInput.trim().toLowerCase();
    if (!query) return;
    if (query.startsWith('select * from users')) { setSqlQueryResult(JSON.stringify(dbData.users, null, 2)); }
    else if (query.startsWith('select * from products')) { setSqlQueryResult(JSON.stringify(dbData.products, null, 2)); }
    else if (query.startsWith('select * from deployments')) { setSqlQueryResult(JSON.stringify(dbData.deployments, null, 2)); }
    else if (query.startsWith('select count(*)')) {
      const count = query.includes('users') ? dbData.users.length : query.includes('products') ? dbData.products.length : dbData.deployments.length;
      setSqlQueryResult(JSON.stringify([{ count }], null, 2));
    } else {
      setSqlQueryResult(JSON.stringify({ error: "SQL Execution Error", message: "This SQL simulator supports standard read requests like 'SELECT * FROM users;', 'SELECT * FROM products;', and 'SELECT * FROM deployments;'." }, null, 2));
    }
  };

  const handleAddUserRow = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userForm.name || !userForm.email) return;
    const newRecord = { id: dbData.users.length + 1, name: userForm.name, email: userForm.email, role: userForm.role, created: new Date().toISOString().split('T')[0] };
    setDbData({ ...dbData, users: [...dbData.users, newRecord] });
    setUserForm({ name: '', email: '', role: 'developer' }); setSqlQueryResult(null);
  };

  const handleAddProductRow = (e: React.FormEvent) => {
    e.preventDefault();
    if (!productForm.name || productForm.price <= 0) return;
    const newRecord = { id: 100 + dbData.products.length + 1, name: productForm.name, price: parseFloat(productForm.price.toString()), stock: parseInt(productForm.stock.toString()) };
    setDbData({ ...dbData, products: [...dbData.products, newRecord] });
    setProductForm({ name: '', price: 0, stock: 100 }); setSqlQueryResult(null);
  };

  const handleAddDeploymentRow = (e: React.FormEvent) => {
    e.preventDefault();
    const newRecord = { id: 500 + dbData.deployments.length + 1, service: deploymentForm.service, duration: deploymentForm.duration, status: deploymentForm.status, author: deploymentForm.author };
    setDbData({ ...dbData, deployments: [...dbData.deployments, newRecord] });
    setDeploymentForm({ service: 'retail-frontend', duration: '30s', status: 'SUCCESS', author: 'user' }); setSqlQueryResult(null);
  };

  const handleDeleteDbRow = (table: 'users' | 'products' | 'deployments', id: number) => {
    setDbData({ ...dbData, [table]: dbData[table].filter((row: any) => row.id !== id) }); setSqlQueryResult(null);
  };

  const selectedService = services.find(s => s.id === selectedServiceId) || null;

  return (
    <div className="animate-fade-in p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto font-sans bg-[#f9fafb] text-slate-800">
      
      {/* 1. TOP HEADER & SUMMARY ROW */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-100 px-2 py-0.5 border border-slate-200">CLUSTER ACTIVE</span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 border border-emerald-200 flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-none bg-emerald-500 animate-pulse"></span>
              SLA 100% OPERATIONAL
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 font-display tracking-tight mt-1.5">Production Workspace: Cluster Alpha</h1>
          <p className="text-slate-500 text-xs mt-1">Zero-Trust virtualization layer managing enterprise repos, storage volumes, and VPS instances.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setIsNewServiceModalOpen(true)} className="bg-[#00459c] text-white hover:bg-[#003882] font-bold text-xs uppercase tracking-wider px-4 py-2.5 transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer">
            <Plus className="w-4 h-4" /> New Service
          </button>
        </div>
      </div>

      {/* 2. REALTIME HARDWARE BENTO MATRIX */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white border border-slate-200 p-5 shadow-sm">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1"><Cpu className="w-3.5 h-3.5" /> CLUSTER VCPU THREADS</span>
            <span className="text-xs font-mono font-bold text-slate-900 bg-slate-50 px-1.5 py-0.5 border border-slate-100">{liveMetrics.cpu}% LOAD</span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 mt-2"><div className="bg-[#00459c] h-1.5 transition-all duration-500" style={{ width: `${liveMetrics.cpu}%` }}></div></div>
          <div className="flex justify-between text-[9px] text-slate-400 font-bold mt-2 uppercase tracking-wide"><span>Thread Pools</span><span>Uptime: Stable</span></div>
        </div>
        <div className="bg-white border border-slate-200 p-5 shadow-sm">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1"><Layers className="w-3.5 h-3.5" /> RAM CONSUMPTION</span>
            <span className="text-xs font-mono font-bold text-[#00459c] bg-[#00459c]/5 px-1.5 py-0.5 border border-[#00459c]/10">{liveMetrics.ram} GB / 8.00 GB</span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 mt-2"><div className="bg-cyan-500 h-1.5 transition-all duration-500" style={{ width: `${(liveMetrics.ram / 8.0) * 100}%` }}></div></div>
          <div className="flex justify-between text-[9px] text-slate-400 font-bold mt-2 uppercase tracking-wide"><span>SSD SWAP SWIFT</span><span>PROVISIONED TIER 1</span></div>
        </div>
        <div className="bg-white border border-slate-200 p-5 shadow-sm">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1"><Activity className="w-3.5 h-3.5" /> MONTHLY DATA BANDWIDTH</span>
            <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 border border-emerald-100">{liveMetrics.bandwidth.toFixed(2)} GB</span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 mt-2"><div className="bg-emerald-500 h-1.5 transition-all duration-500" style={{ width: '45%' }}></div></div>
          <div className="flex justify-between text-[9px] text-slate-400 font-bold mt-2 uppercase tracking-wide"><span>SLA BOUND: 2000 GB</span><span>NODE EGRESS OK</span></div>
        </div>
      </div>

      {/* 3. SERVICE GRID */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-sm font-extrabold uppercase tracking-widest text-slate-400">Active Infrastructure Services ({services.length})</h2>
          <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Click on a service node to open its management console</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {services.map((service) => {
            const isSelected = selectedServiceId === service.id;
            const isWeb = service.type === 'web'; const isDb = service.type === 'db'; const isRedis = service.type === 'redis'; const isVps = service.type === 'vps';
            return (
              <div key={service.id} onClick={() => handleSelectService(service.id)} className={`bg-white border p-4 cursor-pointer transition-all relative flex flex-col justify-between h-40 ${isSelected ? 'border-[#00459c] ring-2 ring-[#00459c]/5 bg-white shadow-md' : 'border-slate-200 hover:border-slate-400 hover:shadow-sm'}`}>
                <div className="absolute top-4 right-4 flex items-center gap-1.5"><span className={`h-2.5 w-2.5 ${service.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`}></span></div>
                <div>
                  <div className="flex items-center gap-2 text-[#00459c]">
                    {isWeb && <Code className="w-4 h-4" />}
                    {isDb && <Database className="w-4 h-4 text-[#00459c]" />}
                    {isRedis && <Layers className="w-4 h-4 text-rose-500" />}
                    {isVps && <Server className="w-4 h-4 text-amber-500" />}
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{service.type.toUpperCase()}</span>
                  </div>
                  <h3 className="font-extrabold text-slate-900 text-sm mt-2 truncate leading-tight">{service.name}</h3>
                  <p className="text-[10px] text-slate-400 font-mono mt-1 truncate">
                    {isWeb && service.repo} {isDb && service.dbType} {isRedis && 'Redis Instance'} {isVps && `IP: ${service.ip}`}
                  </p>
                </div>
                <div className="border-t border-slate-100 pt-2 mt-2 flex justify-between items-center text-[10px] text-slate-500 font-mono"><span>CPU: {service.cpu} vCPU</span><span>{service.uptime}</span></div>
              </div>
            );
          })}
          <div onClick={() => setIsNewServiceModalOpen(true)} className="border-2 border-dashed border-slate-300 p-4 hover:border-[#00459c] hover:bg-slate-50 transition-all flex flex-col justify-center items-center h-40 cursor-pointer group text-center">
            <Plus className="w-6 h-6 text-slate-400 group-hover:text-[#00459c] mb-1.5" />
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider group-hover:text-[#00459c]">Add Service Node</span>
            <p className="text-[10px] text-slate-400 mt-1 max-w-[150px]">Deploy repo, Postgres database, Redis, or OS container</p>
          </div>
        </div>
      </div>

      {/* 4. DETAIL DRAWER */}
      {selectedService ? (
        <div className="bg-white border border-slate-200 shadow-sm animate-fade-in">
          <div className="border-b border-slate-200 bg-slate-50/70 p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white border border-slate-200 text-[#00459c]">
                {selectedService.type === 'web' && <Code className="w-5 h-5" />}
                {selectedService.type === 'db' && <Database className="w-5 h-5" />}
                {selectedService.type === 'redis' && <Layers className="w-5 h-5 text-rose-500" />}
                {selectedService.type === 'vps' && <Server className="w-5 h-5 text-amber-500" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-900 font-display">{selectedService.name}</h2>
                  <span className={`text-[10px] font-bold px-2 py-0.5 border ${selectedService.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>{selectedService.status}</span>
                </div>
                <p className="text-slate-400 text-xs mt-0.5">Node UUID: {selectedService.id} &middot; Created on {selectedService.created}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {selectedService.type === 'web' && (
                <button onClick={() => handleRedeploy(selectedService.id)} disabled={isBuilding} className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider px-3.5 py-2 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50">
                  <RefreshCw className={`w-3.5 h-3.5 ${isBuilding ? 'animate-spin' : ''}`} /> {isBuilding ? 'Building...' : 'Redeploy'}
                </button>
              )}
              <button onClick={() => handleDeleteService(selectedService.id)} className="bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 font-bold text-xs uppercase tracking-wider px-3.5 py-2 transition-colors flex items-center gap-1.5 cursor-pointer">
                <Trash2 className="w-3.5 h-3.5" /> Decommission
              </button>
            </div>
          </div>

          {/* Tab Selectors */}
          <div className="border-b border-slate-200 px-6 flex flex-wrap gap-1 bg-slate-50/30">
            {selectedService.type === 'web' && (<><button onClick={() => setActiveConsoleTab('deploys')} className={`px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${activeConsoleTab === 'deploys' ? 'text-[#00459c] border-[#00459c]' : 'text-slate-500 border-transparent hover:text-slate-800 hover:border-slate-200'}`}>Deploy Logs</button><button onClick={() => setActiveConsoleTab('variables')} className={`px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${activeConsoleTab === 'variables' ? 'text-[#00459c] border-[#00459c]' : 'text-slate-500 border-transparent hover:text-slate-800 hover:border-slate-200'}`}>Environment Variables</button><button onClick={() => setActiveConsoleTab('settings')} className={`px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${activeConsoleTab === 'settings' ? 'text-[#00459c] border-[#00459c]' : 'text-slate-500 border-transparent hover:text-slate-800 hover:border-slate-200'}`}>Domain & Settings</button></>)}
            {selectedService.type === 'db' && (<><button onClick={() => setActiveConsoleTab('database')} className={`px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${activeConsoleTab === 'database' ? 'text-[#00459c] border-[#00459c]' : 'text-slate-500 border-transparent hover:text-slate-800 hover:border-slate-200'}`}>Data Table Explorer</button><button onClick={() => setActiveConsoleTab('settings')} className={`px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${activeConsoleTab === 'settings' ? 'text-[#00459c] border-[#00459c]' : 'text-slate-500 border-transparent hover:text-slate-800 hover:border-slate-200'}`}>Instance Parameters</button></>)}
            {selectedService.type === 'redis' && (<><button onClick={() => setActiveConsoleTab('redis')} className={`px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${activeConsoleTab === 'redis' ? 'text-[#00459c] border-[#00459c]' : 'text-slate-500 border-transparent hover:text-slate-800 hover:border-slate-200'}`}>Redis CLI Shell</button><button onClick={() => setActiveConsoleTab('settings')} className={`px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${activeConsoleTab === 'settings' ? 'text-[#00459c] border-[#00459c]' : 'text-slate-500 border-transparent hover:text-slate-800 hover:border-slate-200'}`}>Redis Profile</button></>)}
            {selectedService.type === 'vps' && (<><button onClick={() => setActiveConsoleTab('terminal')} className={`px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${activeConsoleTab === 'terminal' ? 'text-[#00459c] border-[#00459c]' : 'text-slate-500 border-transparent hover:text-slate-800 hover:border-slate-200'}`}>SSH Terminal (bash)</button><button onClick={() => setActiveConsoleTab('settings')} className={`px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${activeConsoleTab === 'settings' ? 'text-[#00459c] border-[#00459c]' : 'text-slate-500 border-transparent hover:text-slate-800 hover:border-slate-200'}`}>Virtual HW Tiers</button></>)}
          </div>

          {/* Tab Content */}
          <div className="p-6">

            {/* DEPLOYS TAB */}
            {activeConsoleTab === 'deploys' && selectedService.type === 'web' && (
              <div className="space-y-6">
                {isBuilding ? (
                  <div className="bg-slate-900 text-slate-100 p-5 font-mono text-[11px] leading-relaxed border border-slate-800 space-y-1.5 h-80 overflow-y-auto">
                    <div className="text-[#00aa00] font-bold">[BUILD PIPELINE TRIGGERED]</div>
                    {buildLogs.map((log, idx) => (<div key={idx}>{log}</div>))}
                    <div ref={logEndRef} />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-4">
                      <div className="flex justify-between items-center">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Container Logs</h4>
                        <span className="text-[10px] font-mono text-slate-400 uppercase">Auto-scroll Enabled</span>
                      </div>
                      <div className="bg-slate-950 text-slate-200 p-5 font-mono text-[11px] leading-relaxed border border-slate-900 space-y-1.5 h-64 overflow-y-auto">
                        {(serviceLogs[selectedService.id] || []).map((log, idx) => (
                          <div key={idx} className={log.includes('[build]') ? 'text-amber-300' : log.includes('[infra]') ? 'text-cyan-300' : 'text-slate-300'}>{log}</div>
                        ))}
                      </div>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 p-5 space-y-4">
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200 pb-2 flex items-center gap-1.5"><Clock className="w-4 h-4 text-slate-400" /> Commit Deployment History</h4>
                      <div className="space-y-3">
                        <div className="flex items-start gap-3 text-xs"><div className="h-5 w-5 bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[9px] mt-0.5">OK</div><div><span className="font-bold text-slate-800">Update index.html typography</span><p className="text-[10px] text-slate-400 font-mono mt-0.5">SHA: c4a31f2 &middot; By Jane Doe</p></div></div>
                        <div className="flex items-start gap-3 text-xs"><div className="h-5 w-5 bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[9px] mt-0.5">OK</div><div><span className="font-bold text-slate-800">Configure router fallback paths</span><p className="text-[10px] text-slate-400 font-mono mt-0.5">SHA: b110ac1 &middot; By suddymax0001</p></div></div>
                        <div className="flex items-start gap-3 text-xs"><div className="h-5 w-5 bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[9px] mt-0.5">OK</div><div><span className="font-bold text-slate-800">Initial repository bind setup</span><p className="text-[10px] text-slate-400 font-mono mt-0.5">SHA: f4d8173 &middot; By system</p></div></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* VARIABLES TAB */}
            {activeConsoleTab === 'variables' && selectedService.type === 'web' && (
              <div className="space-y-6">
                <div><h3 className="text-sm font-extrabold text-slate-800">Environment Variables</h3><p className="text-xs text-slate-400 mt-1">Environment variables are dynamically injected into your container runtime securely at startup. Overriding system PORT requires re-allocation.</p></div>
                <div className="border border-slate-200 bg-slate-50/50 p-4 space-y-3">
                  <div className="grid grid-cols-12 gap-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2"><div className="col-span-5">Variable Key</div><div className="col-span-6">Injected Value</div><div className="col-span-1 text-right">Erase</div></div>
                  {(variables[selectedService.id] || []).map((variable, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-3 items-center text-xs font-mono">
                      <div className="col-span-5 text-slate-800 font-bold bg-white px-2 py-1.5 border border-slate-200 truncate select-all">{variable.key}</div>
                      <div className="col-span-6 text-slate-600 bg-white px-2 py-1.5 border border-slate-200 truncate select-all">{variable.value}</div>
                      <div className="col-span-1 text-right"><button onClick={() => handleRemoveVariable(selectedService.id, variable.key)} className="text-slate-400 hover:text-rose-600 p-1.5 transition-colors cursor-pointer"><Trash2 className="w-4 h-4" /></button></div>
                    </div>
                  ))}
                  <div className="grid grid-cols-12 gap-3 items-center pt-3 border-t border-slate-200 mt-2">
                    <div className="col-span-5"><input type="text" placeholder="e.g. DATABASE_PORT" value={newVarKey} onChange={(e) => setNewVarKey(e.target.value)} className="w-full border border-slate-200 bg-white px-3 py-2 text-xs font-mono outline-none focus:border-[#00459c] font-semibold" /></div>
                    <div className="col-span-6"><input type="text" placeholder="e.g. 5432" value={newVarVal} onChange={(e) => setNewVarVal(e.target.value)} className="w-full border border-slate-200 bg-white px-3 py-2 text-xs font-mono outline-none focus:border-[#00459c] font-semibold" /></div>
                    <div className="col-span-1 text-right"><button onClick={() => handleAddVariable(selectedService.id)} className="bg-[#00459c] hover:bg-[#003882] text-white p-2 border border-[#00459c] font-bold text-xs flex justify-center items-center cursor-pointer" title="Add Parameter"><Plus className="w-4 h-4" /></button></div>
                  </div>
                </div>
              </div>
            )}

            {/* DATABASE TAB */}
            {activeConsoleTab === 'database' && selectedService.type === 'db' && (
              <div className="space-y-6">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                  <div><h3 className="text-sm font-extrabold text-slate-800">PostgreSQL Cloud Database Explorer</h3><p className="text-xs text-slate-400 mt-1">Direct connection established. Inspect production rows, delete active records, or append new datasets.</p></div>
                  <div className="flex gap-1 border border-slate-200 p-1 bg-slate-50">
                    <button onClick={() => setActiveDbTable('users')} className={`px-3 py-1 text-xs font-bold uppercase tracking-wider ${activeDbTable === 'users' ? 'bg-[#00459c] text-white' : 'text-slate-600 hover:bg-slate-100'}`}>users ({dbData.users.length})</button>
                    <button onClick={() => setActiveDbTable('products')} className={`px-3 py-1 text-xs font-bold uppercase tracking-wider ${activeDbTable === 'products' ? 'bg-[#00459c] text-white' : 'text-slate-600 hover:bg-slate-100'}`}>products ({dbData.products.length})</button>
                    <button onClick={() => setActiveDbTable('deployments')} className={`px-3 py-1 text-xs font-bold uppercase tracking-wider ${activeDbTable === 'deployments' ? 'bg-[#00459c] text-white' : 'text-slate-600 hover:bg-slate-100'}`}>deployments ({dbData.deployments.length})</button>
                  </div>
                </div>
                <div className="border border-slate-200 overflow-x-auto bg-white">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead><tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                      {activeDbTable === 'users' && (<><th className="p-3 border-r border-slate-200">id</th><th className="p-3 border-r border-slate-200">name</th><th className="p-3 border-r border-slate-200">email</th><th className="p-3 border-r border-slate-200">role</th><th className="p-3 border-r border-slate-200">created_at</th><th className="p-3 text-right">actions</th></>)}
                      {activeDbTable === 'products' && (<><th className="p-3 border-r border-slate-200">id</th><th className="p-3 border-r border-slate-200">name</th><th className="p-3 border-r border-slate-200">price (USD)</th><th className="p-3 border-r border-slate-200">stock_limit</th><th className="p-3 text-right">actions</th></>)}
                      {activeDbTable === 'deployments' && (<><th className="p-3 border-r border-slate-200">id</th><th className="p-3 border-r border-slate-200">service</th><th className="p-3 border-r border-slate-200">duration</th><th className="p-3 border-r border-slate-200">status</th><th className="p-3 border-r border-slate-200">author</th><th className="p-3 text-right">actions</th></>)}
                    </tr></thead>
                    <tbody className="divide-y divide-slate-100 font-mono text-[11px] text-slate-700">
                      {dbData[activeDbTable].map((row: any) => (
                        <tr key={row.id} className="hover:bg-slate-50/50">
                          {activeDbTable === 'users' && (<><td className="p-3 font-bold border-r border-slate-100">{row.id}</td><td className="p-3 border-r border-slate-100 font-sans font-semibold text-slate-900">{row.name}</td><td className="p-3 border-r border-slate-100">{row.email}</td><td className="p-3 border-r border-slate-100"><span className={`px-1.5 py-0.5 text-[9px] font-bold ${row.role === 'admin' ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>{row.role.toUpperCase()}</span></td><td className="p-3 border-r border-slate-100 text-slate-400">{row.created}</td><td className="p-3 text-right"><button onClick={() => handleDeleteDbRow('users', row.id)} className="text-rose-500 hover:text-rose-700 hover:underline cursor-pointer font-bold">DELETE</button></td></>)}
                          {activeDbTable === 'products' && (<><td className="p-3 font-bold border-r border-slate-100">{row.id}</td><td className="p-3 border-r border-slate-100 font-sans font-semibold text-slate-900">{row.name}</td><td className="p-3 border-r border-slate-100">${row.price.toFixed(2)}</td><td className="p-3 border-r border-slate-100">{row.stock} units</td><td className="p-3 text-right"><button onClick={() => handleDeleteDbRow('products', row.id)} className="text-rose-500 hover:text-rose-700 hover:underline cursor-pointer font-bold">DELETE</button></td></>)}
                          {activeDbTable === 'deployments' && (<><td className="p-3 font-bold border-r border-slate-100">{row.id}</td><td className="p-3 border-r border-slate-100">{row.service}</td><td className="p-3 border-r border-slate-100">{row.duration}</td><td className="p-3 border-r border-slate-100"><span className="bg-emerald-50 text-emerald-700 font-bold px-1.5 py-0.5 text-[9px]">{row.status}</span></td><td className="p-3 border-r border-slate-100">{row.author}</td><td className="p-3 text-right"><button onClick={() => handleDeleteDbRow('deployments', row.id)} className="text-rose-500 hover:text-rose-700 hover:underline cursor-pointer font-bold">DELETE</button></td></>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Add Row Forms */}
                <div className="bg-slate-50 border border-slate-200 p-5">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Add New Record Row to "{activeDbTable}"</h4>
                  {activeDbTable === 'users' && (<form onSubmit={handleAddUserRow} className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end"><div><label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Full Name</label><input type="text" placeholder="e.g. John Miller" value={userForm.name} onChange={(e) => setUserForm({ ...userForm, name: e.target.value })} className="w-full border border-slate-200 bg-white px-3 py-2 text-xs font-sans outline-none focus:border-[#00459c]" required /></div><div><label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Email</label><input type="email" placeholder="miller@corp.io" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} className="w-full border border-slate-200 bg-white px-3 py-2 text-xs font-sans outline-none focus:border-[#00459c]" required /></div><div><label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Role</label><select value={userForm.role} onChange={(e) => setUserForm({ ...userForm, role: e.target.value })} className="w-full border border-slate-200 bg-white px-3 py-2 text-xs font-sans outline-none focus:border-[#00459c]"><option value="developer">Developer</option><option value="admin">Admin</option><option value="guest">Guest</option></select></div><button type="submit" className="bg-[#00459c] hover:bg-[#003882] text-white py-2 px-4 text-xs font-bold uppercase tracking-wider border border-[#00459c] cursor-pointer">Insert Row</button></form>)}
                  {activeDbTable === 'products' && (<form onSubmit={handleAddProductRow} className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end"><div><label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Product Name</label><input type="text" placeholder="e.g. Cloud RAM unit" value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} className="w-full border border-slate-200 bg-white px-3 py-2 text-xs font-sans outline-none focus:border-[#00459c]" required /></div><div><label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Price (USD)</label><input type="number" step="0.01" placeholder="9.99" value={productForm.price || ''} onChange={(e) => setProductForm({ ...productForm, price: parseFloat(e.target.value) })} className="w-full border border-slate-200 bg-white px-3 py-2 text-xs font-sans outline-none focus:border-[#00459c]" required /></div><div><label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Stock Limit</label><input type="number" placeholder="100" value={productForm.stock} onChange={(e) => setProductForm({ ...productForm, stock: parseInt(e.target.value) })} className="w-full border border-slate-200 bg-white px-3 py-2 text-xs font-sans outline-none focus:border-[#00459c]" required /></div><button type="submit" className="bg-[#00459c] hover:bg-[#003882] text-white py-2 px-4 text-xs font-bold uppercase tracking-wider border border-[#00459c] cursor-pointer">Insert Row</button></form>)}
                  {activeDbTable === 'deployments' && (<form onSubmit={handleAddDeploymentRow} className="grid grid-cols-1 sm:grid-cols-5 gap-4 items-end"><div><label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Service</label><input type="text" placeholder="frontend" value={deploymentForm.service} onChange={(e) => setDeploymentForm({ ...deploymentForm, service: e.target.value })} className="w-full border border-slate-200 bg-white px-3 py-2 text-xs font-sans outline-none focus:border-[#00459c]" required /></div><div><label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Duration</label><input type="text" placeholder="45s" value={deploymentForm.duration} onChange={(e) => setDeploymentForm({ ...deploymentForm, duration: e.target.value })} className="w-full border border-slate-200 bg-white px-3 py-2 text-xs font-sans outline-none focus:border-[#00459c]" required /></div><div><label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Status</label><select value={deploymentForm.status} onChange={(e) => setDeploymentForm({ ...deploymentForm, status: e.target.value })} className="w-full border border-slate-200 bg-white px-3 py-2 text-xs font-sans outline-none focus:border-[#00459c]"><option value="SUCCESS">SUCCESS</option><option value="STABLE">STABLE</option><option value="FAIL">FAIL</option></select></div><div><label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Author</label><input type="text" placeholder="suddymax" value={deploymentForm.author} onChange={(e) => setDeploymentForm({ ...deploymentForm, author: e.target.value })} className="w-full border border-slate-200 bg-white px-3 py-2 text-xs font-sans outline-none focus:border-[#00459c]" required /></div><button type="submit" className="bg-[#00459c] hover:bg-[#003882] text-white py-2 px-4 text-xs font-bold uppercase tracking-wider border border-[#00459c] cursor-pointer">Insert Row</button></form>)}
                </div>

                {/* SQL Terminal */}
                <div className="border border-slate-200 p-5 bg-slate-900 text-slate-100">
                  <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-1.5"><Code className="w-4 h-4" /> Live SQL Client Terminal</h4>
                  <p className="text-[10px] text-slate-400 mb-4 font-mono">Execute raw query statements. e.g.: SELECT * FROM users; or SELECT * FROM products;</p>
                  <form onSubmit={handleRunSqlQuery} className="flex gap-2">
                    <span className="font-mono text-emerald-400 font-bold py-2">postgres=&gt;</span>
                    <input type="text" value={sqlQueryInput} onChange={(e) => setSqlQueryInput(e.target.value)} className="flex-1 bg-slate-950 border border-slate-800 outline-none px-3 py-2 font-mono text-xs text-slate-100 focus:border-amber-400" />
                    <button type="submit" className="bg-amber-500 text-slate-950 hover:bg-amber-400 font-bold px-4 py-2 text-xs uppercase tracking-wider cursor-pointer font-sans">EXECUTE</button>
                  </form>
                  {sqlQueryResult && (<div className="mt-4 bg-slate-950 p-4 border border-slate-800 font-mono text-[10px] leading-relaxed max-h-48 overflow-y-auto text-emerald-400"><pre>{sqlQueryResult}</pre></div>)}
                </div>
              </div>
            )}

            {/* REDIS TAB */}
            {activeConsoleTab === 'redis' && selectedService.type === 'redis' && (
              <div className="space-y-4">
                <div><h3 className="text-sm font-extrabold text-slate-800 font-display">In-Memory Redis Console Prompt</h3><p className="text-xs text-slate-400 mt-1">Execute high-performance cache key manipulations. Try: <code className="bg-slate-100 text-rose-600 px-1 font-mono font-bold">HELP</code>, <code className="bg-slate-100 text-rose-600 px-1 font-mono font-bold">SET user_id 99</code>, <code className="bg-slate-100 text-rose-600 px-1 font-mono font-bold">GET user_id</code>, or <code className="bg-slate-100 text-rose-600 px-1 font-mono font-bold">KEYS *</code>.</p></div>
                <div className="bg-slate-950 border border-slate-900 text-slate-100 p-5 font-mono text-xs h-64 overflow-y-auto space-y-3">
                  {redisConsoleHistory.map((item, idx) => (<div key={idx} className="space-y-1">{item.command && (<div className="flex items-center gap-1.5 text-rose-400 font-bold"><span>redis-cli&gt;</span><span>{item.command}</span></div>)}<div className="text-slate-300 whitespace-pre-wrap pl-4 leading-normal">{item.output}</div></div>))}
                  <div ref={logEndRef} />
                </div>
                <form onSubmit={handleRedisCommandSubmit} className="flex gap-2">
                  <span className="font-mono text-rose-400 font-bold py-2.5">redis-cli&gt;</span>
                  <input type="text" value={redisCmdInput} onChange={(e) => setRedisCmdInput(e.target.value)} placeholder="SET my_token test_key" className="flex-1 border border-slate-200 bg-white pl-3 pr-4 py-2.5 text-xs font-mono outline-none focus:border-rose-500" />
                  <button type="submit" className="bg-rose-600 hover:bg-rose-500 text-white font-bold px-6 py-2.5 text-xs uppercase tracking-wider cursor-pointer">SEND CMD</button>
                </form>
              </div>
            )}

            {/* TERMINAL TAB */}
            {activeConsoleTab === 'terminal' && selectedService.type === 'vps' && (
              <div className="space-y-4">
                <div><h3 className="text-sm font-extrabold text-slate-800">Root SSH Container Terminal</h3><p className="text-xs text-slate-400 mt-1">Secure shell terminal connected as root. Try: <code className="bg-slate-100 px-1 font-mono font-bold">help</code>, <code className="bg-slate-100 px-1 font-mono font-bold">ls</code>, <code className="bg-slate-100 px-1 font-mono font-bold">top</code>, <code className="bg-slate-100 px-1 font-mono font-bold">df -h</code>, <code className="bg-slate-100 px-1 font-mono font-bold">docker ps</code> or <code className="bg-slate-100 px-1 font-mono font-bold">cat package.json</code>.</p></div>
                <div className="bg-slate-950 border border-slate-900 text-slate-100 p-5 font-mono text-xs h-80 overflow-y-auto space-y-3">
                  {vpsConsoleHistory.map((item, idx) => (<div key={idx} className="space-y-1">{item.command && (<div className="flex items-center gap-1.5 text-emerald-400 font-bold"><span>root@digiwise-vps-core:~#</span><span>{item.command}</span></div>)}<div className="text-slate-300 whitespace-pre-wrap pl-4 leading-relaxed">{item.output}</div></div>))}
                  <div ref={logEndRef} />
                </div>
                <form onSubmit={handleVpsCommandSubmit} className="flex gap-2">
                  <span className="font-mono text-emerald-400 font-bold py-2.5">root@digiwise-vps-core:~#</span>
                  <input type="text" value={vpsCmdInput} onChange={(e) => setVpsCmdInput(e.target.value)} placeholder="Type server command here (e.g. ls, top, df -h)..." className="flex-1 border border-slate-200 bg-white pl-3 pr-4 py-2.5 text-xs font-mono outline-none focus:border-emerald-500" />
                  <button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-2.5 text-xs uppercase tracking-wider cursor-pointer">RUN BASH</button>
                </form>
              </div>
            )}

            {/* SETTINGS TAB */}
            {activeConsoleTab === 'settings' && (
              <div className="space-y-6 max-w-3xl">
                <div><h3 className="text-sm font-extrabold text-slate-800">Infrastructure Core Settings</h3><p className="text-xs text-slate-400 mt-1">Manage networking subdomains, SSL certification parameters, and virtual compute resource size mappings.</p></div>
                {selectedService.type === 'web' && (
                  <div className="bg-slate-50 border border-slate-200 p-5 space-y-4">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Custom Platform Domains</h4>
                    <div className="flex gap-2"><div className="flex-1 flex border border-slate-200 bg-white"><span className="bg-slate-50 text-slate-400 text-xs px-3 py-2 font-mono border-r border-slate-200">https://</span><input type="text" defaultValue={selectedService.name} className="flex-1 outline-none px-3 py-2 text-xs font-mono font-semibold" /><span className="bg-slate-50 text-slate-400 text-xs px-3 py-2 font-mono border-l border-slate-200">.digiwise.app</span></div><button onClick={() => alert("Subdomain successfully mapped. Propagation takes ~30 seconds.")} className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider px-4 py-2 cursor-pointer">Map Domain</button></div>
                    <div className="flex items-center gap-1.5 text-[10px] text-emerald-700 font-bold uppercase tracking-wider"><ShieldCheck className="w-3.5 h-3.5" /> Wildcard SSL Certificate Provisioned &middot; TLS 1.3 Active</div>
                  </div>
                )}
                <div className="bg-slate-50 border border-slate-200 p-5 space-y-4">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Compute Spec Tier</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div className={`p-4 border bg-white ${selectedService.cpu <= 4 ? 'border-[#00459c] bg-[#00459c]/5' : 'border-slate-200'}`}><span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">NANO CORE</span><span className="text-sm font-extrabold text-slate-900 mt-1 block">4 vCPUs</span><span className="text-[10px] text-slate-500 font-medium block">128MB Memory</span><span className="text-xs font-bold text-[#00459c] mt-2 block">$3.00 / mo</span></div>
                    <div className={`p-4 border bg-white ${selectedService.cpu > 4 && selectedService.cpu <= 8 ? 'border-[#00459c] bg-[#00459c]/5' : 'border-slate-200'}`}><span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">MICRO NODE</span><span className="text-sm font-extrabold text-slate-900 mt-1 block">8 vCPUs</span><span className="text-[10px] text-slate-500 font-medium block">256MB Memory</span><span className="text-xs font-bold text-[#00459c] mt-2 block">$6.00 / mo</span></div>
                    <div className={`p-4 border bg-white ${selectedService.cpu > 8 && selectedService.cpu <= 12 ? 'border-[#00459c] bg-[#00459c]/5' : 'border-slate-200'}`}><span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">MEDIUM VM</span><span className="text-sm font-extrabold text-slate-900 mt-1 block">12 vCPUs</span><span className="text-[10px] text-slate-500 font-medium block">512MB Memory</span><span className="text-xs font-bold text-[#00459c] mt-2 block">$12.00 / mo</span></div>
                    <div className={`p-4 border bg-white ${selectedService.cpu > 12 ? 'border-[#00459c] bg-[#00459c]/5' : 'border-slate-200'}`}><span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">HIGH INTENSE</span><span className="text-sm font-extrabold text-slate-900 mt-1 block">18+ vCPUs</span><span className="text-[10px] text-slate-500 font-medium block">2048MB Memory</span><span className="text-xs font-bold text-[#00459c] mt-2 block">$24.00 / mo</span></div>
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium leading-relaxed">Scaling changes apply hot immediately. Hardware restarts are NOT required. Billing is computed down to microsecond increments.</p>
                </div>
                <div className="bg-slate-50 border border-slate-200 p-5 space-y-3">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Restart Command Override</h4>
                  <input type="text" defaultValue={selectedService.type === 'web' ? 'yarn run build && node dist/server.cjs' : 'postgres -D /usr/local/var/postgres'} className="w-full border border-slate-200 bg-white px-3 py-2 text-xs font-mono outline-none focus:border-[#00459c]" />
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 p-12 text-center space-y-4">
          <div className="w-12 h-12 bg-slate-50 border border-slate-150 flex items-center justify-center mx-auto text-slate-400"><SlidersHorizontal className="w-6 h-6" /></div>
          <div>
            <h3 className="text-base font-bold text-slate-800">No Service Component Focused</h3>
            <p className="text-slate-500 text-xs max-w-sm mx-auto mt-1">Select one of your active VPS core nodes, PostgreSQL databases, or web-app repositories above to inspect active deployment lines, execute SQL queries, or launch secure SSH terminals.</p>
          </div>
        </div>
      )}

      {/* 5. NEW SERVICE MODAL */}
      {isNewServiceModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 max-w-lg w-full p-6 shadow-xl animate-fade-in relative">
            <button onClick={() => setIsNewServiceModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer"><X className="w-5 h-5" /></button>
            <div className="border-b border-slate-100 pb-4 mb-6">
              <h3 className="text-lg font-bold text-slate-900 font-display">Provision New Infrastructure Component</h3>
              <p className="text-xs text-slate-400 mt-1">Add virtual private hardware layers to your cluster project instantly.</p>
            </div>
            <form onSubmit={handleCreateService} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Service Node Name</label>
                <input type="text" placeholder="e.g. payment-worker-api" value={newServiceName} onChange={(e) => setNewServiceName(e.target.value)} className="w-full border border-slate-200 bg-slate-50 focus:bg-white px-3 py-2.5 text-xs outline-none focus:border-[#00459c] font-semibold" required />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Component Type</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button type="button" onClick={() => setNewServiceType('web')} className={`py-2 px-3 border text-xs font-bold uppercase tracking-wider ${newServiceType === 'web' ? 'border-[#00459c] bg-[#00459c]/5 text-[#00459c]' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>Web App</button>
                  <button type="button" onClick={() => setNewServiceType('db')} className={`py-2 px-3 border text-xs font-bold uppercase tracking-wider ${newServiceType === 'db' ? 'border-[#00459c] bg-[#00459c]/5 text-[#00459c]' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>Postgres DB</button>
                  <button type="button" onClick={() => setNewServiceType('redis')} className={`py-2 px-3 border text-xs font-bold uppercase tracking-wider ${newServiceType === 'redis' ? 'border-[#00459c] bg-[#00459c]/5 text-[#00459c]' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>Redis Cache</button>
                  <button type="button" onClick={() => setNewServiceType('vps')} className={`py-2 px-3 border text-xs font-bold uppercase tracking-wider ${newServiceType === 'vps' ? 'border-[#00459c] bg-[#00459c]/5 text-[#00459c]' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>Linux VPS</button>
                </div>
              </div>
              {newServiceType === 'web' && (
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">GitHub Repository Link</label>
                  <div className="relative"><Github className="absolute left-3 top-3 w-4 h-4 text-slate-400" /><input type="text" placeholder="github.com/user/my-repo" value={newServiceRepo} onChange={(e) => setNewServiceRepo(e.target.value)} className="w-full border border-slate-200 bg-slate-50 focus:bg-white pl-10 pr-4 py-2.5 text-xs outline-none focus:border-[#00459c] font-semibold" /></div>
                </div>
              )}
              {newServiceType === 'db' && (
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Database Engine</label>
                  <select value={newServiceDbType} onChange={(e) => setNewServiceDbType(e.target.value)} className="w-full border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs outline-none focus:border-[#00459c] font-semibold">
                    <option value="PostgreSQL 16">PostgreSQL 16 (Standard Relational)</option>
                    <option value="MySQL 8.0">MySQL 8.0 (Enterprise RDBMS)</option>
                    <option value="MongoDB 7.0">MongoDB 7.0 (NoSQL Document)</option>
                  </select>
                </div>
              )}
              {newServiceType === 'redis' && (<div className="bg-slate-50 border border-slate-100 p-3 text-[11px] text-slate-500 leading-relaxed font-medium">We will provision a fully isolated Redis 7.2 Cache instance capped at 64MB of RAM, optimized for high-speed session states.</div>)}
              {newServiceType === 'vps' && (<div className="bg-slate-50 border border-slate-100 p-3 text-[11px] text-slate-500 leading-relaxed font-medium">We will launch a dedicated Ubuntu 24.04 LTS VPS container mapping a public IPv4 with root SSH execution privileges.</div>)}
              <div className="pt-4 flex gap-2">
                <button type="button" onClick={() => setIsNewServiceModalOpen(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 text-xs uppercase tracking-wider cursor-pointer">Cancel</button>
                <button type="submit" className="flex-1 bg-[#00459c] hover:bg-[#003882] text-white font-bold py-2.5 text-xs uppercase tracking-wider cursor-pointer">Deploy Component</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}