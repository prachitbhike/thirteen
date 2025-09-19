import { Hono } from 'hono';
import { eq, and, gte, lte, desc, asc, sql, ilike, inArray } from 'drizzle-orm';
import { holdings, securities, fundManagers, positionChanges } from '@hedge-fund-tracker/database';
import { HoldingFiltersSchema } from '@hedge-fund-tracker/shared';
import { z } from 'zod';

export const holdingRoutes = new Hono();

// Query schemas
const HoldingQuerySchema = z.object({
  page: z.string().transform(Number).default('1'),
  limit: z.string().transform(Number).default('50'),
  sortBy: z.enum(['marketValue', 'sharesHeld', 'percentOfPortfolio', 'companyName', 'periodEndDate']).default('marketValue'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  fundManagerIds: z.string().optional().transform(str => str ? str.split(',').map(Number) : undefined),
  securityIds: z.string().optional().transform(str => str ? str.split(',').map(Number) : undefined),
  sectors: z.string().optional().transform(str => str ? str.split(',') : undefined),
  periodStartDate: z.string().optional().transform(str => str ? new Date(str) : undefined),
  periodEndDate: z.string().optional().transform(str => str ? new Date(str) : undefined),
  minValue: z.string().optional().transform(str => str ? BigInt(parseFloat(str) * 100) : undefined),
  maxValue: z.string().optional().transform(str => str ? BigInt(parseFloat(str) * 100) : undefined),
  search: z.string().optional()
});

const PositionChangesQuerySchema = z.object({
  page: z.string().transform(Number).default('1'),
  limit: z.string().transform(Number).default('50'),
  changeType: z.enum(['NEW', 'SOLD', 'INCREASED', 'DECREASED']).optional(),
  fundManagerIds: z.string().optional().transform(str => str ? str.split(',').map(Number) : undefined),
  periodStartDate: z.string().optional().transform(str => str ? new Date(str) : undefined),
  periodEndDate: z.string().optional().transform(str => str ? new Date(str) : undefined),
  minChangeValue: z.string().optional().transform(str => str ? BigInt(parseFloat(str) * 100) : undefined),
  sortBy: z.enum(['valueChange', 'percentChange', 'toPeriod', 'companyName']).default('valueChange'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
});

// GET /api/holdings - Get holdings with advanced filtering
holdingRoutes.get('/', async (c) => {
  try {
    const db = c.get('db');
    const query = HoldingQuerySchema.parse(c.req.query());

    const offset = (query.page - 1) * query.limit;

    // Build base query with joins
    let baseQuery = db
      .select({
        holding: holdings,
        security: securities,
        fundManager: fundManagers
      })
      .from(holdings)
      .innerJoin(securities, eq(securities.id, holdings.securityId))
      .innerJoin(fundManagers, eq(fundManagers.id, holdings.fundManagerId));

    // Build filters
    const filters = [];

    if (query.fundManagerIds && query.fundManagerIds.length > 0) {
      filters.push(inArray(holdings.fundManagerId, query.fundManagerIds));
    }

    if (query.securityIds && query.securityIds.length > 0) {
      filters.push(inArray(holdings.securityId, query.securityIds));
    }

    if (query.sectors && query.sectors.length > 0) {
      filters.push(inArray(securities.sector, query.sectors));
    }

    if (query.periodStartDate) {
      filters.push(gte(holdings.periodEndDate, query.periodStartDate));
    }

    if (query.periodEndDate) {
      filters.push(lte(holdings.periodEndDate, query.periodEndDate));
    }

    if (query.minValue) {
      filters.push(gte(holdings.marketValue, query.minValue));
    }

    if (query.maxValue) {
      filters.push(lte(holdings.marketValue, query.maxValue));
    }

    if (query.search) {
      filters.push(
        ilike(securities.companyName, `%${query.search}%`)
      );
    }

    if (filters.length > 0) {
      baseQuery = baseQuery.where(and(...filters));
    }

    // Get total count for pagination
    const countQuery = db
      .select({ count: sql<string>`COUNT(*)::text` })
      .from(holdings)
      .innerJoin(securities, eq(securities.id, holdings.securityId));

    if (filters.length > 0) {
      countQuery.where(and(...filters));
    }

    const [{ count }] = await countQuery;
    const total = parseInt(count);

    // Add sorting
    const sortColumn = {
      marketValue: holdings.marketValue,
      sharesHeld: holdings.sharesHeld,
      percentOfPortfolio: holdings.percentOfPortfolio,
      companyName: securities.companyName,
      periodEndDate: holdings.periodEndDate
    }[query.sortBy];

    const sortOrder = query.sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn);
    const holdingsData = await baseQuery
      .orderBy(sortOrder)
      .limit(query.limit)
      .offset(offset);

    // Transform data
    const transformedHoldings = holdingsData.map(h => ({
      id: h.holding.id,
      filingId: h.holding.filingId,
      periodEndDate: h.holding.periodEndDate,
      sharesHeld: h.holding.sharesHeld.toString(),
      marketValue: h.holding.marketValue.toString(),
      percentOfPortfolio: h.holding.percentOfPortfolio,
      investmentDiscretion: h.holding.investmentDiscretion,
      votingAuthority: h.holding.votingAuthority,
      createdAt: h.holding.createdAt,
      security: {
        id: h.security.id,
        cusip: h.security.cusip,
        ticker: h.security.ticker,
        companyName: h.security.companyName,
        securityType: h.security.securityType,
        sector: h.security.sector,
        industry: h.security.industry
      },
      fundManager: {
        id: h.fundManager.id,
        cik: h.fundManager.cik,
        name: h.fundManager.name
      }
    }));

    return c.json({
      success: true,
      data: transformedHoldings,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit)
      }
    });

  } catch (error) {
    console.error('Error fetching holdings:', error);
    return c.json({
      success: false,
      error: 'Failed to fetch holdings'
    }, 500);
  }
});

