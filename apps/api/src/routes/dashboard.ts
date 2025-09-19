import { Hono } from 'hono';
import { sql, desc, asc, eq, gte, lte, and } from 'drizzle-orm';
import { fundManagers, holdings, securities, filings, positionChanges } from '@hedge-fund-tracker/database';
import { formatCurrency, formatLargeNumber, getQuarterFromDate } from '@hedge-fund-tracker/shared';

export const dashboardRoutes = new Hono();

// GET /api/dashboard/overview - Main dashboard statistics
dashboardRoutes.get('/overview', async (c) => {
  try {
    const db = c.get('db');

    // Get current period (most recent quarter)
    const [latestPeriod] = await db
      .select({ maxPeriod: sql<string>`MAX(${holdings.periodEndDate})` })
      .from(holdings);

    const currentPeriod = latestPeriod?.maxPeriod ? new Date(latestPeriod.maxPeriod) : new Date();

    // Get previous period for comparison
    const currentQuarter = getQuarterFromDate(currentPeriod);
    const previousYear = currentQuarter.quarter === 1 ? currentQuarter.year - 1 : currentQuarter.year;
    const previousQuarter = currentQuarter.quarter === 1 ? 4 : currentQuarter.quarter - 1;

    // Basic statistics
    const [stats] = await db.select({
      totalFunds: sql<string>`COUNT(DISTINCT ${fundManagers.id})::text`,
      totalSecurities: sql<string>`COUNT(DISTINCT ${securities.id})::text`,
      totalFilings: sql<string>`COUNT(DISTINCT ${filings.id})::text`,
      totalHoldings: sql<string>`COUNT(${holdings.id})::text`
    }).from(fundManagers)
      .leftJoin(holdings, eq(holdings.fundManagerId, fundManagers.id))
      .leftJoin(securities, eq(securities.id, holdings.securityId))
      .leftJoin(filings, eq(filings.fundManagerId, fundManagers.id));

    // Current period statistics
    const [currentStats] = await db.select({
      totalValue: sql<string>`COALESCE(SUM(${holdings.marketValue}), 0)::text`,
      averagePosition: sql<string>`COALESCE(AVG(${holdings.marketValue}), 0)::text`,
      positionCount: sql<string>`COUNT(*)::text`,
      activeFunds: sql<string>`COUNT(DISTINCT ${holdings.fundManagerId})::text`
    }).from(holdings)
      .where(eq(holdings.periodEndDate, currentPeriod));

    // Most recent filing date
    const [latestFiling] = await db.select({
      latestFilingDate: sql<string>`MAX(${filings.processedAt})`
    }).from(filings);

    return c.json({
      success: true,
      data: {
        overview: {
          totalFunds: parseInt(stats.totalFunds),
          totalSecurities: parseInt(stats.totalSecurities),
          totalFilings: parseInt(stats.totalFilings),
          totalHoldings: parseInt(stats.totalHoldings),
          currentPeriod,
          lastUpdated: latestFiling?.latestFilingDate ? new Date(latestFiling.latestFilingDate) : null
        },
        currentPeriod: {
          totalValue: currentStats.totalValue,
          averagePosition: currentStats.averagePosition,
          positionCount: parseInt(currentStats.positionCount),
          activeFunds: parseInt(currentStats.activeFunds)
        }
      }
    });

  } catch (error) {
    console.error('Error fetching dashboard overview:', error);
    return c.json({
      success: false,
      error: 'Failed to fetch dashboard overview'
    }, 500);
  }
});

// GET /api/dashboard/top-funds - Top performing funds
dashboardRoutes.get('/top-funds', async (c) => {
  try {
    const db = c.get('db');
    const limit = parseInt(c.req.query('limit') || '10');
    const metric = c.req.query('metric') || 'totalValue'; // totalValue, positionCount, uniqueSecurities

    let sortColumn;
    switch (metric) {
      case 'positionCount':
        sortColumn = sql`COUNT(${holdings.id})`;
        break;
      case 'uniqueSecurities':
        sortColumn = sql`COUNT(DISTINCT ${holdings.securityId})`;
        break;
      default:
        sortColumn = sql`SUM(${holdings.marketValue})`;
    }

    const topFunds = await db
      .select({
        fund: fundManagers,
        totalValue: sql<string>`COALESCE(SUM(${holdings.marketValue}), 0)::text`,
        positionCount: sql<string>`COUNT(${holdings.id})::text`,
        uniqueSecurities: sql<string>`COUNT(DISTINCT ${holdings.securityId})::text`,
        latestPeriod: sql<string>`MAX(${holdings.periodEndDate})`
      })
      .from(fundManagers)
      .leftJoin(holdings, eq(holdings.fundManagerId, fundManagers.id))
      .groupBy(fundManagers.id)
      .orderBy(desc(sortColumn))
      .limit(limit);

    return c.json({
      success: true,
      data: {
        metric,
        funds: topFunds.map(fund => ({
          ...fund.fund,
          stats: {
            totalValue: fund.totalValue,
            positionCount: parseInt(fund.positionCount),
            uniqueSecurities: parseInt(fund.uniqueSecurities),
            latestPeriod: fund.latestPeriod ? new Date(fund.latestPeriod) : null
          }
        }))
      }
    });

  } catch (error) {
    console.error('Error fetching top funds:', error);
    return c.json({
      success: false,
      error: 'Failed to fetch top funds'
    }, 500);
  }
});

