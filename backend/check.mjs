import { prisma } from './src/db/client.js';
try { await prisma.user.findMany({ take: 1 }); console.log("BOOT_CHECK: DB reachable & query worked"); }
catch(e){ console.log("BOOT_CHECK_FAIL:", e.message); }
finally { await prisma.$disconnect(); }
