import { randomUUID } from 'crypto';
import { URL } from 'url';

const RAW_BASE =
  process.env.DATABASE_URL_BASE
  || 'postgresql://admin:admin123@localhost:5433/armazem?schema=public';

const SCHEMA = `test_${randomUUID().replace(/-/g, '')}`;
(process.env as any).__TEST_SCHEMA__ = SCHEMA;

const url = new URL(RAW_BASE);
// garanta que só exista UMA chave "schema"
url.searchParams.set('schema', SCHEMA);

process.env.DATABASE_URL = url.toString();
process.env.TELEGRAM_ENABLED = process.env.TELEGRAM_ENABLED ?? 'false';
process.env.TEST_BYPASS_RBAC = 'true';

console.log('[jest] Using test schema:', SCHEMA);
