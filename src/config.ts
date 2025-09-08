import { ClientConfig } from 'pg';

export interface PostgresConfig extends ClientConfig {
  user?: string;
  password?: string;
  host?: string;
  port?: number;
  database?: string;
}

/**
 * Get PostgreSQL configuration from environment variables
 * @param env - Environment variables object (defaults to process.env)
 * @returns PostgreSQL client configuration
 */
export const getPostgresConfig = (env: NodeJS.ProcessEnv = process.env): PostgresConfig => {
  const { DB_NAME, DB_USERNAME, DB_PASSWORD, DB_HOST, DB_PORT } = env;
  
  return {
    user: DB_USERNAME || env.PGUSER || env.USER,
    password: DB_PASSWORD || env.PGPASSWORD,
    host: DB_HOST || env.PGHOST || 'localhost',
    port: DB_PORT ? parseInt(DB_PORT, 10) : (env.PGPORT ? parseInt(env.PGPORT, 10) : 5432),
    database: DB_NAME || env.PGDATABASE || DB_USERNAME || env.PGUSER || env.USER,
  };
};

/**
 * Create PostgreSQL configuration from connection string
 * @param connectionString - PostgreSQL connection string
 * @returns PostgreSQL client configuration
 */
export const getPostgresConfigFromUrl = (connectionString: string): PostgresConfig => {
  return {
    connectionString
  };
};