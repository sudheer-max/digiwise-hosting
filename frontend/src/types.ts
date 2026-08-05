export interface DNSRecord {
  id: string;
  type: 'A' | 'CNAME' | 'MX' | 'TXT';
  name: string;
  value: string;
  ttl: number;
  proxy: boolean;
}

export interface VPSServer {
  id: string;
  name: string;
  os: string;
  location: string;
  ip: string;
  status: 'STABLE' | 'OFFLINE' | 'REBOOTING';
  cpuUsage: number;
  ramUsage: number;
  ramTotal: number;
}

export interface SupportTicket {
  id: string;
  subject: string;
  category: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'OPEN' | 'RESOLVED' | 'PENDING';
  date: string;
  replies: number;
}

export interface Invoice {
  id: string;
  date: string;
  amount: number;
  status: 'PAID' | 'UNPAID' | 'PENDING';
  plan: string;
}

export interface DomainItem {
  name: string;
  status: 'ACTIVE' | 'EXPIRED' | 'PENDING';
  expiryDate: string;
  autoRenew: boolean;
}
