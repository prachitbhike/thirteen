import { Hono } from 'hono';
import { ilike, or, sql, desc, eq, and } from 'drizzle-orm';
import { fundManagers, securities, holdings } from '@hedge-fund-tracker/database';
import { z } from 'zod';

export const searchRoutes = new Hono();

// Query schemas
const SearchQuerySchema = z.object({
  q: z.string().min(1, 'Search query is required'),
  type: z.enum(['all', 'funds', 'securities', 'tickers']).default('all'),
  limit: z.string().transform(Number).default('20')
});

const AutocompleteQuerySchema = z.object({
  q: z.string().min(1, 'Query is required'),
  type: z.enum(['funds', 'securities', 'tickers']).default('all'),
  limit: z.string().transform(Number).default('10')
});

// GET /api/search - Global search across funds and securities
searchRoutes.get('/', async (c) => {
  try {
    const db = c.get('db');
    const query = SearchQuerySchema.parse(c.req.query());

    const searchTerm = `%${query.q}%`;
    const results: any = {
      query: query.q,
      type: query.type,
      results: {
        funds: [],
        securities: []
      }
    };

    // Search funds
    if (query.type === 'all' || query.type === 'funds') {
      const fundResults = await db
        .select({
          fund: fundManagers,
          totalValue: sql<string>`COALESCE(SUM(${holdings.marketValue}), 0)::text`,
          positionCount: sql<string>`COUNT(${holdings.id})::text`,
          latestPeriod: sql<string>`MAX(${holdings.periodEndDate})`
        })
        .from(fundManagers)
        .leftJoin(holdings, eq(holdings.fundManagerId, fundManagers.id))
        .where(
          or(
            ilike(fundManagers.name, searchTerm),
            ilike(fundManagers.cik, searchTerm)
          )
        )
        .groupBy(fundManagers.id)
        .orderBy(desc(sql`COALESCE(SUM(${holdings.marketValue}), 0)`))
        .limit(query.limit);

      results.results.funds = fundResults.map(fund => ({
        ...fund.fund,
        type: 'fund',
        stats: {
          totalValue: fund.totalValue,
          positionCount: parseInt(fund.positionCount),
          latestPeriod: fund.latestPeriod ? new Date(fund.latestPeriod) : null
        }
      }));
    }

    // Search securities
    if (query.type === 'all' || query.type === 'securities' || query.type === 'tickers') {
      const securityFilters = [
        ilike(securities.companyName, searchTerm)
      ];

      if (query.type === 'all' || query.type === 'tickers') {
        securityFilters.push(ilike(securities.ticker, searchTerm));
        securityFilters.push(ilike(securities.cusip, searchTerm));
      }

      const securityResults = await db
        .select({
          security: securities,
          totalValue: sql<string>`COALESCE(SUM(${holdings.marketValue}), 0)::text`,
          fundCount: sql<string>`COUNT(DISTINCT ${holdings.fundManagerId})::text`,
          totalShares: sql<string>`COALESCE(SUM(${holdings.sharesHeld}), 0)::text`,
          latestPeriod: sql<string>`MAX(${holdings.periodEndDate})`
        })
        .from(securities)
        .leftJoin(holdings, eq(holdings.securityId, securities.id))
        .where(or(...securityFilters))
        .groupBy(securities.id)
        .orderBy(desc(sql`COALESCE(SUM(${holdings.marketValue}), 0)`))
        .limit(query.limit);

      results.results.securities = securityResults.map(security => ({
        ...security.security,
        type: 'security',
        stats: {
          totalValue: security.totalValue,
          fundCount: parseInt(security.fundCount),
          totalShares: security.totalShares,
          latestPeriod: security.latestPeriod ? new Date(security.latestPeriod) : null
        }
      }));
    }

    // Calculate total results count
    const totalResults = results.results.funds.length + results.results.securities.length;

    return c.json({
      success: true,
      data: {
        ...results,
        totalResults,
        hasMore: totalResults >= query.limit
      }
    });

  } catch (error) {
    console.error('Error performing search:', error);
    return c.json({
      success: false,
      error: 'Search failed'
    }, 500);
  }
});

