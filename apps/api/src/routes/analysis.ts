import { Hono } from 'hono';
import { eq, sql, desc, and, gte } from 'drizzle-orm';
import { fundManagers, securities, holdings, analysisCache } from '@hedge-fund-tracker/database';
import { z } from 'zod';

export const analysisRoutes = new Hono();

import { llmService } from '../services/llm-service.js';

// Analysis request schemas
const PortfolioAnalysisSchema = z.object({
  fundManagerId: z.string().transform(Number),
  period: z.string().optional().transform(str => str ? new Date(str) : undefined),
  includeComparisons: z.string().optional().transform(str => str === 'true')
});

const SecurityAnalysisSchema = z.object({
  securityId: z.string().transform(Number),
  period: z.string().optional().transform(str => str ? new Date(str) : undefined),
  includeHolders: z.string().optional().transform(str => str === 'true')
});

const MarketAnalysisSchema = z.object({
  sector: z.string().optional(),
  period: z.string().optional().transform(str => str ? new Date(str) : undefined),
  analysisType: z.enum(['sector_trends', 'concentration_risk', 'flow_analysis']).default('sector_trends')
});

// POST /api/analysis/portfolio - Generate portfolio analysis for a specific fund
analysisRoutes.post('/portfolio', async (c) => {
  try {
    const db = c.get('db');
    const body = await c.req.json();
    const params = PortfolioAnalysisSchema.parse(body);

    // Check cache first
    const cacheKey = `portfolio_${params.fundManagerId}_${params.period?.toISOString() || 'latest'}`;
    const cached = await db
      .select()
      .from(analysisCache)
      .where(
        and(
          eq(analysisCache.fundManagerId, params.fundManagerId),
          eq(analysisCache.analysisType, 'portfolio_summary'),
          sql`${analysisCache.expiresAt} > NOW()`
        )
      )
      .limit(1);

    if (cached.length > 0) {
      return c.json({
        success: true,
        data: {
          ...cached[0].analysisResult,
          cached: true,
          generatedAt: cached[0].createdAt
        }
      });
    }

    // Get fund information
    const [fund] = await db
      .select()
      .from(fundManagers)
      .where(eq(fundManagers.id, params.fundManagerId))
      .limit(1);

    if (!fund) {
      return c.json({
        success: false,
        error: 'Fund not found'
      }, 404);
    }

    // Get portfolio holdings
    let holdingsQuery = db
      .select({
        holding: holdings,
        security: securities
      })
      .from(holdings)
      .innerJoin(securities, eq(securities.id, holdings.securityId))
      .where(eq(holdings.fundManagerId, params.fundManagerId));

    if (params.period) {
      holdingsQuery = holdingsQuery.where(eq(holdings.periodEndDate, params.period));
    }

    const portfolioHoldings = await holdingsQuery
      .orderBy(desc(holdings.marketValue))
      .limit(100);

    // Calculate portfolio metrics
    const totalValue = portfolioHoldings.reduce((sum, h) => sum + Number(h.holding.marketValue), 0);
    const positionCount = portfolioHoldings.length;

    // Sector allocation
    const sectorAllocation = portfolioHoldings.reduce((acc, h) => {
      const sector = h.security.sector || 'Unknown';
      acc[sector] = (acc[sector] || 0) + Number(h.holding.marketValue);
      return acc;
    }, {} as Record<string, number>);

    // Top 10 holdings
    const topHoldings = portfolioHoldings.slice(0, 10).map(h => ({
      security: h.security.companyName,
      ticker: h.security.ticker,
      value: Number(h.holding.marketValue),
      percentage: (Number(h.holding.marketValue) / totalValue) * 100
    }));

    // Concentration metrics
    const top10Concentration = topHoldings.reduce((sum, h) => sum + h.percentage, 0);

    // Prepare data for LLM analysis
    const analysisData = {
      fund: fund.name,
      cik: fund.cik,
      totalValue,
      positionCount,
      sectorAllocation,
      topHoldings,
      top10Concentration,
      period: params.period || new Date()
    };

    const prompt = `Analyze the portfolio of ${fund.name} (CIK: ${fund.cik}).
Portfolio Summary:
- Total Value: $${(totalValue / 100).toLocaleString()}
- Number of Positions: ${positionCount}
- Top 10 Concentration: ${top10Concentration.toFixed(2)}%

Top Holdings:
${topHoldings.map(h => `- ${h.security} (${h.ticker}): ${h.percentage.toFixed(2)}%`).join('\n')}

Sector Allocation:
${Object.entries(sectorAllocation).map(([sector, value]) =>
  `- ${sector}: ${((value / totalValue) * 100).toFixed(2)}%`
).join('\n')}

Please provide insights on:
1. Portfolio concentration and risk assessment
2. Sector diversification analysis
3. Notable holdings and potential investment themes
4. Risk factors and recommendations`;

    // Generate LLM analysis
    const portfolioAnalysis = await llmService.generatePortfolioAnalysis(analysisData);

    const result = {
      type: 'portfolio_summary',
      fundId: params.fundManagerId,
      fundName: fund.name,
      period: params.period || new Date(),
      metrics: {
        totalValue,
        positionCount,
        top10Concentration,
        sectorCount: Object.keys(sectorAllocation).length
      },
      analysis: portfolioAnalysis.summary,
      insights: portfolioAnalysis.insights,
      riskAssessment: portfolioAnalysis.riskAssessment,
      recommendations: portfolioAnalysis.recommendations,
      data: {
        sectorAllocation,
        topHoldings
      },
      generatedAt: new Date()
    };

    // Cache the result
    await db.insert(analysisCache).values({
      fundManagerId: params.fundManagerId,
      periodEndDate: params.period || new Date(),
      analysisType: 'portfolio_summary',
      analysisResult: result,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    });

    return c.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Error generating portfolio analysis:', error);
    return c.json({
      success: false,
      error: 'Failed to generate portfolio analysis'
    }, 500);
  }
});

