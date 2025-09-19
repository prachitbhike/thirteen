import { connectDb, fundManagers, securities, filings, holdings, positionChanges } from '@hedge-fund-tracker/database';
import { eq, and, desc } from 'drizzle-orm';
import { SecEdgarClient, EdgarFilingIndex } from './sec-edgar-client.js';
import { FilingParser, ParsedFiling, ParsedHolding } from './filing-parser.js';
import { ApiError, isValidCUSIP, calculatePercentageChange } from '@hedge-fund-tracker/shared';

export interface IngestionOptions {
  startDate?: Date;
  endDate?: Date;
  specificCIKs?: string[];
  skipExisting?: boolean;
  maxConcurrent?: number;
}

export interface IngestionResult {
  processedFilings: number;
  newHoldings: number;
  updatedSecurities: number;
  newFundManagers: number;
  errors: string[];
  duration: number;
}

export class DataIngestionService {
  private secClient: SecEdgarClient;
  private parser: FilingParser;
  private db: any;

  constructor(userAgent: string) {
    this.secClient = new SecEdgarClient(userAgent);
    this.parser = new FilingParser();
  }

  async initialize() {
    this.db = await connectDb();
  }

  /**
   * Main ingestion method to process 13F filings
   */
  async ingestFilings(options: IngestionOptions = {}): Promise<IngestionResult> {
    const startTime = Date.now();
    const result: IngestionResult = {
      processedFilings: 0,
      newHoldings: 0,
      updatedSecurities: 0,
      newFundManagers: 0,
      errors: [],
      duration: 0
    };

    try {
      if (!this.db) await this.initialize();

      // Default to last 7 days if no date range specified
      const endDate = options.endDate || new Date();
      const startDate = options.startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      console.log(`Starting ingestion for period: ${startDate.toISOString()} to ${endDate.toISOString()}`);

      // Get 13F filings from SEC EDGAR
      const filingIndexes = await this.secClient.get13FFilings(startDate, endDate);
      console.log(`Found ${filingIndexes.length} 13F filings to process`);

      // Filter by specific CIKs if provided
      const filteredFilings = options.specificCIKs ?
        filingIndexes.filter(filing => options.specificCIKs!.includes(filing.cik)) :
        filingIndexes;

      // Process filings with concurrency control
      const maxConcurrent = options.maxConcurrent || 5;
      const batches = this.createBatches(filteredFilings, maxConcurrent);

      for (const batch of batches) {
        const batchPromises = batch.map(filing => this.processSingleFiling(filing, options));
        const batchResults = await Promise.allSettled(batchPromises);

        for (const batchResult of batchResults) {
          if (batchResult.status === 'fulfilled') {
            const filingResult = batchResult.value;
            result.processedFilings++;
            result.newHoldings += filingResult.newHoldings;
            result.updatedSecurities += filingResult.updatedSecurities;
            result.newFundManagers += filingResult.newFundManagers;
          } else {
            result.errors.push(batchResult.reason?.message || 'Unknown error');
          }
        }
      }

      // Calculate position changes for processed filings
      console.log('Calculating position changes...');
      await this.calculatePositionChanges();

      result.duration = Date.now() - startTime;
      console.log(`Ingestion completed in ${result.duration}ms`);

      return result;

    } catch (error) {
      result.errors.push(error.message);
      result.duration = Date.now() - startTime;
      return result;
    }
  }

  /**
   * Process a single 13F filing
   */
  private async processSingleFiling(
    filingIndex: EdgarFilingIndex,
    options: IngestionOptions
  ): Promise<{ newHoldings: number; updatedSecurities: number; newFundManagers: number }> {
    try {
      console.log(`Processing filing: ${filingIndex.accession_number} for CIK ${filingIndex.cik}`);

      // Check if filing already exists
      if (options.skipExisting) {
        const existingFiling = await this.db
          .select()
          .from(filings)
          .where(
            and(
              eq(filings.fundManagerId, parseInt(filingIndex.cik)),
              eq(filings.filingDate, new Date(filingIndex.date_filed))
            )
          )
          .limit(1);

        if (existingFiling.length > 0) {
          console.log(`Filing already exists, skipping: ${filingIndex.accession_number}`);
          return { newHoldings: 0, updatedSecurities: 0, newFundManagers: 0 };
        }
      }

      // Download and parse the filing
      const filingContent = await this.secClient.downloadFiling(
        filingIndex.accession_number,
        filingIndex.cik
      );

      const parsedFiling = await this.parser.parseFiling(filingContent);

      // Ensure fund manager exists
      const fundManagerResult = await this.ensureFundManager(filingIndex);

      // Create filing record
      const filingRecord = await this.createFilingRecord(filingIndex, parsedFiling, fundManagerResult.id);

      // Process holdings
      const holdingsResult = await this.processHoldings(
        parsedFiling.informationTable,
        filingRecord.id,
        fundManagerResult.id,
        parsedFiling.coverPage.reportDate
      );

      return {
        newHoldings: holdingsResult.newHoldings,
        updatedSecurities: holdingsResult.updatedSecurities,
        newFundManagers: fundManagerResult.isNew ? 1 : 0
      };

    } catch (error) {
      console.error(`Failed to process filing ${filingIndex.accession_number}:`, error);
      throw new ApiError(
        `Failed to process filing ${filingIndex.accession_number}: ${error.message}`,
        500,
        'FILING_PROCESSING_ERROR'
      );
    }
  }

