import { drizzle } from 'drizzle-orm/node-postgres';
import { Client, type ClientConfig } from 'pg';
import * as schema from './schema.js';

let client: Client | undefined;
let db: ReturnType<typeof drizzle> | undefined;

function getDatabaseUrl(connectionString?: string) {
  const url = connectionString ?? process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is not set. Provide your Supabase connection string in the environment.');
  }
  return url;
}

function shouldUseSSL(dbUrl: string): boolean {
  const sslEnv = process.env.DATABASE_SSL?.toLowerCase();
  if (sslEnv === 'true') {
    return true;
  }

  if (sslEnv === 'false') {
    return false;
  }

  if (dbUrl.includes('sslmode=require') || dbUrl.includes('sslmode=verify-full')) {
    return true;
  }

  try {
    const { hostname, protocol } = new URL(dbUrl);
    if (!hostname) {
      return false;
    }

    if (
      protocol.startsWith('postgres') &&
      (hostname.endsWith('.supabase.co') || hostname.endsWith('.supabase.net'))
    ) {
      return true;
    }
  } catch (error) {
    console.warn('Failed to parse database URL. Falling back to non-SSL connection.', error);
    return false;
  }

  return false;
}

export function createConnection(connectionString?: string) {
  const dbUrl = getDatabaseUrl(connectionString);

  const useSSL = shouldUseSSL(dbUrl);
  const rejectUnauthorized = process.env.DATABASE_SSL_REJECT_UNAUTHORIZED?.toLowerCase() !== 'false';

  const clientConfig: ClientConfig = {
    connectionString: dbUrl,
    ...(useSSL
      ? {
          ssl: {
            rejectUnauthorized,
          },
        }
      : {}),
  };

  client = new Client(clientConfig);
  db = drizzle(client, { schema });

  return { client, db };
}

export async function connectDb() {
  if (!client || !db) {
    ({ client, db } = createConnection());
  }

  if (!client.ending) {
    await client.connect();
  }

  return db;
}

export async function disconnectDb() {
  if (client && !client.ending) {
    await client.end();
  }
}

export { db, client };
export * from './schema.js';