// POST /api/analysis/security - Generate analysis for a specific security
analysisRoutes.post('/security', async (c) => {
  try {
    const db = c.get('db');
    const body = await c.req.json();
    const params = SecurityAnalysisSchema.parse(body);

    // Get security information
    const [security] = await db
      .select()
      .from(securities)
      .where(eq(securities.id, params.securityId))
      .limit(1);

    if (!security) {
      return c.json({
        success: false,
        error: 'Security not found'
      }, 404);
    }

    // Get holdings for this security
    let holdingsQuery = db
      .select({
        holding: holdings,
        fund: fundManagers
      })
      .from(holdings)
      .innerJoin(fundManagers, eq(fundManagers.id, holdings.fundManagerId))
      .where(eq(holdings.securityId, params.securityId));

    if (params.period) {
      holdingsQuery = holdingsQuery.where(eq(holdings.periodEndDate, params.period));
    }

    const securityHoldings = await holdingsQuery
      .orderBy(desc(holdings.marketValue));

    // Calculate metrics
    const totalValue = securityHoldings.reduce((sum, h) => sum + Number(h.holding.marketValue), 0);
    const totalShares = securityHoldings.reduce((sum, h) => sum + Number(h.holding.sharesHeld), 0);
    const holderCount = securityHoldings.length;

    const topHolders = securityHoldings.slice(0, 10).map(h => ({
      fund: h.fund.name,
      cik: h.fund.cik,
      value: Number(h.holding.marketValue),
      shares: Number(h.holding.sharesHeld),
      percentage: holderCount > 0 ? (Number(h.holding.marketValue) / totalValue) * 100 : 0
    }));

    // Prepare analysis data
    const analysisData = {
      security: security.companyName,
      ticker: security.ticker,
      cusip: security.cusip,
      sector: security.sector,
      totalValue,
      totalShares,
      holderCount,
      topHolders
    };

    const prompt = `Analyze the institutional ownership of ${security.companyName} (${security.ticker}).

Security Details:
- Company: ${security.companyName}
- Ticker: ${security.ticker}
- Sector: ${security.sector || 'Unknown'}
- CUSIP: ${security.cusip}

Institutional Holdings Summary:
- Total Institutional Value: $${(totalValue / 100).toLocaleString()}
- Total Shares Held: ${totalShares.toLocaleString()}
- Number of Institutional Holders: ${holderCount}

Top Institutional Holders:
${topHolders.map(h => `- ${h.fund}: ${h.percentage.toFixed(2)}% ($${(h.value / 100).toLocaleString()})`).join('\n')}

Please provide insights on:
1. Institutional ownership concentration and trends
2. Quality and reputation of major holders
3. Potential implications for stock price and volatility
4. Investment thesis based on holder profiles`;

    const analysis = await llmService.generateAnalysis(prompt, analysisData);

    const result = {
      type: 'security_analysis',
      securityId: params.securityId,
      securityName: security.companyName,
      ticker: security.ticker,
      period: params.period || new Date(),
      metrics: {
        totalValue,
        totalShares,
        holderCount,
        averageHolding: holderCount > 0 ? totalValue / holderCount : 0
      },
      analysis,
      data: {
        topHolders: params.includeHolders ? topHolders : topHolders.slice(0, 5)
      },
      generatedAt: new Date()
    };

    return c.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Error generating security analysis:', error);
    return c.json({
      success: false,
      error: 'Failed to generate security analysis'
    }, 500);
  }
});

