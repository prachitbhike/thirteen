import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { createConnection } from './index.js';

function loadEnvFiles() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const candidates = [
    path.resolve(__dirname, '../../../.env'),
    path.resolve(process.cwd(), '../..', '.env'),
    path.resolve(process.cwd(), '.env')
  ];

  for (const candidate of candidates) {
    dotenv.config({ path: candidate, override: false });
  }
}

async function main() {
  loadEnvFiles();

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const migrationsFolder = path.resolve(__dirname, '../migrations');

  const { client, db } = createConnection();

  try {
    await client.connect();
    console.info(`Running migrations from ${migrationsFolder}`);
    await migrate(db, { migrationsFolder });
    console.info('Database migrations executed successfully');
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