  /**
   * Ensure fund manager exists in database
   */
  private async ensureFundManager(filingIndex: EdgarFilingIndex): Promise<{ id: number; isNew: boolean }> {
    // Check if fund manager exists
    const existing = await this.db
      .select()
      .from(fundManagers)
      .where(eq(fundManagers.cik, filingIndex.cik))
      .limit(1);

    if (existing.length > 0) {
      return { id: existing[0].id, isNew: false };
    }

    // Create new fund manager
    const [newFundManager] = await this.db
      .insert(fundManagers)
      .values({
        cik: filingIndex.cik,
        name: filingIndex.company_name,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning({ id: fundManagers.id });

    console.log(`Created new fund manager: ${filingIndex.company_name} (CIK: ${filingIndex.cik})`);
    return { id: newFundManager.id, isNew: true };
  }

  /**
   * Create filing record in database
   */
  private async createFilingRecord(
    filingIndex: EdgarFilingIndex,
    parsedFiling: ParsedFiling,
    fundManagerId: number
  ): Promise<{ id: number }> {
    const [filingRecord] = await this.db
      .insert(filings)
      .values({
        fundManagerId,
        filingDate: new Date(filingIndex.date_filed),
        periodEndDate: parsedFiling.coverPage.reportDate,
        formType: filingIndex.form_type,
        totalValue: BigInt(parsedFiling.summaryPage.tableValueTotal * 100), // Convert to cents
        totalPositions: parsedFiling.summaryPage.tableEntryTotal,
        filingUrl: `https://www.sec.gov/Archives/edgar/data/${filingIndex.cik}/${filingIndex.accession_number.replace(/-/g, '')}/${filingIndex.file_name}`,
        processedAt: new Date(),
        createdAt: new Date()
      })
      .returning({ id: filings.id });

    return filingRecord;
  }

  /**
   * Process holdings data from parsed filing
   */
  private async processHoldings(
    holdingsData: ParsedHolding[],
    filingId: number,
    fundManagerId: number,
    periodEndDate: Date
  ): Promise<{ newHoldings: number; updatedSecurities: number }> {
    let newHoldings = 0;
    let updatedSecurities = 0;

    for (const holding of holdingsData) {
      if (!isValidCUSIP(holding.cusip)) {
        console.warn(`Invalid CUSIP skipped: ${holding.cusip}`);
        continue;
      }

      try {
        // Ensure security exists
        const securityResult = await this.ensureSecurity(holding);
        if (securityResult.isNew) updatedSecurities++;

        // Create holding record
        await this.db.insert(holdings).values({
          filingId,
          securityId: securityResult.id,
          fundManagerId,
          periodEndDate,
          sharesHeld: BigInt(holding.shrsOrPrnAmt.sshPrnamt),
          marketValue: BigInt(holding.value * 100), // Convert to cents
          percentOfPortfolio: null, // Will be calculated later
          investmentDiscretion: holding.investmentDiscretion,
          votingAuthority: JSON.stringify(holding.votingAuthority),
          createdAt: new Date()
        });

        newHoldings++;

      } catch (error) {
        console.error(`Failed to process holding for CUSIP ${holding.cusip}:`, error);
      }
    }

    // Update portfolio percentages for this filing
    await this.updatePortfolioPercentages(filingId);

    return { newHoldings, updatedSecurities };
  }

  /**
   * Ensure security exists in database
   */
  private async ensureSecurity(holding: ParsedHolding): Promise<{ id: number; isNew: boolean }> {
    // Check if security exists
    const existing = await this.db
      .select()
      .from(securities)
      .where(eq(securities.cusip, holding.cusip))
      .limit(1);

    if (existing.length > 0) {
      return { id: existing[0].id, isNew: false };
    }

    // Create new security
    const [newSecurity] = await this.db
      .insert(securities)
      .values({
        cusip: holding.cusip,
        companyName: holding.nameOfIssuer,
        securityType: holding.titleOfClass,
        createdAt: new Date()
      })
      .returning({ id: securities.id });

    return { id: newSecurity.id, isNew: true };
  }

  /**
   * Update portfolio percentages for a filing
   */
  private async updatePortfolioPercentages(filingId: number) {
    // Get total portfolio value for this filing
    const totalValueResult = await this.db
      .select({
        totalValue: 'SUM(market_value)'
      })
      .from(holdings)
      .where(eq(holdings.filingId, filingId));

    const totalValue = BigInt(totalValueResult[0]?.totalValue || 0);

    if (totalValue > 0) {
      // Update each holding with its percentage
      const holdingsToUpdate = await this.db
        .select()
        .from(holdings)
        .where(eq(holdings.filingId, filingId));

      for (const holding of holdingsToUpdate) {
        const percentage = Number(holding.marketValue * BigInt(100)) / Number(totalValue);

        await this.db
          .update(holdings)
          .set({ percentOfPortfolio: percentage })
          .where(eq(holdings.id, holding.id));
      }
    }
  }

  /**
   * Calculate position changes between periods
   */
  private async calculatePositionChanges() {
    // This is a simplified version - in production, you'd want more sophisticated logic
    const recentHoldings = await this.db
      .select()
      .from(holdings)
      .orderBy(desc(holdings.periodEndDate))
      .limit(1000);

    // Group by fund manager and security
    const holdingsByFundAndSecurity = new Map<string, any[]>();

    for (const holding of recentHoldings) {
      const key = `${holding.fundManagerId}-${holding.securityId}`;
      if (!holdingsByFundAndSecurity.has(key)) {
        holdingsByFundAndSecurity.set(key, []);
      }
      holdingsByFundAndSecurity.get(key)!.push(holding);
    }

    // Calculate changes for each fund-security combination
    for (const [key, holdingsList] of holdingsByFundAndSecurity) {
      if (holdingsList.length < 2) continue;

      // Sort by period end date
      holdingsList.sort((a, b) => new Date(b.periodEndDate).getTime() - new Date(a.periodEndDate).getTime());

      const current = holdingsList[0];
      const previous = holdingsList[1];

      const sharesChange = current.sharesHeld - previous.sharesHeld;
      const valueChange = current.marketValue - previous.marketValue;
      const percentChange = calculatePercentageChange(Number(previous.marketValue), Number(current.marketValue));

      let changeType: string;
      if (sharesChange > 0) changeType = 'INCREASED';
      else if (sharesChange < 0) changeType = 'DECREASED';
      else changeType = 'UNCHANGED';

      // Insert position change record
      await this.db.insert(positionChanges).values({
        fundManagerId: current.fundManagerId,
        securityId: current.securityId,
        fromPeriod: previous.periodEndDate,
        toPeriod: current.periodEndDate,
        sharesChange,
        valueChange,
        percentChange,
        changeType,
        createdAt: new Date()
      });
    }
  }

  /**
   * Create batches for concurrent processing
   */
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Ingest filings for specific fund managers
   */
  async ingestForSpecificFunds(ciks: string[], options: IngestionOptions = {}): Promise<IngestionResult> {
    return this.ingestFilings({
      ...options,
      specificCIKs: ciks
    });
  }

  /**
   * Get ingestion status and statistics
   */
  async getIngestionStats(): Promise<{
    totalFilings: number;
    totalHoldings: number;
    totalFundManagers: number;
    totalSecurities: number;
    lastIngestionDate: Date | null;
  }> {
    const [
      totalFilings,
      totalHoldings,
      totalFundManagers,
      totalSecurities,
      lastIngestion
    ] = await Promise.all([
      this.db.select({ count: 'COUNT(*)' }).from(filings),
      this.db.select({ count: 'COUNT(*)' }).from(holdings),
      this.db.select({ count: 'COUNT(*)' }).from(fundManagers),
      this.db.select({ count: 'COUNT(*)' }).from(securities),
      this.db.select({ maxDate: 'MAX(processed_at)' }).from(filings)
    ]);

    return {
      totalFilings: parseInt(totalFilings[0]?.count || '0'),
      totalHoldings: parseInt(totalHoldings[0]?.count || '0'),
      totalFundManagers: parseInt(totalFundManagers[0]?.count || '0'),
      totalSecurities: parseInt(totalSecurities[0]?.count || '0'),
      lastIngestionDate: lastIngestion[0]?.maxDate ? new Date(lastIngestion[0].maxDate) : null
    };
  }
}