// GET /api/holdings/position-changes - Get position changes between periods
holdingRoutes.get('/position-changes', async (c) => {
  try {
    const db = c.get('db');
    const query = PositionChangesQuerySchema.parse(c.req.query());

    const offset = (query.page - 1) * query.limit;

    // Build base query with joins
    let baseQuery = db
      .select({
        positionChange: positionChanges,
        security: securities,
        fundManager: fundManagers
      })
      .from(positionChanges)
      .innerJoin(securities, eq(securities.id, positionChanges.securityId))
      .innerJoin(fundManagers, eq(fundManagers.id, positionChanges.fundManagerId));

    // Build filters
    const filters = [];

    if (query.changeType) {
      filters.push(eq(positionChanges.changeType, query.changeType));
    }

    if (query.fundManagerIds && query.fundManagerIds.length > 0) {
      filters.push(inArray(positionChanges.fundManagerId, query.fundManagerIds));
    }

    if (query.periodStartDate) {
      filters.push(gte(positionChanges.toPeriod, query.periodStartDate));
    }

    if (query.periodEndDate) {
      filters.push(lte(positionChanges.toPeriod, query.periodEndDate));
    }

    if (query.minChangeValue) {
      filters.push(gte(positionChanges.valueChange, query.minChangeValue));
    }

    if (filters.length > 0) {
      baseQuery = baseQuery.where(and(...filters));
    }

    // Get total count
    const countQuery = db
      .select({ count: sql<string>`COUNT(*)::text` })
      .from(positionChanges);

    if (filters.length > 0) {
      countQuery.where(and(...filters));
    }

    const [{ count }] = await countQuery;
    const total = parseInt(count);

    // Add sorting
    const sortColumn = {
      valueChange: positionChanges.valueChange,
      percentChange: positionChanges.percentChange,
      toPeriod: positionChanges.toPeriod,
      companyName: securities.companyName
    }[query.sortBy];

    const sortOrder = query.sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn);
    const changesData = await baseQuery
      .orderBy(sortOrder)
      .limit(query.limit)
      .offset(offset);

    // Transform data
    const transformedChanges = changesData.map(c => ({
      id: c.positionChange.id,
      fromPeriod: c.positionChange.fromPeriod,
      toPeriod: c.positionChange.toPeriod,
      sharesChange: c.positionChange.sharesChange?.toString() || '0',
      valueChange: c.positionChange.valueChange?.toString() || '0',
      percentChange: c.positionChange.percentChange,
      changeType: c.positionChange.changeType,
      createdAt: c.positionChange.createdAt,
      security: {
        id: c.security.id,
        cusip: c.security.cusip,
        ticker: c.security.ticker,
        companyName: c.security.companyName,
        sector: c.security.sector,
        industry: c.security.industry
      },
      fundManager: {
        id: c.fundManager.id,
        cik: c.fundManager.cik,
        name: c.fundManager.name
      }
    }));

    return c.json({
      success: true,
      data: transformedChanges,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit)
      }
    });

  } catch (error) {
    console.error('Error fetching position changes:', error);
    return c.json({
      success: false,
      error: 'Failed to fetch position changes'
    }, 500);
  }
});

