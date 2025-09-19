export interface LLMConfig {
  provider: 'openai' | 'anthropic';
  model: string;
  temperature: number;
  maxTokens: number;
  enableFallback: boolean;
  rateLimitSettings: {
    requestsPerMinute: number;
    requestsPerHour: number;
  };
  retrySettings: {
    maxRetries: number;
    backoffMs: number;
  };
}

export const defaultLLMConfig: LLMConfig = {
  provider: 'openai',
  model: 'gpt-4-turbo-preview',
  temperature: 0.7,
  maxTokens: 2000,
  enableFallback: true,
  rateLimitSettings: {
    requestsPerMinute: 20,
    requestsPerHour: 500
  },
  retrySettings: {
    maxRetries: 3,
    backoffMs: 1000
  }
};

export const analysisPrompts = {
  portfolioAnalysis: {
    system: `You are a senior financial analyst with expertise in hedge fund portfolio analysis and 13F filings.
    Provide professional insights focusing on:
    - Investment strategy and themes
    - Risk assessment and concentration analysis
    - Sector allocation and diversification
    - Notable positions and their implications
    - Market positioning relative to peers

    Use specific data points and percentages to support your analysis.
    Structure your response with clear sections and actionable insights.`,

    userTemplate: `Analyze the portfolio of {fundName} (CIK: {cik}) with the following data:

Portfolio Overview:
- Total AUM: ${totalValue:currency}
- Number of Positions: {positionCount}
- Top 10 Holdings Concentration: {concentration}%
- Reporting Period: {period}

Top Holdings:
{topHoldings}

Sector Allocation:
{sectorAllocation}

Please provide:
1. Overall portfolio assessment and investment strategy
2. Risk analysis focusing on concentration and sector exposure
3. Notable holdings and their strategic implications
4. Recommendations for monitoring key positions`
  },

  securityAnalysis: {
    system: `You are a financial analyst specializing in institutional ownership analysis.
    Analyze the institutional holder base for securities and provide insights on:
    - Ownership concentration and quality of holders
    - Implications for stock performance and volatility
    - Investment thesis validation based on holder profiles
    - Potential catalysts or risks from ownership changes`,

    userTemplate: `Analyze institutional ownership for {securityName} ({ticker}):

Security Details:
- Company: {companyName}
- Sector: {sector}
- Total Institutional Value: ${totalValue:currency}
- Number of Institutional Holders: {holderCount}

Top Institutional Holders:
{topHolders}

Provide analysis on:
1. Quality and reputation of major institutional holders
2. Ownership concentration and potential liquidity implications
3. Investment thesis signals from holder composition
4. Risk factors from institutional ownership patterns`
  },

  marketAnalysis: {
    system: `You are a market strategist analyzing hedge fund activity for broader market insights.
    Focus on:
    - Sector rotation and thematic investing trends
    - Risk concentration and systemic concerns
    - Flow analysis and positioning changes
    - Market timing and sentiment indicators from hedge fund activity`,

    templates: {
      sector_trends: `Analyze sector allocation trends in the hedge fund universe:

Sector Breakdown:
{sectorData}

Identify:
1. Emerging sector themes and rotation patterns
2. Over/under-weighted sectors vs. market benchmarks
3. Risk assessment of current sector concentration
4. Investment flow implications and market outlook`,

      concentration_risk: `Analyze concentration risk in hedge fund holdings:

Most Concentrated Positions:
{concentrationData}

Assess:
1. Systemic risk from crowded trades
2. Potential for forced unwinding and volatility
3. Cross-fund correlation and contagion risks
4. Diversification recommendations`
    }
  }
};

export const analysisTypes = {
  PORTFOLIO_SUMMARY: 'portfolio_summary',
  SECURITY_ANALYSIS: 'security_analysis',
  SECTOR_TRENDS: 'sector_trends',
  CONCENTRATION_RISK: 'concentration_risk',
  FLOW_ANALYSIS: 'flow_analysis',
  PERFORMANCE_METRICS: 'performance_metrics'
} as const;

export type AnalysisType = typeof analysisTypes[keyof typeof analysisTypes];