// GET /api/dashboard/top-holdings - Most popular holdings across all funds
dashboardRoutes.get('/top-holdings', async (c) => {
  try {
    const db = c.get('db');
    const limit = parseInt(c.req.query('limit') || '10');
    const metric = c.req.query('metric') || 'totalValue'; // totalValue, fundCount, totalShares

    let sortColumn;
    switch (metric) {
      case 'fundCount':
        sortColumn = sql`COUNT(DISTINCT ${holdings.fundManagerId})`;
        break;
      case 'totalShares':
        sortColumn = sql`SUM(${holdings.sharesHeld})`;
        break;
      default:
        sortColumn = sql`SUM(${holdings.marketValue})`;
    }

    const topHoldings = await db
      .select({
        security: securities,
        totalValue: sql<string>`SUM(${holdings.marketValue})::text`,
        totalShares: sql<string>`SUM(${holdings.sharesHeld})::text`,
        fundCount: sql<string>`COUNT(DISTINCT ${holdings.fundManagerId})::text`,
        averagePosition: sql<string>`AVG(${holdings.marketValue})::text`,
        latestPeriod: sql<string>`MAX(${holdings.periodEndDate})`
      })
      .from(securities)
      .innerJoin(holdings, eq(holdings.securityId, securities.id))
      .groupBy(securities.id)
      .orderBy(desc(sortColumn))
      .limit(limit);

    return c.json({
      success: true,
      data: {
        metric,
        holdings: topHoldings.map(holding => ({
          ...holding.security,
          stats: {
            totalValue: holding.totalValue,
            totalShares: holding.totalShares,
            fundCount: parseInt(holding.fundCount),
            averagePosition: holding.averagePosition,
            latestPeriod: holding.latestPeriod ? new Date(holding.latestPeriod) : null
          }
        }))
      }
    });

  } catch (error) {
    console.error('Error fetching top holdings:', error);
    return c.json({
      success: false,
      error: 'Failed to fetch top holdings'
    }, 500);
  }
});

// GET /api/dashboard/sector-allocation - Sector allocation across all funds
dashboardRoutes.get('/sector-allocation', async (c) => {
  try {
    const db = c.get('db');
    const period = c.req.query('period'); // Optional specific period

    let query = db
      .select({
        sector: securities.sector,
        totalValue: sql<string>`SUM(${holdings.marketValue})::text`,
        positionCount: sql<string>`COUNT(${holdings.id})::text`,
        fundCount: sql<string>`COUNT(DISTINCT ${holdings.fundManagerId})::text`,
        averagePosition: sql<string>`AVG(${holdings.marketValue})::text`
      })
      .from(holdings)
      .innerJoin(securities, eq(securities.id, holdings.securityId))
      .groupBy(securities.sector)
      .orderBy(desc(sql`SUM(${holdings.marketValue})`));

    if (period) {
      query = query.where(eq(holdings.periodEndDate, new Date(period)));
    }

    const sectorData = await query;

    // Calculate total value for percentage calculation
    const totalValue = sectorData.reduce((sum, sector) =>
      sum + parseFloat(sector.totalValue), 0
    );

    const sectorsWithPercentages = sectorData.map(sector => ({
      sector: sector.sector || 'Unknown',
      totalValue: sector.totalValue,
      positionCount: parseInt(sector.positionCount),
      fundCount: parseInt(sector.fundCount),
      averagePosition: sector.averagePosition,
      percentage: totalValue > 0 ? (parseFloat(sector.totalValue) / totalValue * 100) : 0
    }));

    return c.json({
      success: true,
      data: {
        period: period ? new Date(period) : null,
        totalValue: totalValue.toString(),
        sectors: sectorsWithPercentages
      }
    });

  } catch (error) {
    console.error('Error fetching sector allocation:', error);
    return c.json({
      success: false,
      error: 'Failed to fetch sector allocation'
    }, 500);
  }
});