// GET /api/search/autocomplete - Autocomplete suggestions
searchRoutes.get('/autocomplete', async (c) => {
  try {
    const db = c.get('db');
    const query = AutocompleteQuerySchema.parse(c.req.query());

    const searchTerm = `%${query.q}%`;
    const suggestions: any[] = [];

    // Fund suggestions
    if (query.type === 'all' || query.type === 'funds') {
      const fundSuggestions = await db
        .select({
          id: fundManagers.id,
          label: fundManagers.name,
          value: fundManagers.name,
          type: sql<string>`'fund'`,
          metadata: sql<string>`JSON_BUILD_OBJECT('cik', ${fundManagers.cik})`
        })
        .from(fundManagers)
        .where(
          or(
            ilike(fundManagers.name, searchTerm),
            ilike(fundManagers.cik, searchTerm)
          )
        )
        .orderBy(fundManagers.name)
        .limit(Math.floor(query.limit / 2));

      suggestions.push(...fundSuggestions);
    }

    // Security suggestions
    if (query.type === 'all' || query.type === 'securities' || query.type === 'tickers') {
      const securitySuggestions = await db
        .select({
          id: securities.id,
          label: sql<string>`CASE
            WHEN ${securities.ticker} IS NOT NULL
            THEN ${securities.companyName} || ' (' || ${securities.ticker} || ')'
            ELSE ${securities.companyName}
          END`,
          value: securities.companyName,
          type: sql<string>`'security'`,
          metadata: sql<string>`JSON_BUILD_OBJECT(
            'ticker', ${securities.ticker},
            'cusip', ${securities.cusip},
            'sector', ${securities.sector}
          )`
        })
        .from(securities)
        .where(
          or(
            ilike(securities.companyName, searchTerm),
            ilike(securities.ticker, searchTerm),
            ilike(securities.cusip, searchTerm)
          )
        )
        .orderBy(securities.companyName)
        .limit(Math.floor(query.limit / 2));

      suggestions.push(...securitySuggestions);
    }

    // Sort suggestions by relevance (exact matches first)
    const sortedSuggestions = suggestions.sort((a, b) => {
      const aExact = a.value.toLowerCase().includes(query.q.toLowerCase());
      const bExact = b.value.toLowerCase().includes(query.q.toLowerCase());

      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
      return a.value.localeCompare(b.value);
    });

    return c.json({
      success: true,
      data: {
        query: query.q,
        suggestions: sortedSuggestions.slice(0, query.limit)
      }
    });

  } catch (error) {
    console.error('Error getting autocomplete suggestions:', error);
    return c.json({
      success: false,
      error: 'Autocomplete failed'
    }, 500);
  }
});

