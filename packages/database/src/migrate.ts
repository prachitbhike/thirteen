import { readFileSync } from 'fs';
import { join } from 'path';
import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required');
}

const sql = postgres(connectionString, {
  ssl: process.env.DATABASE_SSL === 'true' ? {
    rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false'
  } : false,
});

async function migrate() {
  try {
    console.log('🔄 Running database migrations...');

    // Read and execute the initial schema
    const schemaSQL = readFileSync(join(__dirname, '../migrations/001_initial_schema.sql'), 'utf8');
    await sql.unsafe(schemaSQL);
    console.log('✅ Schema migration completed');

    // Read and execute the seed data
    const seedSQL = readFileSync(join(__dirname, '../migrations/002_seed_data.sql'), 'utf8');
    await sql.unsafe(seedSQL);
    console.log('✅ Seed data migration completed');

    console.log('🎉 All migrations completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

migrate();