// GET /api/dashboard/recent-activity - Recent filing and position change activity
dashboardRoutes.get('/recent-activity', async (c) => {
  try {
    const db = c.get('db');
    const limit = parseInt(c.req.query('limit') || '20');
    const activityType = c.req.query('type') || 'all'; // all, filings, changes

    let recentActivity = [];

    if (activityType === 'all' || activityType === 'filings') {
      // Get recent filings
      const recentFilings = await db
        .select({
          type: sql<string>`'filing'`,
          id: filings.id,
          date: filings.processedAt,
          fundManager: fundManagers,
          details: sql<string>`JSON_BUILD_OBJECT(
            'filingDate', ${filings.filingDate},
            'periodEndDate', ${filings.periodEndDate},
            'totalValue', ${filings.totalValue},
            'totalPositions', ${filings.totalPositions}
          )`
        })
        .from(filings)
        .innerJoin(fundManagers, eq(fundManagers.id, filings.fundManagerId))
        .orderBy(desc(filings.processedAt))
        .limit(Math.floor(limit / 2));

      recentActivity = [...recentActivity, ...recentFilings];
    }

    if (activityType === 'all' || activityType === 'changes') {
      // Get recent significant position changes
      const recentChanges = await db
        .select({
          type: sql<string>`'position_change'`,
          id: positionChanges.id,
          date: positionChanges.createdAt,
          fundManager: fundManagers,
          security: securities,
          details: sql<string>`JSON_BUILD_OBJECT(
            'changeType', ${positionChanges.changeType},
            'valueChange', ${positionChanges.valueChange},
            'percentChange', ${positionChanges.percentChange},
            'fromPeriod', ${positionChanges.fromPeriod},
            'toPeriod', ${positionChanges.toPeriod}
          )`
        })
        .from(positionChanges)
        .innerJoin(fundManagers, eq(fundManagers.id, positionChanges.fundManagerId))
        .innerJoin(securities, eq(securities.id, positionChanges.securityId))
        .orderBy(desc(positionChanges.createdAt))
        .limit(Math.floor(limit / 2));

      recentActivity = [...recentActivity, ...recentChanges];
    }

    // Sort all activity by date
    recentActivity.sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    return c.json({
      success: true,
      data: {
        activityType,
        activities: recentActivity.slice(0, limit)
      }
    });

  } catch (error) {
    console.error('Error fetching recent activity:', error);
    return c.json({
      success: false,
      error: 'Failed to fetch recent activity'
    }, 500);
  }
});

// GET /api/dashboard/market-trends - Market trends and insights
dashboardRoutes.get('/market-trends', async (c) => {
  try {
    const db = c.get('db');

    // Get trending securities (most activity in recent period)
    const trendingSecurities = await db
      .select({
        security: securities,
        activityCount: sql<string>`COUNT(${positionChanges.id})::text`,
        netValueChange: sql<string>`SUM(${positionChanges.valueChange})::text`,
        fundsInvolved: sql<string>`COUNT(DISTINCT ${positionChanges.fundManagerId})::text`
      })
      .from(securities)
      .innerJoin(positionChanges, eq(positionChanges.securityId, securities.id))
      .where(gte(positionChanges.createdAt, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))) // Last 30 days
      .groupBy(securities.id)
      .orderBy(desc(sql`COUNT(${positionChanges.id})`))
      .limit(10);

    // Get sectors with most activity
    const activeSectors = await db
      .select({
        sector: securities.sector,
        activityCount: sql<string>`COUNT(${positionChanges.id})::text`,
        netValueChange: sql<string>`SUM(${positionChanges.valueChange})::text`,
        newPositions: sql<string>`COUNT(CASE WHEN ${positionChanges.changeType} = 'NEW' THEN 1 END)::text`,
        soldPositions: sql<string>`COUNT(CASE WHEN ${positionChanges.changeType} = 'SOLD' THEN 1 END)::text`
      })
      .from(securities)
      .innerJoin(positionChanges, eq(positionChanges.securityId, securities.id))
      .where(gte(positionChanges.createdAt, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)))
      .groupBy(securities.sector)
      .orderBy(desc(sql`COUNT(${positionChanges.id})`))
      .limit(10);

    // Get fund activity summary
    const fundActivity = await db
      .select({
        totalChanges: sql<string>`COUNT(${positionChanges.id})::text`,
        activeFunds: sql<string>`COUNT(DISTINCT ${positionChanges.fundManagerId})::text`,
        totalValueChange: sql<string>`SUM(ABS(${positionChanges.valueChange}))::text`
      })
      .from(positionChanges)
      .where(gte(positionChanges.createdAt, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)));

    return c.json({
      success: true,
      data: {
        period: '30 days',
        trendingSecurities: trendingSecurities.map(s => ({
          ...s.security,
          stats: {
            activityCount: parseInt(s.activityCount),
            netValueChange: s.netValueChange,
            fundsInvolved: parseInt(s.fundsInvolved)
          }
        })),
        activeSectors: activeSectors.map(s => ({
          sector: s.sector || 'Unknown',
          activityCount: parseInt(s.activityCount),
          netValueChange: s.netValueChange,
          newPositions: parseInt(s.newPositions),
          soldPositions: parseInt(s.soldPositions)
        })),
        summary: {
          totalChanges: parseInt(fundActivity[0]?.totalChanges || '0'),
          activeFunds: parseInt(fundActivity[0]?.activeFunds || '0'),
          totalValueChange: fundActivity[0]?.totalValueChange || '0'
        }
      }
    });

  } catch (error) {
    console.error('Error fetching market trends:', error);
    return c.json({
      success: false,
      error: 'Failed to fetch market trends'
    }, 500);
  }
});

