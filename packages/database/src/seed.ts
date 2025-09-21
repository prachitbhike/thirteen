import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { and, eq } from 'drizzle-orm';
import { createConnection } from './index.js';
import {
  fundManagers,
  filings,
  securities,
  holdings,
  positionChanges
} from './schema.js';

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

type Database = ReturnType<typeof createConnection>['db'];

async function ensureFund(db: Database, name: string, cik: string) {
  await db
    .insert(fundManagers)
    .values({ name, cik })
    .onConflictDoNothing({ target: fundManagers.cik });

  const [fund] = await db
    .select()
    .from(fundManagers)
    .where(eq(fundManagers.cik, cik))
    .limit(1);

  if (!fund) {
    throw new Error(`Failed to ensure fund manager ${name}`);
  }

  return fund;
}

async function ensureSecurity(
  db: Database,
  details: { cusip: string; ticker: string; companyName: string; sector: string; industry: string }
) {
  await db
    .insert(securities)
    .values(details)
    .onConflictDoNothing({ target: securities.cusip });

  const [record] = await db
    .select()
    .from(securities)
    .where(eq(securities.cusip, details.cusip))
    .limit(1);

  if (!record) {
    throw new Error(`Failed to ensure security ${details.ticker}`);
  }

  return record;
}

async function ensureFiling(
  db: Database,
  values: {
    fundManagerId: number;
    filingDate: Date;
    periodEndDate: Date;
    formType: string;
    totalValue: bigint;
    totalPositions: number;
    filingUrl: string;
    processedAt: Date;
  }
) {
  const [existing] = await db
    .select()
    .from(filings)
    .where(
      and(
        eq(filings.fundManagerId, values.fundManagerId),
        eq(filings.periodEndDate, values.periodEndDate)
      )
    )
    .limit(1);

  if (existing) {
    return existing;
  }

  const [inserted] = await db.insert(filings).values(values).returning();
  if (!inserted) {
    throw new Error('Failed to insert sample filing');
  }

  return inserted;
}

async function main() {
  loadEnvFiles();

  const { client, db } = createConnection();

  try {
    await client.connect();

    const [existingHolding] = await db.select().from(holdings).limit(1);
    if (existingHolding) {
      console.info('Database already contains holdings; skipping seed.');
      return;
    }

    console.info('Seeding reference data…');

    const alphaCapital = await ensureFund(db, 'AlphaWave Capital', '0001800001');
    const apexPartners = await ensureFund(db, 'Apex Partners LP', '0001900002');

    const apple = await ensureSecurity(db, {
      cusip: '037833100',
      ticker: 'AAPL',
      companyName: 'Apple Inc.',
      sector: 'Technology',
      industry: 'Consumer Electronics'
    });

    const microsoft = await ensureSecurity(db, {
      cusip: '594918104',
      ticker: 'MSFT',
      companyName: 'Microsoft Corporation',
      sector: 'Technology',
      industry: 'Software'
    });

    const tesla = await ensureSecurity(db, {
      cusip: '88160R101',
      ticker: 'TSLA',
      companyName: 'Tesla, Inc.',
      sector: 'Consumer Discretionary',
      industry: 'Automotive'
    });

    console.info('Ensuring filings…');

    const alphaFiling = await ensureFiling(db, {
      fundManagerId: alphaCapital.id,
      filingDate: new Date('2024-02-14'),
      periodEndDate: new Date('2023-12-31'),
      formType: '13F-HR',
      totalValue: BigInt(2_400_000_000),
      totalPositions: 40,
      filingUrl: 'https://www.sec.gov/Archives/edgar/data/0001800001/alpha-13f-2023q4.html',
      processedAt: new Date()
    });

    const apexFiling = await ensureFiling(db, {
      fundManagerId: apexPartners.id,
      filingDate: new Date('2024-02-21'),
      periodEndDate: new Date('2023-12-31'),
      formType: '13F-HR',
      totalValue: BigInt(1_600_000_000),
      totalPositions: 28,
      filingUrl: 'https://www.sec.gov/Archives/edgar/data/0001900002/apex-13f-2023q4.html',
      processedAt: new Date()
    });

    console.info('Populating holdings snapshot…');

    await db.insert(holdings).values([
      {
        filingId: alphaFiling.id,
        securityId: apple.id,
        fundManagerId: alphaCapital.id,
        periodEndDate: alphaFiling.periodEndDate,
        sharesHeld: BigInt(12_500_000),
        marketValue: BigInt(1_250_000_000),
        percentOfPortfolio: '52.1'
      },
      {
        filingId: alphaFiling.id,
        securityId: microsoft.id,
        fundManagerId: alphaCapital.id,
        periodEndDate: alphaFiling.periodEndDate,
        sharesHeld: BigInt(4_200_000),
        marketValue: BigInt(980_000_000),
        percentOfPortfolio: '40.8'
      },
      {
        filingId: apexFiling.id,
        securityId: tesla.id,
        fundManagerId: apexPartners.id,
        periodEndDate: apexFiling.periodEndDate,
        sharesHeld: BigInt(3_100_000),
        marketValue: BigInt(750_000_000),
        percentOfPortfolio: '46.8'
      }
    ]);

    console.info('Recording position changes…');

    await db.insert(positionChanges).values([
      {
        fundManagerId: alphaCapital.id,
        securityId: apple.id,
        fromPeriod: new Date('2023-09-30'),
        toPeriod: new Date('2023-12-31'),
        sharesChange: BigInt(1_500_000),
        valueChange: BigInt(150_000_000),
        percentChange: '13.6',
        changeType: 'INCREASED'
      },
      {
        fundManagerId: apexPartners.id,
        securityId: tesla.id,
        fromPeriod: new Date('2023-09-30'),
        toPeriod: new Date('2023-12-31'),
        sharesChange: BigInt(-400_000),
        valueChange: BigInt(-90_000_000),
        percentChange: '-11.4',
        changeType: 'DECREASED'
      }
    ]);

    console.info('Seed data inserted successfully.');
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error('Seeding failed:', error);
  process.exit(1);
});
