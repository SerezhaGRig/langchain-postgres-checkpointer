const { DB_NAME, DB_USERNAME, DB_PASSWORD, DB_HOST } = process.env;

export const getPostgresConfig = () => ({
  user: DB_USERNAME, // default process.env.PGUSER || process.env.USER
  password: DB_PASSWORD, //default process.env.PGPASSWORD
  host: DB_HOST, // default process.env.PGHOST
  port: 5432, // default process.env.PGPORT
  database: DB_NAME, // default process.env.PGDATABASE || user
});
