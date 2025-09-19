#!/usr/bin/env tsx

import dotenv from 'dotenv';
import { DataIngestionService } from '../services/data-ingestion-service.js';

dotenv.config();

async function ingestSpecificFund() {
  const ciks = process.argv.slice(2);

  if (ciks.length === 0) {
    console.log('❌ Please provide CIK numbers as arguments');
    console.log('Usage: npm run ingest:fund -- 1234567890 0987654321');
    console.log('\nExample technology hedge fund CIKs:');
    console.log('  - 1649339  (Ark Investment Management)');
    console.log('  - 1067983  (Berkshire Hathaway)');
    console.log('  - 1364742  (Tiger Global Management)');
    process.exit(1);
  }

  const userAgent = process.env.SEC_USER_AGENT || 'HedgeFundTracker info@example.com';
  const ingestionService = new DataIngestionService(userAgent);

  try {
    console.log(`🚀 Starting ingestion for specific funds: ${ciks.join(', ')}`);

    await ingestionService.initialize();

    const result = await ingestionService.ingestForSpecificFunds(ciks, {
      skipExisting: false, // Don't skip existing for specific fund requests
      maxConcurrent: 3
    });

    console.log('\n✅ Fund-specific ingestion completed!');
    console.log(`📊 Results:`);
    console.log(`   - Target CIKs: ${ciks.join(', ')}`);
    console.log(`   - Processed filings: ${result.processedFilings}`);
    console.log(`   - New holdings: ${result.newHoldings}`);
    console.log(`   - Updated securities: ${result.updatedSecurities}`);
    console.log(`   - New fund managers: ${result.newFundManagers}`);
    console.log(`   - Duration: ${(result.duration / 1000).toFixed(2)}s`);

    if (result.errors.length > 0) {
      console.log(`⚠️  Errors encountered: ${result.errors.length}`);
      result.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    }

    // Show stats for the ingested funds
    const stats = await ingestionService.getIngestionStats();
    console.log('\n📈 Current database statistics:');
    console.log(`   - Total fund managers: ${stats.totalFundManagers}`);
    console.log(`   - Total filings: ${stats.totalFilings}`);
    console.log(`   - Total holdings: ${stats.totalHoldings}`);
    console.log(`   - Total securities: ${stats.totalSecurities}`);

  } catch (error) {
    console.error('❌ Fund ingestion failed:', error);
    process.exit(1);
  }
}

ingestSpecificFund();