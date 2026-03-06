import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import path from 'path';

// Resolve .env relative to this module so SSH/stdio launch cwd does not matter.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../../.env');

dotenv.config({ path: envPath });

const toInt = (value: string | undefined, fallback: number): number => {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

const toBool = (value: string | undefined, fallback = false): boolean => {
  if (value == null) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
};

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',

  // Notion integration
  notionToken: process.env.NOTION_TOKEN,
  notionParentPageId: process.env.PARENT_PAGE_ID,
  engineeringLogsDbId: process.env.ENGINEERING_LOGS_DB_ID,
  journalSummariesDbId: process.env.JOURNAL_SUMMARIES_DB_ID,

  // Railway-style single URL (optional)
  databaseUrl: process.env.DATABASE_URL,

  // Existing ddh-core discrete vars
  dbHost: process.env.DB_HOST ?? 'postgres',
  dbPort: toInt(process.env.DB_PORT, 5432),
  dbUser: process.env.DB_USER ?? 'ddh_user',
  dbPass: process.env.DB_PASS ?? 'ddh_secret',
  dbName: process.env.DB_NAME ?? 'ddh_db',

  // Useful when Railway/Postgres requires TLS
  dbSsl: toBool(process.env.DB_SSL, false),
} as const;