// GET /api/holdings/aggregations - Get aggregated holdings data
holdingRoutes.get('/aggregations', async (c) => {
  try {
    const db = c.get('db');
    const periodEndDate = c.req.query('periodEndDate');
    const groupBy = c.req.query('groupBy') || 'sector'; // sector, fundManager, security

    // Build date filter
    const dateFilter = periodEndDate ?
      eq(holdings.periodEndDate, new Date(periodEndDate)) :
      undefined;

    let aggregationQuery;

    switch (groupBy) {
      case 'sector':
        aggregationQuery = db
          .select({
            groupKey: securities.sector,
            totalValue: sql<string>`SUM(${holdings.marketValue})::text`,
            positionCount: sql<string>`COUNT(*)::text`,
            uniqueFunds: sql<string>`COUNT(DISTINCT ${holdings.fundManagerId})::text`
          })
          .from(holdings)
          .innerJoin(securities, eq(securities.id, holdings.securityId))
          .groupBy(securities.sector)
          .orderBy(desc(sql`SUM(${holdings.marketValue})`));
        break;

      case 'fundManager':
        aggregationQuery = db
          .select({
            groupKey: fundManagers.name,
            groupId: fundManagers.id,
            totalValue: sql<string>`SUM(${holdings.marketValue})::text`,
            positionCount: sql<string>`COUNT(*)::text`,
            uniqueSecurities: sql<string>`COUNT(DISTINCT ${holdings.securityId})::text`
          })
          .from(holdings)
          .innerJoin(fundManagers, eq(fundManagers.id, holdings.fundManagerId))
          .groupBy(fundManagers.id, fundManagers.name)
          .orderBy(desc(sql`SUM(${holdings.marketValue})`));
        break;

      case 'security':
        aggregationQuery = db
          .select({
            groupKey: securities.companyName,
            groupId: securities.id,
            ticker: securities.ticker,
            sector: securities.sector,
            totalValue: sql<string>`SUM(${holdings.marketValue})::text`,
            totalShares: sql<string>`SUM(${holdings.sharesHeld})::text`,
            fundCount: sql<string>`COUNT(DISTINCT ${holdings.fundManagerId})::text`
          })
          .from(holdings)
          .innerJoin(securities, eq(securities.id, holdings.securityId))
          .groupBy(securities.id, securities.companyName, securities.ticker, securities.sector)
          .orderBy(desc(sql`SUM(${holdings.marketValue})`));
        break;

      default:
        return c.json({
          success: false,
          error: 'Invalid groupBy parameter. Must be: sector, fundManager, or security'
        }, 400);
    }

    if (dateFilter) {
      aggregationQuery = aggregationQuery.where(dateFilter);
    }

    const results = await aggregationQuery.limit(50);

    return c.json({
      success: true,
      data: {
        groupBy,
        periodEndDate: periodEndDate ? new Date(periodEndDate) : null,
        aggregations: results
      }
    });

  } catch (error) {
    console.error('Error fetching holdings aggregations:', error);
    return c.json({
      success: false,
      error: 'Failed to fetch holdings aggregations'
    }, 500);
  }
});

// GET /api/holdings/trends - Get holding trends over time
holdingRoutes.get('/trends', async (c) => {
  try {
    const db = c.get('db');
    const securityId = c.req.query('securityId');
    const fundManagerId = c.req.query('fundManagerId');

    if (!securityId && !fundManagerId) {
      return c.json({
        success: false,
        error: 'Either securityId or fundManagerId is required'
      }, 400);
    }

    let trendQuery;

    if (securityId) {
      // Get trends for a specific security across all funds
      trendQuery = db
        .select({
          periodEndDate: holdings.periodEndDate,
          totalValue: sql<string>`SUM(${holdings.marketValue})::text`,
          totalShares: sql<string>`SUM(${holdings.sharesHeld})::text`,
          fundCount: sql<string>`COUNT(DISTINCT ${holdings.fundManagerId})::text`
        })
        .from(holdings)
        .where(eq(holdings.securityId, parseInt(securityId)))
        .groupBy(holdings.periodEndDate)
        .orderBy(asc(holdings.periodEndDate));
    } else {
      // Get trends for a specific fund across all securities
      trendQuery = db
        .select({
          periodEndDate: holdings.periodEndDate,
          totalValue: sql<string>`SUM(${holdings.marketValue})::text`,
          positionCount: sql<string>`COUNT(*)::text`,
          uniqueSecurities: sql<string>`COUNT(DISTINCT ${holdings.securityId})::text`
        })
        .from(holdings)
        .where(eq(holdings.fundManagerId, parseInt(fundManagerId!)))
        .groupBy(holdings.periodEndDate)
        .orderBy(asc(holdings.periodEndDate));
    }

    const trends = await trendQuery;

    return c.json({
      success: true,
      data: {
        securityId: securityId ? parseInt(securityId) : null,
        fundManagerId: fundManagerId ? parseInt(fundManagerId) : null,
        trends
      }
    });

  } catch (error) {
    console.error('Error fetching holding trends:', error);
    return c.json({
      success: false,
      error: 'Failed to fetch holding trends'
    }, 500);
  }
});