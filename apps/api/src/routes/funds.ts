import { Hono } from 'hono';
import { eq, ilike, desc, asc, sql, and, gte, lte } from 'drizzle-orm';
import { fundManagers, filings, holdings, securities } from '@hedge-fund-tracker/database';
import { FundManagerSchema, ApiResponseSchema, PaginationSchema } from '@hedge-fund-tracker/shared';
import { z } from 'zod';

export const fundRoutes = new Hono();

// Query schemas
const FundListQuerySchema = z.object({
  page: z.string().transform(Number).default('1'),
  limit: z.string().transform(Number).default('20'),
  search: z.string().optional(),
  sortBy: z.enum(['name', 'totalValue', 'lastFiling', 'createdAt']).default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc')
});

const FundStatsQuerySchema = z.object({
  fromDate: z.string().transform(str => new Date(str)).optional(),
  toDate: z.string().transform(str => new Date(str)).optional()
});

// GET /api/funds - List all fund managers with pagination and search
fundRoutes.get('/', async (c) => {
  try {
    const db = c.get('db');
    const query = FundListQuerySchema.parse(c.req.query());

    const offset = (query.page - 1) * query.limit;

    // Build base query
    let baseQuery = db
      .select({
        fund: fundManagers,
        totalValue: sql<string>`COALESCE(SUM(${holdings.marketValue}), 0)::text`,
        totalPositions: sql<string>`COUNT(DISTINCT ${holdings.id})::text`,
        lastFilingDate: sql<string>`MAX(${filings.filingDate})`,
        filingCount: sql<string>`COUNT(DISTINCT ${filings.id})::text`
      })
      .from(fundManagers)
      .leftJoin(filings, eq(filings.fundManagerId, fundManagers.id))
      .leftJoin(holdings, eq(holdings.fundManagerId, fundManagers.id))
      .groupBy(fundManagers.id);

    // Add search filter
    if (query.search) {
      baseQuery = baseQuery.where(
        ilike(fundManagers.name, `%${query.search}%`)
      );
    }

    // Get total count for pagination
    const countQuery = db
      .select({ count: sql<string>`COUNT(DISTINCT ${fundManagers.id})::text` })
      .from(fundManagers);

    if (query.search) {
      countQuery.where(ilike(fundManagers.name, `%${query.search}%`));
    }

    const [totalResult] = await countQuery;
    const total = parseInt(totalResult.count);

    // Add sorting
    const sortColumn = {
      name: fundManagers.name,
      totalValue: sql`SUM(${holdings.marketValue})`,
      lastFiling: sql`MAX(${filings.filingDate})`,
      createdAt: fundManagers.createdAt
    }[query.sortBy];

    const sortOrder = query.sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn);
    baseQuery = baseQuery.orderBy(sortOrder);

    // Add pagination
    const funds = await baseQuery.limit(query.limit).offset(offset);

    // Transform data for response
    const transformedFunds = funds.map(fund => ({
      ...fund.fund,
      stats: {
        totalValue: fund.totalValue,
        totalPositions: parseInt(fund.totalPositions),
        filingCount: parseInt(fund.filingCount),
        lastFilingDate: fund.lastFilingDate ? new Date(fund.lastFilingDate) : null
      }
    }));

    const pagination = {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit)
    };

    return c.json({
      success: true,
      data: transformedFunds,
      pagination
    });

  } catch (error) {
    console.error('Error fetching funds:', error);
    return c.json({
      success: false,
      error: 'Failed to fetch fund managers'
    }, 500);
  }
});

// GET /api/funds/:id - Get specific fund manager details
fundRoutes.get('/:id', async (c) => {
  try {
    const db = c.get('db');
    const fundId = parseInt(c.req.param('id'));

    if (isNaN(fundId)) {
      return c.json({
        success: false,
        error: 'Invalid fund ID'
      }, 400);
    }

    // Get fund manager with aggregated stats
    const [fund] = await db
      .select({
        fund: fundManagers,
        totalValue: sql<string>`COALESCE(SUM(${holdings.marketValue}), 0)::text`,
        totalPositions: sql<string>`COUNT(DISTINCT ${holdings.id})::text`,
        uniqueSecurities: sql<string>`COUNT(DISTINCT ${holdings.securityId})::text`,
        lastFilingDate: sql<string>`MAX(${filings.filingDate})`,
        filingCount: sql<string>`COUNT(DISTINCT ${filings.id})::text`
      })
      .from(fundManagers)
      .leftJoin(filings, eq(filings.fundManagerId, fundManagers.id))
      .leftJoin(holdings, eq(holdings.fundManagerId, fundManagers.id))
      .where(eq(fundManagers.id, fundId))
      .groupBy(fundManagers.id);

    if (!fund) {
      return c.json({
        success: false,
        error: 'Fund manager not found'
      }, 404);
    }

    // Get recent filings
    const recentFilings = await db
      .select()
      .from(filings)
      .where(eq(filings.fundManagerId, fundId))
      .orderBy(desc(filings.filingDate))
      .limit(10);

    // Get top holdings for the most recent filing
    const topHoldings = await db
      .select({
        holding: holdings,
        security: securities
      })
      .from(holdings)
      .innerJoin(securities, eq(securities.id, holdings.securityId))
      .where(eq(holdings.fundManagerId, fundId))
      .orderBy(desc(holdings.marketValue))
      .limit(10);

    return c.json({
      success: true,
      data: {
        ...fund.fund,
        stats: {
          totalValue: fund.totalValue,
          totalPositions: parseInt(fund.totalPositions),
          uniqueSecurities: parseInt(fund.uniqueSecurities),
          filingCount: parseInt(fund.filingCount),
          lastFilingDate: fund.lastFilingDate ? new Date(fund.lastFilingDate) : null
        },
        recentFilings,
        topHoldings: topHoldings.map(h => ({
          ...h.holding,
          security: h.security
        }))
      }
    });

  } catch (error) {
    console.error('Error fetching fund details:', error);
    return c.json({
      success: false,
      error: 'Failed to fetch fund manager details'
    }, 500);
  }
});

