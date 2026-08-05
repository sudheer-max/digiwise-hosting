#!/usr/bin/env node

// This script:
// 1. Polls Linode API until the managed PostgreSQL database is active
// 2. Gets credentials (username + password)
// 3. Updates .env with DATABASE_URL
// 4. Runs prisma db push to create tables
// 5. Seeds the admin user and sample data

import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '..', '.env');
const dbId = 499600; // The Linode Managed Database ID we created

function getToken() {
  const env = readFileSync(envPath, 'utf-8');
  const m = env.match(/LINODE_TOKEN=(.+)/);
  if (!m) throw new Error('LINODE_TOKEN not found in .env');
  return m[1].trim();
}

const BASE = 'https://api.linode.com/v4';
async function linode(method, path, body) {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Linode API ${res.status}: ${JSON.stringify(data.errors || data)}`);
  return data;
}

async function waitForDatabase() {
  console.log(`Waiting for PostgreSQL database (ID: ${dbId}) to become active...`);
  let attempts = 0;
  const maxAttempts = 120; // 120 * 15s = 30 minutes
  while (attempts < maxAttempts) {
    const db = await linode('GET', `/databases/postgresql/instances/${dbId}`);
    if (db.status === 'active') {
      console.log(`Database active! Host: ${db.hosts.primary}, Port: ${db.port}`);
      return db;
    }
    attempts++;
    console.log(`  Status: ${db.status} (attempt ${attempts}/${maxAttempts}, waiting 15s)...`);
    await new Promise(r => setTimeout(r, 15000));
  }
  throw new Error('Database did not become active within 30 minutes');
}

async function getCredentials() {
  const creds = await linode('GET', `/databases/postgresql/instances/${dbId}/credentials`);
  return creds;
}

function updateEnv(username, password, host, port) {
  const dbName = 'digiwise_hosting';
  const url = `postgresql://${username}:${password}@${host}:${port}/${dbName}?sslmode=require`;

  let env = readFileSync(envPath, 'utf-8');

  // Replace or append DATABASE_URL
  if (env.includes('DATABASE_URL=')) {
    env = env.replace(/^DATABASE_URL=.*$/m, `DATABASE_URL="${url}"`);
  } else {
    env += `\nDATABASE_URL="${url}"\n`;
  }

  writeFileSync(envPath, env, 'utf-8');
  console.log(`DATABASE_URL updated in .env`);
  return url;
}

async function runPrismaPush() {
  console.log('Running prisma db push...');
  execSync('npx prisma db push', {
    cwd: resolve(__dirname, '..'),
    stdio: 'inherit',
  });
  console.log('Tables created successfully');
}

async function seed() {
  console.log('Seeding admin user...');

  // Read current .env for admin credentials
  const env = readFileSync(envPath, 'utf-8');
  const adminEmail = (env.match(/ADMIN_EMAIL=(.+)/) || [])[1]?.trim() || 'admin@example.com';
  const adminPass = (env.match(/ADMIN_PASSWORD=(.+)/) || [])[1]?.trim() || 'admin123';
  const jwtSecret = (env.match(/JWT_SECRET="?(.+?)"?$/) || [])[1]?.trim() || 'dev-secret-change-in-production';

  // We'll create the admin user via the Prisma client
  // This requires generating the client first
  execSync('npx prisma generate', { cwd: resolve(__dirname, '..'), stdio: 'inherit' });

  // Import prisma client and seed
  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient();

  try {
    const bcrypt = await import('bcryptjs');
    const hashedPassword = await bcrypt.hash(adminPass, 10);

    await prisma.user.upsert({
      where: { email: adminEmail },
      update: { role: 'admin' },
      create: {
        email: adminEmail,
        name: 'Admin',
        password: hashedPassword,
        role: 'admin',
      },
    });

    console.log(`Admin user seeded: ${adminEmail}`);
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  try {
    console.log('=== Linode Managed PostgreSQL Setup ===\n');

    // Wait for database to be active
    const db = await waitForDatabase();

    // Get credentials
    console.log('Fetching database credentials...');
    const creds = await getCredentials();
    const username = creds.username || 'linpostgres';
    const password = creds.password;

    if (!password) {
      // Try again after a brief wait
      console.log('Password not ready, waiting 30s...');
      await new Promise(r => setTimeout(r, 30000));
      const creds2 = await getCredentials();
      if (!creds2.password) {
        throw new Error('Could not retrieve database password. Check Linode Cloud Manager.');
      }
      return await main(); // retry
    }

    // Update .env
    const url = updateEnv(username, password, db.hosts.primary, db.port);
    console.log(`Connection URL: ${url}\n`);

    // Create tables
    await runPrismaPush();

    // Seed data
    await seed();

    console.log('\n=== Setup complete! ===');
    console.log('Your application is now connected to Linode Managed PostgreSQL.');
  } catch (err) {
    console.error('\nError:', err.message);
    process.exit(1);
  }
}

main();
