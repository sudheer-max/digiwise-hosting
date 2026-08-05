import { buildApp } from './app.js';
import { config } from './config.js';
import { prisma } from './db/client.js';
import bcrypt from 'bcryptjs';

async function withRetry<T>(fn: () => Promise<T>, attempts = 5, delayMs = 2000): Promise<T> {
  let lastErr: unknown;
  for (let i = 1; i <= attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (i < attempts) {
        console.log(`⚠️  DB attempt ${i}/${attempts} failed, retrying in ${delayMs}ms...`);
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
  }
  throw lastErr;
}

async function seedAdmin() {
  const email = config.admin.email;
  const password = config.admin.password;
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`👤 Admin user already exists: ${email}`);
    return;
  }
  const hashed = await bcrypt.hash(password, 12);
  await prisma.user.create({
    data: { email, password: hashed, name: 'Admin', role: 'admin' },
  });
  console.log(`✅ Admin user created: ${email}`);
}

async function main() {
  await withRetry(() => seedAdmin());

  const app = await buildApp();

  try {
    await app.listen({ port: config.port, host: config.host });
    console.log(`\n🚀 DigiWise Hosting API running on http://${config.host}:${config.port}`);
    console.log(`📖 API Docs: http://localhost:${config.port}/docs`);
    console.log(`📖 Swagger UI: http://localhost:${config.port}/documentation`);
    console.log(`❤️  Health: http://localhost:${config.port}/health\n`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
