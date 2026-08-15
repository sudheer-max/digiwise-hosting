import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  LayoutDashboard, FolderKanban, Rocket, Database, Boxes, ListTree,
  Server, Settings, RefreshCw, LogOut, Box, ChevronDown, Menu, X,
  Globe, Layers, GitBranch, ShieldCheck, CloudCog, Loader2, Braces,
  Activity, Clock, FileCode2, Container, Network, Gauge, Globe2,
  UserRound, Users, ScrollText, KeyRound, Sparkles, Tag, GitFork,
  HardDriveDownload, ShieldCheck as ShieldCert, Network as NetworkCluster,
  Bell, KeySquare, Palette, Fingerprint, LayoutTemplate, CreditCard,
  Wallet, Share2, BookOpen, Radio, MessageSquare, Home, UserCog,
  Cpu, Workflow, Camera, LineChart, Warehouse, ShoppingCart
} from 'lucide-react';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import OverviewView from './views/OverviewView';
import ProjectsView from './views/ProjectsView';
import ProjectDetailView from './views/ProjectDetailView';
import ApplicationsView from './views/ApplicationsView';
import ApplicationDetailView from './views/ApplicationDetailView';
import DatabasesView from './views/DatabasesView';
import DatabaseDetailView from './views/DatabaseDetailView';
import ComposeView from './views/ComposeView';
import ComposeDetailView from './views/ComposeDetailView';
import DeploymentsView from './views/DeploymentsView';
import ServersView from './views/ServersView';
import SettingsView from './views/SettingsView';
import ApiExplorerView from './views/ApiExplorerView';
import MonitoringView from './views/MonitoringView';
import SchedulesView from './views/SchedulesView';
import TraefikView from './views/TraefikView';
import DockerView from './views/DockerView';
import SwarmView from './views/SwarmView';
import RequestsView from './views/RequestsView';
import WebServerView from './views/WebServerView';
import ProfileView from './views/ProfileView';
import UsersView from './views/UsersView';
import AuditLogsView from './views/AuditLogsView';
import SshKeysView from './views/SshKeysView';
import AiView from './views/AiView';
import TagsView from './views/TagsView';
import GitView from './views/GitView';
import RegistriesView from './views/RegistriesView';
import DestinationsView from './views/DestinationsView';
import CertificatesView from './views/CertificatesView';
import ClusterView from './views/ClusterView';
import NotificationsView from './views/NotificationsView';
import LicenseView from './views/LicenseView';
import SsoView from './views/SsoView';
import WhitelabelView from './views/WhitelabelView';
import PlansView from './views/PlansView';
import UsageView from './views/UsageView';
import BillingView from './views/BillingView';
import TemplatesView from './views/TemplatesView';
import PeopleView from './views/PeopleView';
import EarningsView from './views/EarningsView';
import ReferralsView from './views/ReferralsView';
import DocsView from './views/DocsView';
import CentralStationView from './views/CentralStationView';
import SupportThreadsView from './views/SupportThreadsView';
import InfrastructureView from './views/InfrastructureView';
import DeployProgressView from './views/DeployProgressView';
import CreateApplicationWizard from './CreateApplicationWizard';

export type Route =  | { name: 'overview' }
  | { name: 'projects' }
  | { name: 'project'; projectId: string }
  | { name: 'applications' }
  | { name: 'application'; projectId: string; appName: string }
  | { name: 'databases' }
  | { name: 'database'; type: string; namespace: string; dbName: string }
  | { name: 'compose' }
  | { name: 'composeDetail'; composeId: string }
  | { name: 'deployments' }
  | { name: 'monitoring' }
  | { name: 'schedules' }
  | { name: 'traefik' }
  | { name: 'docker' }
  | { name: 'swarm' }
  | { name: 'requests' }
  | { name: 'webServer' }
  | { name: 'profile' }
  | { name: 'servers' }
  | { name: 'settings' }
  | { name: 'explorer' }
  | { name: 'users' }
  | { name: 'auditLogs' }
  | { name: 'sshKeys' }
  | { name: 'ai' }
  | { name: 'tags' }
  | { name: 'git' }
  | { name: 'registries' }
  | { name: 'destinations' }
  | { name: 'certificates' }
  | { name: 'cluster' }
  | { name: 'notifications' }
  | { name: 'license' }
  | { name: 'sso' }
  | { name: 'whitelabel' }
  | { name: 'plans' }
  | { name: 'usage' }
  | { name: 'billing' }
  | { name: 'templates' }
  | { name: 'people' }
  | { name: 'earnings' }
  | { name: 'referrals' }
  | { name: 'docs' }
  | { name: 'centralStation' }
  | { name: 'supportThreads' }
  | { name: 'infrastructure' }
  | { name: 'createApp' }
  | { name: 'deployProgress'; projectId: string; appName: string; repoURL: string; branch: string; port: number; env?: Record<string, string>; buildCommand?: string; startCommand?: string };

