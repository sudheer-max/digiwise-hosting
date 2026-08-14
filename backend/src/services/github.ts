import crypto from 'crypto';
import { config } from '../config.js';

const GITHUB_API = 'https://api.github.com';

function getHeaders(accessToken?: string) {
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'DigiWise-Hosting',
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  } else if (config.github.token) {
    headers['Authorization'] = `Bearer ${config.github.token}`;
  }

  return headers;
}

export function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
  if (!signature) return false;

  const expected = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(payload, 'utf8')
    .digest('hex');

  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

export function generateWebhookSecret(): string {
  return crypto.randomBytes(20).toString('hex');
}

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  html_url: string;
  clone_url: string;
  default_branch: string;
}

export interface GitHubWebhook {
  id: number;
  name: string;
  events: string[];
  active: boolean;
  config: {
    url: string;
    content_type: string;
    secret: string;
  };
}

export async function listRepos(accessToken: string): Promise<GitHubRepo[]> {
  const repos: GitHubRepo[] = [];
  let page = 1;

  while (true) {
    const res = await fetch(`${GITHUB_API}/user/repos?per_page=100&page=${page}&sort=updated`, {
      headers: getHeaders(accessToken),
    });

    if (!res.ok) break;

    const data = await res.json() as GitHubRepo[];
    repos.push(...data);

    if (data.length < 100) break;
    page++;
  }

  return repos;
}

export async function getRepo(owner: string, repo: string, accessToken?: string): Promise<GitHubRepo> {
  const res = await fetch(`${GITHUB_API}/repos/${owner}/${repo}`, {
    headers: getHeaders(accessToken),
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch repo: ${res.statusText}`);
  }

  return res.json() as Promise<GitHubRepo>;
}

export async function createWebhook(
  owner: string,
  repo: string,
  webhookUrl: string,
  secret: string,
  accessToken?: string
): Promise<GitHubWebhook> {
  const res = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/hooks`, {
    method: 'POST',
    headers: {
      ...getHeaders(accessToken),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: 'web',
      active: true,
      events: ['push'],
      config: {
        url: webhookUrl,
        content_type: 'json',
        secret,
        insecure_ssl: '0',
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to create webhook: ${res.statusText} - ${err}`);
  }

  return res.json() as Promise<GitHubWebhook>;
}

export async function updateWebhook(
  owner: string,
  repo: string,
  hookId: number,
  webhookUrl: string,
  secret: string,
  accessToken?: string
): Promise<GitHubWebhook> {
  const res = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/hooks/${hookId}`, {
    method: 'PATCH',
    headers: {
      ...getHeaders(accessToken),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      active: true,
      config: {
        url: webhookUrl,
        content_type: 'json',
        secret,
        insecure_ssl: '0',
      },
    }),
  });

  if (!res.ok) {
    throw new Error(`Failed to update webhook: ${res.statusText}`);
  }

  return res.json() as Promise<GitHubWebhook>;
}

export async function deleteWebhook(
  owner: string,
  repo: string,
  hookId: number,
  accessToken?: string
): Promise<void> {
  await fetch(`${GITHUB_API}/repos/${owner}/${repo}/hooks/${hookId}`, {
    method: 'DELETE',
    headers: getHeaders(accessToken),
  });
}

export async function listWebhooks(
  owner: string,
  repo: string,
  accessToken?: string
): Promise<GitHubWebhook[]> {
  const res = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/hooks`, {
    headers: getHeaders(accessToken),
  });

  if (!res.ok) return [];

  return res.json() as Promise<GitHubWebhook[]>;
}

export function parseRepoUrl(url: string): { owner: string; repo: string } | null {
  // Support both HTTPS and SSH URLs
  const httpsMatch = url.match(/github\.com[/:]([^/]+)\/([^/]+?)(?:\.git)?$/);
  if (httpsMatch) {
    return { owner: httpsMatch[1], repo: httpsMatch[2] };
  }
  return null;
}