// GET /api/dashboard/portfolio-metrics - Portfolio concentration and risk metrics
dashboardRoutes.get('/portfolio-metrics', async (c) => {
  try {
    const db = c.get('db');
    const period = c.req.query('period'); // Optional specific period

    // Get concentration metrics (top positions as percentage of total)
    let holdingsQuery = db
      .select({
        totalValue: sql<string>`SUM(${holdings.marketValue})::text`,
        positionCount: sql<string>`COUNT(*)::text`,
        top10Value: sql<string>`SUM(CASE WHEN rank <= 10 THEN market_value ELSE 0 END)::text`,
        top50Value: sql<string>`SUM(CASE WHEN rank <= 50 THEN market_value ELSE 0 END)::text`
      })
      .from(
        db.select({
          marketValue: holdings.marketValue,
          rank: sql<number>`ROW_NUMBER() OVER (ORDER BY ${holdings.marketValue} DESC)`
        })
        .from(holdings)
        .as('ranked_holdings')
      );

    if (period) {
      holdingsQuery = holdingsQuery.where(eq(holdings.periodEndDate, new Date(period)));
    }

    const [concentrationMetrics] = await holdingsQuery;

    // Calculate concentration ratios
    const totalValue = parseFloat(concentrationMetrics.totalValue || '0');
    const top10Concentration = totalValue > 0 ?
      (parseFloat(concentrationMetrics.top10Value || '0') / totalValue * 100) : 0;
    const top50Concentration = totalValue > 0 ?
      (parseFloat(concentrationMetrics.top50Value || '0') / totalValue * 100) : 0;

    // Get sector concentration
    const sectorConcentration = await db
      .select({
        sector: securities.sector,
        value: sql<string>`SUM(${holdings.marketValue})::text`,
        percentage: sql<string>`(SUM(${holdings.marketValue}) * 100.0 / (SELECT SUM(${holdings.marketValue}) FROM ${holdings}))::text`
      })
      .from(holdings)
      .innerJoin(securities, eq(securities.id, holdings.securityId))
      .groupBy(securities.sector)
      .orderBy(desc(sql`SUM(${holdings.marketValue})`))
      .limit(10);

    return c.json({
      success: true,
      data: {
        period: period ? new Date(period) : null,
        concentration: {
          totalValue: concentrationMetrics.totalValue,
          positionCount: parseInt(concentrationMetrics.positionCount),
          top10Concentration: top10Concentration.toFixed(2),
          top50Concentration: top50Concentration.toFixed(2)
        },
        sectorConcentration: sectorConcentration.map(s => ({
          sector: s.sector || 'Unknown',
          value: s.value,
          percentage: parseFloat(s.percentage || '0').toFixed(2)
        }))
      }
    });

  } catch (error) {
    console.error('Error fetching portfolio metrics:', error);
    return c.json({
      success: false,
      error: 'Failed to fetch portfolio metrics'
    }, 500);
  }
});