// GET /api/search/similar - Find similar funds or securities
searchRoutes.get('/similar', async (c) => {
  try {
    const db = c.get('db');
    const entityType = c.req.query('type'); // 'fund' or 'security'
    const entityId = c.req.query('id');
    const limit = parseInt(c.req.query('limit') || '10');

    if (!entityType || !entityId) {
      return c.json({
        success: false,
        error: 'Both type and id parameters are required'
      }, 400);
    }

    let similarEntities: any[] = [];

    if (entityType === 'fund') {
      // Find similar funds based on portfolio overlap
      const targetFundId = parseInt(entityId);

      // Get the target fund's holdings to find funds with similar positions
      const similarFunds = await db
        .select({
          fund: fundManagers,
          commonHoldings: sql<string>`COUNT(DISTINCT ${holdings.securityId})::text`,
          totalValue: sql<string>`SUM(${holdings.marketValue})::text`
        })
        .from(fundManagers)
        .innerJoin(holdings, eq(holdings.fundManagerId, fundManagers.id))
        .where(
          and(
            sql`${holdings.securityId} IN (
              SELECT security_id FROM ${holdings}
              WHERE fund_manager_id = ${targetFundId}
            )`,
            sql`${fundManagers.id} != ${targetFundId}`
          )
        )
        .groupBy(fundManagers.id)
        .orderBy(desc(sql`COUNT(DISTINCT ${holdings.securityId})`))
        .limit(limit);

      similarEntities = similarFunds.map(fund => ({
        ...fund.fund,
        similarity: {
          commonHoldings: parseInt(fund.commonHoldings),
          totalValue: fund.totalValue
        }
      }));

    } else if (entityType === 'security') {
      // Find similar securities based on funds that hold them
      const targetSecurityId = parseInt(entityId);

      const similarSecurities = await db
        .select({
          security: securities,
          commonFunds: sql<string>`COUNT(DISTINCT ${holdings.fundManagerId})::text`,
          totalValue: sql<string>`SUM(${holdings.marketValue})::text`
        })
        .from(securities)
        .innerJoin(holdings, eq(holdings.securityId, securities.id))
        .where(
          and(
            sql`${holdings.fundManagerId} IN (
              SELECT fund_manager_id FROM ${holdings}
              WHERE security_id = ${targetSecurityId}
            )`,
            sql`${securities.id} != ${targetSecurityId}`
          )
        )
        .groupBy(securities.id)
        .orderBy(desc(sql`COUNT(DISTINCT ${holdings.fundManagerId})`))
        .limit(limit);

      similarEntities = similarSecurities.map(security => ({
        ...security.security,
        similarity: {
          commonFunds: parseInt(security.commonFunds),
          totalValue: security.totalValue
        }
      }));
    } else {
      return c.json({
        success: false,
        error: 'Invalid type parameter. Must be "fund" or "security"'
      }, 400);
    }

    return c.json({
      success: true,
      data: {
        entityType,
        entityId: parseInt(entityId),
        similar: similarEntities
      }
    });

  } catch (error) {
    console.error('Error finding similar entities:', error);
    return c.json({
      success: false,
      error: 'Failed to find similar entities'
    }, 500);
  }
});

// GET /api/search/trending - Get trending searches and popular entities
searchRoutes.get('/trending', async (c) => {
  try {
    const db = c.get('db');

    // Get most actively traded securities (based on recent position changes)
    const trendingSecurities = await db
      .select({
        security: securities,
        activityScore: sql<string>`COUNT(*)::text`,
        recentValue: sql<string>`SUM(ABS(COALESCE(${holdings.marketValue}, 0)))::text`
      })
      .from(securities)
      .leftJoin(holdings, eq(holdings.securityId, securities.id))
      .where(
        sql`${holdings.periodEndDate} >= NOW() - INTERVAL '3 months'`
      )
      .groupBy(securities.id)
      .orderBy(desc(sql`COUNT(*)`))
      .limit(10);

    // Get most active funds (based on recent filings)
    const activeFunds = await db
      .select({
        fund: fundManagers,
        recentFilings: sql<string>`COUNT(*)::text`,
        totalValue: sql<string>`SUM(${holdings.marketValue})::text`
      })
      .from(fundManagers)
      .leftJoin(holdings, eq(holdings.fundManagerId, fundManagers.id))
      .where(
        sql`${holdings.periodEndDate} >= NOW() - INTERVAL '3 months'`
      )
      .groupBy(fundManagers.id)
      .orderBy(desc(sql`COUNT(*)`))
      .limit(10);

    return c.json({
      success: true,
      data: {
        trendingSecurities: trendingSecurities.map(s => ({
          ...s.security,
          metrics: {
            activityScore: parseInt(s.activityScore),
            recentValue: s.recentValue
          }
        })),
        activeFunds: activeFunds.map(f => ({
          ...f.fund,
          metrics: {
            recentFilings: parseInt(f.recentFilings),
            totalValue: f.totalValue
          }
        }))
      }
    });

  } catch (error) {
    console.error('Error getting trending data:', error);
    return c.json({
      success: false,
      error: 'Failed to get trending data'
    }, 500);
  }
});