import { randomUUID } from 'crypto';

const DB_BASE =
  process.env.DATABASE_URL_BASE ||
  'postgresql://admin:admin123@127.0.0.1:5433/armazem';

const SCHEMA = `test_${randomUUID().replace(/-/g, '')}`;

(process.env as any).__TEST_SCHEMA__ = SCHEMA;

process.env.DATABASE_URL = `${DB_BASE}?schema=${SCHEMA}`;

console.log('[jest] Using test schema:', SCHEMA);
