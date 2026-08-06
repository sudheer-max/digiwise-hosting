import React, { useEffect, useState } from 'react';
import {
  Cpu, Workflow, Camera, LineChart, Warehouse, ExternalLink, RefreshCw,
  Server, Activity, Box, Database, Shield, HardDrive, Loader2
} from 'lucide-react';
import { SectionHeader, StatusPill } from '../ui';

interface ServiceConfig {
  id: string;
  name: string;
  description: string;
  url: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  category: string;
}

const SERVICES: ServiceConfig[] = [
  {
    id: 'argocd',
    name: 'ArgoCD',
    description: 'GitOps continuous delivery for Kubernetes. Manages application deployments from Git repositories.',
    url: 'https://argocd.digiwisesoftech.com',
    icon: <Workflow className="w-6 h-6" />,
    color: '#E8563D',
    bgColor: '#E8563D15',
    category: 'Deployment',
  },
  {
    id: 'grafana',
    name: 'Grafana',
    description: 'Observability and monitoring dashboards. Visualize metrics, logs, and traces.',
    url: 'https://grafana.digiwisesoftech.com',
    icon: <LineChart className="w-6 h-6" />,
    color: '#F46800',
    bgColor: '#F4680015',
    category: 'Monitoring',
  },
  {
    id: 'harbor',
    name: 'Harbor',
    description: 'Private container registry. Store and manage Docker images with vulnerability scanning.',
    url: 'https://harbor.digiwisesoftech.com',
    icon: <Warehouse className="w-6 h-6" />,
    color: '#4495D7',
    bgColor: '#4495D715',
    category: 'Registry',
  },
  {
    id: 'prometheus',
    name: 'Prometheus',
    description: 'Metrics collection and alerting. Monitor cluster and application health.',
    url: 'https://prometheus.digiwisesoftech.com',
    icon: <Camera className="w-6 h-6" />,
    color: '#E6522C',
    bgColor: '#E6522C15',
    category: 'Monitoring',
  },
];

type ServiceStatus = 'checking' | 'online' | 'offline' | 'error';

function ServiceCard({ service, status }: { service: ServiceConfig; status: ServiceStatus }) {
  return (
    <a
      href={service.url}
      target="_blank"
      rel="noopener noreferrer"
      className="bg-white border border-slate-200 shadow-sm p-6 hover:border-[#00459c]/40 hover:shadow-md transition-all group cursor-pointer block"
    >
      <div className="flex items-start justify-between mb-4">
        <div
          className="w-12 h-12 flex items-center justify-center"
          style={{ backgroundColor: service.bgColor, color: service.color }}
        >
          {service.icon}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-100 px-2 py-0.5">
            {service.category}
          </span>
          <StatusPill status={status === 'checking' ? 'pending' : status === 'online' ? 'healthy' : status === 'offline' ? 'stopped' : 'error'} />
        </div>
      </div>
      <h3 className="text-lg font-display font-bold text-slate-900 mb-1 group-hover:text-[#00459c] transition-colors">
        {service.name}
      </h3>
      <p className="text-xs text-slate-500 leading-relaxed mb-4">{service.description}</p>
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-mono text-slate-400 truncate max-w-[70%]">{service.url}</span>
        <ExternalLink className="w-4 h-4 text-slate-300 group-hover:text-[#00459c] transition-colors shrink-0" />
      </div>
    </a>
  );
}

export default function InfrastructureView() {
  const [statuses, setStatuses] = useState<Record<string, ServiceStatus>>({});
  const [checking, setChecking] = useState(true);

  const checkServices = async () => {
    setChecking(true);
    const newStatuses: Record<string, ServiceStatus> = {};
    for (const s of SERVICES) {
      newStatuses[s.id] = 'checking';
    }
    setStatuses({ ...newStatuses });

    const results = await Promise.allSettled(
      SERVICES.map(async (s) => {
        try {
          const res = await fetch(s.url, { method: 'HEAD', mode: 'no-cors' });
          return { id: s.id, status: 'online' as ServiceStatus };
        } catch {
          return { id: s.id, status: 'offline' as ServiceStatus };
        }
      })
    );

    for (const r of results) {
      if (r.status === 'fulfilled') {
        newStatuses[r.value.id] = r.value.status;
      }
    }
    setStatuses({ ...newStatuses });
    setChecking(false);
  };

  useEffect(() => { checkServices(); }, []);

  const onlineCount = Object.values(statuses).filter((s) => s === 'online').length;
  const totalCount = SERVICES.length;

  return (
    <div className="space-y-6">
      <SectionHeader
        title={<span className="flex items-center gap-2"><Cpu className="w-6 h-6 text-[#00459c]" /> Infrastructure Services</span>}
        subtitle={`${onlineCount}/${totalCount} services reachable · Click any service to open in new tab`}
        action={
          <button
            onClick={checkServices}
            disabled={checking}
            className="inline-flex items-center gap-1.5 border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 text-xs font-bold px-3 py-2.5 transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${checking ? 'animate-spin' : ''}`} /> Check Status
          </button>
        }
      />

      {/* Status Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {SERVICES.map((s) => (
          <div key={s.id} className="bg-white border border-slate-200 shadow-sm px-4 py-3 flex items-center gap-3">
            <div className="w-8 h-8 flex items-center justify-center shrink-0" style={{ backgroundColor: s.bgColor, color: s.color }}>
              {s.icon}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-900 truncate">{s.name}</div>
              <div className="mt-0.5">
                {checking ? (
                  <span className="text-[10px] text-slate-400">Checking...</span>
                ) : (
                  <StatusPill status={statuses[s.id] === 'online' ? 'healthy' : statuses[s.id] === 'checking' ? 'pending' : 'stopped'} />
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Service Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {SERVICES.map((s) => (
          <ServiceCard key={s.id} service={s} status={statuses[s.id] || 'checking'} />
        ))}
      </div>

      {/* Info */}
      <div className="bg-white border border-slate-200 shadow-sm p-5">
        <h3 className="text-sm font-bold text-slate-900 mb-3">About Infrastructure Services</h3>
        <div className="text-xs text-slate-500 space-y-2">
          <p>All services are deployed on the K3s cluster and accessible via Traefik ingress with automatic TLS certificates.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
            <div className="bg-slate-50 border border-slate-200 p-3">
              <div className="font-bold text-slate-700 mb-1">ArgoCD</div>
              <div className="text-[10px] text-slate-400">GitOps engine that syncs your applications from Git. Connect repositories and manage deployments declaratively.</div>
            </div>
            <div className="bg-slate-50 border border-slate-200 p-3">
              <div className="font-bold text-slate-700 mb-1">Grafana + Prometheus</div>
              <div className="text-[10px] text-slate-400">Full observability stack. Prometheus scrapes metrics, Grafana visualizes them with pre-built dashboards.</div>
            </div>
            <div className="bg-slate-50 border border-slate-200 p-3">
              <div className="font-bold text-slate-700 mb-1">Harbor Registry</div>
              <div className="text-[10px] text-slate-400">Private Docker image registry with vulnerability scanning, RBAC, and image replication.</div>
            </div>
            <div className="bg-slate-50 border border-slate-200 p-3">
              <div className="font-bold text-slate-700 mb-1">K3s Cluster</div>
              <div className="text-[10px] text-slate-400">Lightweight Kubernetes distribution powering all workloads. Managed via kubectl or the K3s CLI.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
