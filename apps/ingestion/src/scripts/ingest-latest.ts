#!/usr/bin/env tsx

import dotenv from 'dotenv';
import { DataIngestionService } from '../services/data-ingestion-service.js';

dotenv.config();

async function ingestLatest() {
  const userAgent = process.env.SEC_USER_AGENT || 'HedgeFundTracker info@example.com';
  const ingestionService = new DataIngestionService(userAgent);

  try {
    console.log('🚀 Starting latest 13F filings ingestion...');

    await ingestionService.initialize();

    // Get filings from the last 30 days
    const endDate = new Date();
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const result = await ingestionService.ingestFilings({
      startDate,
      endDate,
      skipExisting: true,
      maxConcurrent: 5
    });

    console.log('\n✅ Ingestion completed successfully!');
    console.log(`📊 Results:`);
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

  } catch (error) {
    console.error('❌ Ingestion failed:', error);
    process.exit(1);
  }
}

ingestLatest();