// POST /api/analysis/market - Generate market-wide analysis
analysisRoutes.post('/market', async (c) => {
  try {
    const db = c.get('db');
    const body = await c.req.json();
    const params = MarketAnalysisSchema.parse(body);

    let analysisData: any = {};
    let prompt = '';

    switch (params.analysisType) {
      case 'sector_trends':
        // Get sector allocation and trends
        const sectorData = await db
          .select({
            sector: securities.sector,
            totalValue: sql<string>`SUM(${holdings.marketValue})::text`,
            positionCount: sql<string>`COUNT(*)::text`,
            fundCount: sql<string>`COUNT(DISTINCT ${holdings.fundManagerId})::text`,
            averagePosition: sql<string>`AVG(${holdings.marketValue})::text`
          })
          .from(holdings)
          .innerJoin(securities, eq(securities.id, holdings.securityId))
          .groupBy(securities.sector)
          .orderBy(desc(sql`SUM(${holdings.marketValue})`));

        analysisData = { sectors: sectorData };
        prompt = `Analyze sector allocation trends in hedge fund portfolios:

${sectorData.map(s =>
  `- ${s.sector || 'Unknown'}: $${(Number(s.totalValue) / 100).toLocaleString()} (${s.positionCount} positions, ${s.fundCount} funds)`
).join('\n')}

Please provide insights on:
1. Sector concentration and diversification trends
2. Over/under-weighted sectors compared to market cap
3. Emerging sector themes and investment flows
4. Risk assessment of current sector allocation`;
        break;

      case 'concentration_risk':
        // Analyze concentration across the hedge fund universe
        const concentrationData = await db
          .select({
            security: securities,
            totalValue: sql<string>`SUM(${holdings.marketValue})::text`,
            fundCount: sql<string>`COUNT(DISTINCT ${holdings.fundManagerId})::text`,
            marketShare: sql<string>`(SUM(${holdings.marketValue}) * 100.0 / (SELECT SUM(${holdings.marketValue}) FROM ${holdings}))::text`
          })
          .from(securities)
          .innerJoin(holdings, eq(holdings.securityId, securities.id))
          .groupBy(securities.id)
          .orderBy(desc(sql`SUM(${holdings.marketValue})`))
          .limit(20);

        analysisData = { concentrations: concentrationData };
        prompt = `Analyze concentration risk in hedge fund holdings:

Top Concentrated Positions:
${concentrationData.map(c =>
  `- ${c.security.companyName} (${c.security.ticker}): ${Number(c.marketShare).toFixed(2)}% of total AUM, held by ${c.fundCount} funds`
).join('\n')}

Please analyze:
1. Systemic risk from concentrated positions
2. Crowded trades and potential unwinding risks
3. Diversification across hedge fund industry
4. Recommendations for risk management`;
        break;

      default:
        return c.json({
          success: false,
          error: 'Invalid analysis type'
        }, 400);
    }

    const marketAnalysis = await llmService.generateMarketAnalysis(analysisData, params.analysisType);

    const result = {
      type: params.analysisType,
      period: params.period || new Date(),
      sector: params.sector,
      analysis: marketAnalysis.summary,
      trends: marketAnalysis.trends,
      risks: marketAnalysis.risks,
      opportunities: marketAnalysis.opportunities,
      data: analysisData,
      generatedAt: new Date()
    };

    return c.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Error generating market analysis:', error);
    return c.json({
      success: false,
      error: 'Failed to generate market analysis'
    }, 500);
  }
});

// GET /api/analysis/history - Get analysis history for a fund or security
analysisRoutes.get('/history', async (c) => {
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

    let historyQuery;

    if (entityType === 'fund') {
      historyQuery = db
        .select()
        .from(analysisCache)
        .where(eq(analysisCache.fundManagerId, parseInt(entityId)))
        .orderBy(desc(analysisCache.createdAt))
        .limit(limit);
    } else {
      // For securities, we'd need to add securityId to the cache table
      // For now, return empty array
      return c.json({
        success: true,
        data: {
          entityType,
          entityId: parseInt(entityId),
          history: []
        }
      });
    }

    const history = await historyQuery;

    return c.json({
      success: true,
      data: {
        entityType,
        entityId: parseInt(entityId),
        history: history.map(h => ({
          id: h.id,
          type: h.analysisType,
          period: h.periodEndDate,
          summary: h.analysisResult,
          createdAt: h.createdAt
        }))
      }
    });

  } catch (error) {
    console.error('Error fetching analysis history:', error);
    return c.json({
      success: false,
      error: 'Failed to fetch analysis history'
    }, 500);
  }
});

// DELETE /api/analysis/cache - Clear analysis cache
analysisRoutes.delete('/cache', async (c) => {
  try {
    const db = c.get('db');
    const fundManagerId = c.req.query('fundManagerId');

    if (fundManagerId) {
      // Clear cache for specific fund
      await db
        .delete(analysisCache)
        .where(eq(analysisCache.fundManagerId, parseInt(fundManagerId)));
    } else {
      // Clear expired cache entries
      await db
        .delete(analysisCache)
        .where(sql`${analysisCache.expiresAt} <= NOW()`);
    }

    return c.json({
      success: true,
      data: {
        message: 'Cache cleared successfully'
      }
    });

  } catch (error) {
    console.error('Error clearing analysis cache:', error);
    return c.json({
      success: false,
      error: 'Failed to clear analysis cache'
    }, 500);
  }
});