import { drizzle } from 'drizzle-orm/node-postgres';
import { Client } from 'pg';
import * as schema from './schema.js';

let client: Client;
let db: ReturnType<typeof drizzle>;

export function createConnection(connectionString?: string) {
  const dbUrl = connectionString || process.env.DATABASE_URL || 'postgresql://localhost:5432/hedge_fund_tracker';

  client = new Client({
    connectionString: dbUrl,
  });

  db = drizzle(client, { schema });
  return { client, db };
}

export async function connectDb() {
  if (!client) {
    createConnection();
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