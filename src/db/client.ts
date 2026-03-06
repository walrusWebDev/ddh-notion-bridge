import { Pool, type PoolConfig, type QueryResultRow } from 'pg';
import { env } from '../config/env.js';

const sslConfig = env.dbSsl ? { rejectUnauthorized: false } : undefined;

const poolConfig: PoolConfig = env.databaseUrl
  ? {
      connectionString: env.databaseUrl,
      ssl: sslConfig,
    }
  : {
      host: env.dbHost,
      port: env.dbPort,
      user: env.dbUser,
      password: env.dbPass,
      database: env.dbName,
      ssl: sslConfig,
    };

// Shared singleton pool, same model as ddh-core.
export const pool = new Pool(poolConfig);

pool.on('error', (err: Error) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

export const query = <T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
) => {
  return pool.query<T>(text, params);
};

export const getClient = () => pool.connect();