const ROUTE_TITLES: Record<string, string> = {
  overview: 'Home',
  projects: 'Projects',
  applications: 'Applications',
  databases: 'Databases',
  compose: 'Compose',
  deployments: 'Deployments',
  monitoring: 'Monitoring',
  schedules: 'Schedules',
  traefik: 'Traefik File System',
  docker: 'Docker',
  swarm: 'Swarm',
  requests: 'Requests',
  webServer: 'Web Server',
  profile: 'Profile',
  servers: 'Remote Servers',
  settings: 'Settings',
  explorer: 'API Explorer',
  users: 'Users',
  auditLogs: 'Audit Logs',
  sshKeys: 'SSH Keys',
  ai: 'AI',
  tags: 'Tags',
  git: 'Git',
  registries: 'Registry',
  destinations: 'S3 Destinations',
  certificates: 'Certificates',
  cluster: 'Cluster',
  notifications: 'Notifications',
  license: 'License',
  sso: 'SSO',
  whitelabel: 'Whitelabeling',
  project: 'Project',
  application: 'Application',
  database: 'Database',
  composeDetail: 'Compose',
  plans: 'Plans',
  usage: 'Usage',
  billing: 'Billing',
  templates: 'Templates',
  people: 'People',
  earnings: 'Earnings',
  referrals: 'Referrals',
  docs: 'Documentation',
  centralStation: 'Central Station',
  supportThreads: 'Support Threads',
  infrastructure: 'Infrastructure',
  createApp: 'Create Application',
  deployProgress: 'Deploy Progress',
};

interface ConsoleData {
  projects: any[];
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
  plan: any | null;
  planLoading: boolean;
  hasPaidPlan: boolean;
}

export const ConsoleContext = React.createContext<{
  data: ConsoleData;
  navigate: (route: Route) => void;
  route: Route;
} | null>(null);

export function useConsole() {
  const ctx = React.useContext(ConsoleContext);
  if (!ctx) throw new Error('useConsole must be used within ConsoleShell');
  return ctx;
}

export function aggregateResources(projects: any[]) {
  const apps: any[] = [];
  const dbs: any[] = [];
  const composes: any[] = [];
  for (const p of projects || []) {
    if (p.apps) {
      for (const a of p.apps) apps.push({ ...a, _projectId: p.id });
    }
    if (p.databases) {
      for (const d of p.databases) dbs.push({ ...d, _projectId: p.id });
    }
    if (p.composes) {
      for (const c of p.composes) composes.push({ ...c, _projectId: p.id });
    }
  }
  return { apps, dbs, composes };
}

