import { supabase } from './supabase';

// Types for API responses
export interface FundManager {
  id: number;
  cik: string;
  name: string;
  address?: string;
  phone?: string;
  created_at: string;
  updated_at: string;
}

export interface FundManagerWithStats extends FundManager {
  total_value?: number;
  total_positions?: number;
  last_filing_date?: string;
  quarterly_change?: number;
}

export interface Security {
  id: number;
  cusip: string;
  ticker?: string;
  company_name: string;
  security_type?: string;
  sector?: string;
  industry?: string;
  created_at: string;
}

export interface Holding {
  id: number;
  filing_id: number;
  security_id: number;
  fund_manager_id: number;
  period_end_date: string;
  shares_held: number;
  market_value: number;
  percent_of_portfolio?: number;
  investment_discretion?: string;
  voting_authority?: string;
  created_at: string;
  security?: Security;
  fund_manager?: FundManager;
}

export interface Filing {
  id: number;
  fund_manager_id: number;
  filing_date: string;
  period_end_date: string;
  form_type: string;
  total_value?: number;
  total_positions?: number;
  filing_url?: string;
  processed_at?: string;
  created_at: string;
}

// API Functions
export async function getDashboardStats() {
  try {
    const [fundsResult, securitiesResult, holdingsResult] = await Promise.all([
      supabase.from('fund_managers').select('id', { count: 'exact', head: true }),
      supabase.from('securities').select('id', { count: 'exact', head: true }),
      supabase.from('holdings').select('market_value').limit(1000)
    ]);

    const totalValue = holdingsResult.data?.reduce((sum, holding) => sum + (holding.market_value || 0), 0) || 0;

    return {
      totalFunds: fundsResult.count || 0,
      totalSecurities: securitiesResult.count || 0,
      totalValue: totalValue,
      lastUpdated: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    throw error;
  }
}

export async function getFunds(search?: string, limit = 50) {
  try {
    let query = supabase
      .from('fund_managers')
      .select(`
        *,
        filings!inner(total_value, total_positions, period_end_date)
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (search) {
      query = query.or(`name.ilike.%${search}%,cik.ilike.%${search}%`);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Transform the data to include stats from latest filing
    const fundsWithStats = data?.map((fund: any) => {
      const latestFiling = fund.filings?.[0];
      return {
        ...fund,
        total_value: latestFiling?.total_value,
        total_positions: latestFiling?.total_positions,
        last_filing_date: latestFiling?.period_end_date,
        quarterly_change: Math.random() * 10 - 5 // Mock for now
      };
    }) || [];

    return fundsWithStats;
  } catch (error) {
    console.error('Error fetching funds:', error);
    throw error;
  }
}

export async function getFundById(id: number) {
  try {
    const { data: fund, error: fundError } = await supabase
      .from('fund_managers')
      .select('*')
      .eq('id', id)
      .single();

    if (fundError) throw fundError;

    const { data: latestFiling, error: filingError } = await supabase
      .from('filings')
      .select('*')
      .eq('fund_manager_id', id)
      .order('period_end_date', { ascending: false })
      .limit(1)
      .single();

    if (filingError && filingError.code !== 'PGRST116') throw filingError;

    return {
      ...fund,
      total_value: latestFiling?.total_value,
      total_positions: latestFiling?.total_positions,
      last_filing_date: latestFiling?.period_end_date,
      quarterly_change: Math.random() * 10 - 5 // Mock for now
    };
  } catch (error) {
    console.error('Error fetching fund:', error);
    throw error;
  }
}

export async function getFundHoldings(fundId: number, limit = 50) {
  try {
    const { data, error } = await supabase
      .from('holdings')
      .select(`
        *,
        security:securities(*),
        filing:filings(period_end_date)
      `)
      .eq('fund_manager_id', fundId)
      .order('market_value', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching fund holdings:', error);
    throw error;
  }
}

export async function getFundFilingHistory(fundId: number, limit = 10) {
  try {
    const { data, error } = await supabase
      .from('filings')
      .select('*')
      .eq('fund_manager_id', fundId)
      .order('period_end_date', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching filing history:', error);
    throw error;
  }
}

export async function getTopFunds(limit = 10) {
  try {
    const { data, error } = await supabase
      .from('fund_managers')
      .select(`
        *,
        filings!inner(total_value, total_positions)
      `)
      .order('filings.total_value', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return data?.map((fund: any) => ({
      ...fund,
      total_value: fund.filings?.[0]?.total_value || 0,
      quarterly_change: Math.random() * 10 - 5 // Mock for now
    })) || [];
  } catch (error) {
    console.error('Error fetching top funds:', error);
    throw error;
  }
}

export async function getTopHoldings(limit = 10) {
  try {
    const { data, error } = await supabase
      .from('holdings')
      .select(`
        security_id,
        security:securities(*),
        market_value
      `)
      .order('market_value', { ascending: false })
      .limit(limit);

    if (error) throw error;

    // Group by security and sum values
    const groupedHoldings = data?.reduce((acc: any, holding: any) => {
      const securityId = holding.security_id;
      if (!acc[securityId]) {
        acc[securityId] = {
          security: holding.security,
          total_value: 0,
          holder_count: 0
        };
      }
      acc[securityId].total_value += holding.market_value;
      acc[securityId].holder_count += 1;
      return acc;
    }, {});

    return Object.values(groupedHoldings || {}).slice(0, limit);
  } catch (error) {
    console.error('Error fetching top holdings:', error);
    throw error;
  }
}

export async function searchAll(query: string, limit = 20) {
  try {
    const [fundResults, securityResults] = await Promise.all([
      supabase
        .from('fund_managers')
        .select('id, name, cik')
        .or(`name.ilike.%${query}%,cik.ilike.%${query}%`)
        .limit(limit / 2),
      supabase
        .from('securities')
        .select('id, ticker, company_name, sector')
        .or(`ticker.ilike.%${query}%,company_name.ilike.%${query}%`)
        .limit(limit / 2)
    ]);

    const results = [];

    // Add fund results
    fundResults.data?.forEach(fund => {
      results.push({
        type: 'fund' as const,
        id: fund.id,
        title: fund.name,
        subtitle: `CIK: ${fund.cik}`,
        metadata: {}
      });
    });

    // Add security results
    securityResults.data?.forEach(security => {
      results.push({
        type: 'security' as const,
        id: security.id,
        title: `${security.company_name} (${security.ticker || 'N/A'})`,
        subtitle: security.sector || 'Unknown Sector',
        metadata: {}
      });
    });

    return results;
  } catch (error) {
    console.error('Error searching:', error);
    throw error;
  }
}