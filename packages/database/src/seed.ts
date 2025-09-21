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

async function seed() {
  try {
    console.log('🌱 Seeding database...');

    // Clear existing data (in reverse order of dependencies)
    await sql`DELETE FROM analysis_cache`;
    await sql`DELETE FROM user_tracked_funds`;
    await sql`DELETE FROM position_changes`;
    await sql`DELETE FROM holdings`;
    await sql`DELETE FROM filings`;
    await sql`DELETE FROM securities`;
    await sql`DELETE FROM fund_managers`;
    await sql`DELETE FROM sessions`;
    await sql`DELETE FROM users`;

    console.log('🧹 Cleared existing data');

    // Read and execute the seed data
    const seedSQL = readFileSync(join(__dirname, '../migrations/002_seed_data.sql'), 'utf8');
    await sql.unsafe(seedSQL);

    console.log('✅ Seed data inserted successfully!');

    // Display summary
    const fundCount = await sql`SELECT COUNT(*) as count FROM fund_managers`;
    const securityCount = await sql`SELECT COUNT(*) as count FROM securities`;
    const holdingCount = await sql`SELECT COUNT(*) as count FROM holdings`;

    console.log(`📊 Database seeded with:`);
    console.log(`   • ${fundCount[0].count} fund managers`);
    console.log(`   • ${securityCount[0].count} securities`);
    console.log(`   • ${holdingCount[0].count} holdings`);

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

seed();