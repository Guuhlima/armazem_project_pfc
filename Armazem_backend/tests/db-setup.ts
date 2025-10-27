// tests/db-setup.ts
import { execSync } from 'child_process';
import { PrismaClient } from '@prisma/client';

const SCHEMA = process.env.__TEST_SCHEMA__;
if (!SCHEMA) throw new Error('__TEST_SCHEMA__ não definido');

beforeAll(() => {
  // cria o schema com o shape do Prisma
  execSync('npx prisma db push --force-reset --skip-generate', {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
  });
  // console.log('[jest] db push done for schema', SCHEMA);
});

afterAll(async () => {
  const prisma = new PrismaClient();
  try {
    if ((process.env.DATABASE_URL || '').startsWith('postgres')) {
      await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${SCHEMA}" CASCADE`);
    }
  } finally {
    await prisma.$disconnect();
  }
});