function NavButton({ active, icon, label, count, onClick, badge }: {
  active?: boolean; icon: React.ReactNode; label: string; count?: number; onClick: () => void; badge?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium transition-colors cursor-pointer text-left ${
        active
          ? 'bg-[#00459c] text-white'
          : 'text-slate-300 hover:bg-white/5 hover:text-white'
      }`}
    >
      <span className="shrink-0">{icon}</span>
      <span className="flex-1 truncate">{label}</span>
      {badge}
      {count !== undefined && (
        <span className={`text-[10px] font-bold px-1.5 py-0.5 ${active ? 'bg-white/20 text-white' : 'bg-white/10 text-slate-300'}`}>
          {count}
        </span>
      )}
    </button>
  );
}

function NavGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <div className="px-3 mb-1.5 text-[9px] font-bold uppercase tracking-widest text-slate-500">{title}</div>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

export default function ConsoleShell() {
  const initialRoute = (() => {
    if (typeof window !== 'undefined') {
      const view = new URLSearchParams(window.location.search).get('view');
      const valid = ['projects', 'templates', 'usage', 'plans', 'people', 'auditLogs', 'sshKeys', 'earnings', 'referrals', 'docs', 'centralStation', 'supportThreads', 'infrastructure', 'applications', 'databases', 'compose', 'deployments', 'monitoring', 'schedules', 'traefik', 'docker', 'swarm', 'requests', 'servers', 'settings', 'profile', 'users', 'explorer', 'git', 'registries', 'destinations', 'certificates', 'cluster', 'notifications', 'license', 'sso', 'whitelabel', 'ai', 'tags', 'overview', 'createApp'];
      if (view && valid.includes(view)) return { name: view } as Route;
    }
    return { name: 'overview' } as Route;
  })();
  const [route, setRoute] = useState<Route>(initialRoute);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [plan, setPlan] = useState<any | null>(null);
  const [planLoading, setPlanLoading] = useState(true);
  const { user, logout } = useAuth();

  const hasPaidPlan = user?.role === 'admin' || (plan && plan.plan && plan.plan.key !== 'trial' && plan.planStatus === 'active');

  const refresh = useCallback(async () => {
    setError('');
    try {
      const list = await api.listProjects();
      setProjects(Array.isArray(list) ? list : []);
    } catch (err: any) {
      setError(err.message || 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPlan = useCallback(async () => {
    setPlanLoading(true);
    try {
      const planData = await api.getPlan();
      setPlan(planData);
    } catch {
      setPlan(null);
    } finally {
      setPlanLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); fetchPlan(); }, [refresh, fetchPlan]);

  useEffect(() => {
    if (route.name === 'billing') {
      setRoute({ name: 'overview' });
    }
  }, [route.name]);

  const navigate = useCallback((r: Route) => {
    setRoute(r);
    setSidebarOpen(false);
  }, []);

  const ctx = useMemo(() => ({ data: { projects, loading, error, refresh, plan, planLoading, hasPaidPlan }, navigate, route }), [projects, loading, error, refresh, plan, planLoading, hasPaidPlan, navigate, route]);

  const { apps, dbs, composes } = useMemo(() => aggregateResources(projects), [projects]);

  const counts = useMemo(() => ({
    projects: projects.length,
    apps: apps.length,
    dbs: dbs.length,
    composes: composes.length,
  }), [projects, apps, dbs, composes]);

  const isAdmin = user?.role === 'admin';

  const ADMIN_ONLY_KEYS = new Set(['webServer', 'auditLogs', 'sshKeys', 'centralStation', 'supportThreads']);

  const NAV = [
    {
      group: 'Workspace',
      items: [
        { key: 'projects', label: 'Projects', icon: <FolderKanban className="w-4 h-4" />, route: { name: 'projects' } as Route, active: route.name === 'projects' || route.name === 'project', count: counts.projects },
        { key: 'applications', label: 'Applications', icon: <Rocket className="w-4 h-4" />, route: { name: 'applications' } as Route, active: route.name === 'applications' || route.name === 'application', count: counts.apps },
        { key: 'databases', label: 'Databases', icon: <Database className="w-4 h-4" />, route: { name: 'databases' } as Route, active: route.name === 'databases' || route.name === 'database', count: counts.dbs },
        { key: 'templates', label: 'Templates', icon: <LayoutTemplate className="w-4 h-4" />, route: { name: 'templates' } as Route, active: route.name === 'templates' },
        { key: 'usage', label: 'Usage', icon: <Gauge className="w-4 h-4" />, route: { name: 'usage' } as Route, active: route.name === 'usage' },
        { key: 'people', label: 'People', icon: <Users className="w-4 h-4" />, route: { name: 'people' } as Route, active: route.name === 'people' },
      ],
    },
    {
      group: 'Settings',
      items: [
        { key: 'settings', label: 'General', icon: <Settings className="w-4 h-4" />, route: { name: 'settings' } as Route, active: route.name === 'settings' },
        { key: 'plans', label: 'Plans', icon: <Sparkles className="w-4 h-4" />, route: { name: 'plans' } as Route, active: route.name === 'plans' },
        { key: 'billing', label: 'Billing', icon: <CreditCard className="w-4 h-4" />, route: { name: 'billing' } as Route, active: route.name === 'billing' },

        { key: 'webServer', label: 'Domains', icon: <Globe2 className="w-4 h-4" />, route: { name: 'webServer' } as Route, active: route.name === 'webServer' },
        { key: 'auditLogs', label: 'Audit Logs', icon: <ScrollText className="w-4 h-4" />, route: { name: 'auditLogs' } as Route, active: route.name === 'auditLogs' },
      ],
    },
    {
      group: 'Developer',
      items: [
        { key: 'sshKeys', label: 'SSH Keys', icon: <KeyRound className="w-4 h-4" />, route: { name: 'sshKeys' } as Route, active: route.name === 'sshKeys' },
      ],
    },
    {
      group: 'Growth',
      items: [
        { key: 'earnings', label: 'Earnings', icon: <Wallet className="w-4 h-4" />, route: { name: 'earnings' } as Route, active: route.name === 'earnings' },
        { key: 'referrals', label: 'Referrals', icon: <Share2 className="w-4 h-4" />, route: { name: 'referrals' } as Route, active: route.name === 'referrals' },
      ],
    },
    {
      group: 'Resources',
      items: [
        { key: 'docs', label: 'Docs', icon: <BookOpen className="w-4 h-4" />, route: { name: 'docs' } as Route, active: route.name === 'docs' },
        { key: 'centralStation', label: 'Central Station', icon: <Radio className="w-4 h-4" />, route: { name: 'centralStation' } as Route, active: route.name === 'centralStation' },
        { key: 'supportThreads', label: 'Support Threads', icon: <MessageSquare className="w-4 h-4" />, route: { name: 'supportThreads' } as Route, active: route.name === 'supportThreads' },
      ],
    },
    {
      group: 'Infrastructure',
      items: [
        { key: 'infrastructure', label: 'Services', icon: <Cpu className="w-4 h-4" />, route: { name: 'infrastructure' } as Route, active: route.name === 'infrastructure' },
      ],
    },
  ].map((group) => ({
    ...group,
    items: group.items.filter((item) => isAdmin || !ADMIN_ONLY_KEYS.has(item.key)),
  }));

  const renderView = () => {
    switch (route.name) {
      case 'overview': return <OverviewView />;
      case 'projects': return <ProjectsView />;
      case 'project': return <ProjectDetailView projectId={route.projectId} />;
      case 'applications': return <ApplicationsView />;
      case 'application': return <ApplicationDetailView projectId={route.projectId} name={route.appName} />;
      case 'databases': return <DatabasesView />;
      case 'database': return <DatabaseDetailView type={route.type} namespace={route.namespace} dbName={route.dbName} />;
      case 'compose': return <ComposeView />;
      case 'composeDetail': return <ComposeDetailView composeId={route.composeId} />;
      case 'deployments': return <DeploymentsView />;
      case 'monitoring': return <MonitoringView />;
      case 'schedules': return <SchedulesView />;
      case 'traefik': return <TraefikView />;
      case 'docker': return <DockerView />;
      case 'swarm': return <SwarmView />;
      case 'requests': return <RequestsView />;
      case 'webServer': return <WebServerView />;
      case 'profile': return <ProfileView />;
      case 'servers': return <ServersView />;
      case 'settings': return <SettingsView />;
      case 'explorer': return <ApiExplorerView />;
      case 'users': return <UsersView />;
      case 'auditLogs': return <AuditLogsView />;
      case 'sshKeys': return <SshKeysView />;
      case 'ai': return <AiView />;
      case 'tags': return <TagsView />;
      case 'git': return <GitView />;
      case 'registries': return <RegistriesView />;
      case 'destinations': return <DestinationsView />;
      case 'certificates': return <CertificatesView />;
      case 'cluster': return <ClusterView />;
      case 'notifications': return <NotificationsView />;
      case 'license': return <LicenseView />;
      case 'sso': return <SsoView />;
      case 'whitelabel': return <WhitelabelView />;
      case 'plans': return <PlansView />;
      case 'usage': return <UsageView />;
      case 'billing': return <OverviewView />;
      case 'templates': return <TemplatesView />;
      case 'people': return <PeopleView />;
      case 'earnings': return <EarningsView />;
      case 'referrals': return <ReferralsView />;
      case 'docs': return <DocsView />;
      case 'centralStation': return <CentralStationView />;
      case 'supportThreads': return <SupportThreadsView />;
      case 'infrastructure': return <InfrastructureView />;
      case 'createApp': return <CreateApplicationWizard onClose={() => navigate({ name: 'applications' })} onCreated={() => { navigate({ name: 'applications' }); refresh(); }} />;
      case 'deployProgress': return <DeployProgressView projectId={route.projectId} appName={route.appName} repoURL={route.repoURL} branch={route.branch} port={route.port} env={route.env} buildCommand={route.buildCommand} startCommand={route.startCommand} />;
      default: return <OverviewView />;
    }
  };

  const sidebar = (
    <div className="flex flex-col h-full bg-[#0b1526] text-white">
      <div className="h-16 flex items-center gap-2.5 px-5 border-b border-white/10 shrink-0">
        <div className="w-8 h-8 bg-[#00459c] flex items-center justify-center">
          <Box className="w-4.5 h-4.5 text-white" />
        </div>
        <div className="min-w-0">
          <div className="font-display font-bold text-sm leading-tight tracking-tight">DigiWise</div>
          <div className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Cloud Console</div>
        </div>
        <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="ml-auto text-slate-400 hover:text-white cursor-pointer hidden lg:flex" title="Collapse sidebar">
          <ChevronDown className={`w-4 h-4 ${sidebarCollapsed ? 'rotate-90' : 'rotate-180'}`} />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-2 no-scrollbar">
        {NAV.map((group) => (
          <NavGroup key={group.group} title={group.group}>
            {group.items.map((item) => (
              <NavButton
                key={item.key}
                active={item.active}
                icon={item.icon}
                label={item.label}
                count={item.count}
                onClick={() => navigate(item.route)}
              />
            ))}
          </NavGroup>
        ))}
      </nav>

      <div className="border-t border-white/10 shrink-0">
        <div className="px-5 py-2 text-[9px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
          <CloudCog className="w-3 h-3" /> DigiWise Cloud
        </div>
        <div className="flex items-center gap-2.5 px-5 py-3">
          <div className="w-8 h-8 bg-[#00459c] flex items-center justify-center font-display font-bold text-xs shrink-0">
            {(user?.name || user?.email || 'U').slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold truncate">{user?.name || user?.email}</div>
            <div className="text-[9px] text-slate-400 uppercase tracking-widest">{isAdmin ? 'Administrator' : 'Member'}</div>
          </div>
          <button
            onClick={() => { logout(); window.location.href = '/auth/login'; }}
            className="text-slate-400 hover:text-rose-400 cursor-pointer"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <ConsoleContext.Provider value={ctx}>
      <div className="flex h-screen bg-[#f5f7fb]">
        {sidebarOpen && (
          <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setSidebarOpen(false)}>
            <div className="absolute inset-0 bg-black/50" />
            <div className="absolute inset-y-0 left-0 w-72 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              {sidebar}
            </div>
          </div>
        )}

        <aside className={`hidden lg:block h-full border-r border-slate-200 shrink-0 transition-all ${sidebarCollapsed ? 'w-16' : 'w-64'}`}>
          {sidebarCollapsed ? (
            <div className="flex flex-col h-full bg-[#0b1526] text-white items-center py-4">
              <button onClick={() => setSidebarCollapsed(false)} className="text-slate-400 hover:text-white mb-6 cursor-pointer" title="Expand sidebar">
                <Menu className="w-5 h-5" />
              </button>
              {NAV.flatMap((g) => g.items).map((item) => (
                <button
                  key={item.key}
                  onClick={() => navigate(item.route)}
                  className={`w-full flex justify-center py-3 transition-colors cursor-pointer ${item.active ? 'text-white bg-[#00459c]' : 'text-slate-400 hover:text-white'}`}
                  title={item.label}
                >
                  {item.icon}
                </button>
              ))}
              <button onClick={() => { logout(); window.location.href = '/auth/login'; }} className="mt-auto text-slate-400 hover:text-rose-400 cursor-pointer py-4" title="Sign out">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : sidebar}
        </aside>

        <div className="flex-1 flex flex-col min-w-0 h-full">
          <header className="h-16 bg-white border-b border-slate-200 flex items-center gap-3 px-4 lg:px-6 shrink-0">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-slate-500 cursor-pointer">
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-400">DigiWise</span>
              <span className="text-slate-300">/</span>
              <span className="font-bold text-slate-800 capitalize">{ROUTE_TITLES[route.name] || route.name}</span>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={refresh}
                className="inline-flex items-center gap-1.5 border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 text-xs font-bold px-3 py-2 transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
              </button>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto p-4 lg:p-8">
            <div className="max-w-6xl mx-auto">
              {!hasPaidPlan && !planLoading && (
                <div className="mb-6 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 p-5 flex items-center gap-4">
                  <div className="w-10 h-10 bg-amber-100 flex items-center justify-center shrink-0">
                    <ShoppingCart className="w-5 h-5 text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-amber-900">No active plan</div>
                    <div className="text-xs text-amber-700 mt-0.5">Purchase a VPS hosting plan to create projects, databases, and deploy applications.</div>
                  </div>
                  <a href="/checkout" className="shrink-0 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs uppercase tracking-wider px-5 py-2.5 transition-colors">
                    Purchase Plan
                  </a>
                </div>
              )}
              {renderView()}
            </div>
          </main>
        </div>
      </div>
    </ConsoleContext.Provider>
  );
}