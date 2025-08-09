import { execSync } from 'child_process';
import { PrismaClient } from '@prisma/client';

const SCHEMA = process.env.__TEST_SCHEMA__!; 

beforeAll(() => {
  execSync('npx prisma db push --force-reset', {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
  });
});

afterAll(async () => {
  const prisma = new PrismaClient();
  await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${SCHEMA}" CASCADE`);
  await prisma.$disconnect();
});