// GET /api/funds/:id/performance - Get fund performance metrics
fundRoutes.get('/:id/performance', async (c) => {
  try {
    const db = c.get('db');
    const fundId = parseInt(c.req.param('id'));
    const query = FundStatsQuerySchema.parse(c.req.query());

    if (isNaN(fundId)) {
      return c.json({
        success: false,
        error: 'Invalid fund ID'
      }, 400);
    }

    // Build date filters
    let dateFilters = [eq(holdings.fundManagerId, fundId)];
    if (query.fromDate) {
      dateFilters.push(gte(holdings.periodEndDate, query.fromDate));
    }
    if (query.toDate) {
      dateFilters.push(lte(holdings.periodEndDate, query.toDate));
    }

    // Get portfolio value over time
    const portfolioHistory = await db
      .select({
        periodEndDate: holdings.periodEndDate,
        totalValue: sql<string>`SUM(${holdings.marketValue})::text`,
        positionCount: sql<string>`COUNT(*)::text`
      })
      .from(holdings)
      .where(and(...dateFilters))
      .groupBy(holdings.periodEndDate)
      .orderBy(asc(holdings.periodEndDate));

    // Get sector allocation for most recent period
    const latestPeriod = portfolioHistory[portfolioHistory.length - 1]?.periodEndDate;

    const sectorAllocation = latestPeriod ? await db
      .select({
        sector: securities.sector,
        totalValue: sql<string>`SUM(${holdings.marketValue})::text`,
        positionCount: sql<string>`COUNT(*)::text`
      })
      .from(holdings)
      .innerJoin(securities, eq(securities.id, holdings.securityId))
      .where(
        and(
          eq(holdings.fundManagerId, fundId),
          eq(holdings.periodEndDate, latestPeriod)
        )
      )
      .groupBy(securities.sector)
      .orderBy(desc(sql`SUM(${holdings.marketValue})`)) : [];

    // Calculate performance metrics
    const performance = {
      totalReturn: 0, // Would calculate based on historical data
      volatility: 0,  // Would calculate based on price movements
      sharpeRatio: 0, // Would calculate with risk-free rate
      maxDrawdown: 0  // Would calculate based on peak-to-trough
    };

    return c.json({
      success: true,
      data: {
        portfolioHistory: portfolioHistory.map(p => ({
          ...p,
          totalValue: p.totalValue,
          positionCount: parseInt(p.positionCount)
        })),
        sectorAllocation: sectorAllocation.map(s => ({
          ...s,
          totalValue: s.totalValue,
          positionCount: parseInt(s.positionCount)
        })),
        performance
      }
    });

  } catch (error) {
    console.error('Error fetching fund performance:', error);
    return c.json({
      success: false,
      error: 'Failed to fetch fund performance'
    }, 500);
  }
});

// GET /api/funds/:id/holdings - Get fund holdings with filters
fundRoutes.get('/:id/holdings', async (c) => {
  try {
    const db = c.get('db');
    const fundId = parseInt(c.req.param('id'));
    const page = parseInt(c.req.query('page') || '1');
    const limit = parseInt(c.req.query('limit') || '20');
    const sortBy = c.req.query('sortBy') || 'marketValue';
    const sortOrder = c.req.query('sortOrder') || 'desc';

    if (isNaN(fundId)) {
      return c.json({
        success: false,
        error: 'Invalid fund ID'
      }, 400);
    }

    const offset = (page - 1) * limit;

    // Get holdings with security details
    const holdingsQuery = db
      .select({
        holding: holdings,
        security: securities
      })
      .from(holdings)
      .innerJoin(securities, eq(securities.id, holdings.securityId))
      .where(eq(holdings.fundManagerId, fundId));

    // Add sorting
    const sortColumn = {
      marketValue: holdings.marketValue,
      sharesHeld: holdings.sharesHeld,
      percentOfPortfolio: holdings.percentOfPortfolio,
      companyName: securities.companyName,
      periodEndDate: holdings.periodEndDate
    }[sortBy] || holdings.marketValue;

    const sortOrderClause = sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn);

    const holdingsData = await holdingsQuery
      .orderBy(sortOrderClause)
      .limit(limit)
      .offset(offset);

    // Get total count
    const [{ count }] = await db
      .select({ count: sql<string>`COUNT(*)::text` })
      .from(holdings)
      .where(eq(holdings.fundManagerId, fundId));

    const total = parseInt(count);

    return c.json({
      success: true,
      data: holdingsData.map(h => ({
        ...h.holding,
        security: h.security
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching fund holdings:', error);
    return c.json({
      success: false,
      error: 'Failed to fetch fund holdings'
    }, 500);
  }
});

// POST /api/funds/:id/track - Add fund to user's tracking list (placeholder for user management)
fundRoutes.post('/:id/track', async (c) => {
  try {
    const fundId = parseInt(c.req.param('id'));

    if (isNaN(fundId)) {
      return c.json({
        success: false,
        error: 'Invalid fund ID'
      }, 400);
    }

    // TODO: Implement user tracking when user management is added
    return c.json({
      success: true,
      data: {
        message: 'Fund tracking will be implemented with user management',
        fundId
      }
    });

  } catch (error) {
    console.error('Error tracking fund:', error);
    return c.json({
      success: false,
      error: 'Failed to track fund'
    }, 500);
  }
});