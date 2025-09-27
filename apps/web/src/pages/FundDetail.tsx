import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, ExternalLink, TrendingUp, TrendingDown, Plus, Minus } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatDate, formatNumber } from '@/lib/format';
import { useQuery } from '@tanstack/react-query';
import { getFundById, getFundHoldings, getFundFilingHistory } from '@/lib/api';

export function FundDetail() {
  const { id } = useParams();
  const fundId = Number(id);

  const { data: fund, isLoading: fundLoading, error: fundError } = useQuery({
    queryKey: ['fund', fundId],
    queryFn: () => getFundById(fundId),
    enabled: Number.isFinite(fundId)
  });

  const { data: holdings, isLoading: holdingsLoading, error: holdingsError } = useQuery({
    queryKey: ['fund-holdings', fundId],
    queryFn: () => getFundHoldings(fundId, 100),
    enabled: Number.isFinite(fundId)
  });

  const { data: filingHistory, isLoading: historyLoading, error: historyError } = useQuery({
    queryKey: ['fund-history', fundId],
    queryFn: () => getFundFilingHistory(fundId, 10),
    enabled: Number.isFinite(fundId)
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/funds">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{fundLoading ? 'Loading…' : fund?.name}</h1>
          {!fundLoading && fund && (
            <p className="text-muted-foreground">CIK: {fund.cik}</p>
          )}
        </div>
        <Button variant="outline">
          <ExternalLink className="h-4 w-4 mr-2" />
          SEC Filings
        </Button>
      </div>

      {/* Fund Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Portfolio Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fundLoading ? '—' : formatCurrency(((fund?.total_value || 0) as number) / 100)}</div>
            <div className={`flex items-center text-xs ${
              ((fund?.quarterly_change || 0) as number) >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {(fund?.quarterly_change || 0) >= 0 ? (
                <TrendingUp className="h-3 w-3 mr-1" />
              ) : (
                <TrendingDown className="h-3 w-3 mr-1" />
              )}
              {((fund?.quarterly_change || 0) as number) >= 0 ? '+' : ''}{(fund?.quarterly_change || 0).toFixed(1)}% from last quarter
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Positions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fundLoading ? '—' : (fund?.total_positions || 0)}</div>
            <p className="text-xs text-muted-foreground">
              Securities held
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Filing</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fundLoading ? '—' : (fund?.last_filing_date ? formatDate(fund.last_filing_date) : '—')}</div>
            <p className="text-xs text-muted-foreground">
              Most recent 13F filing
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Holding</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">{holdingsLoading ? '—' : (holdings?.[0]?.security?.ticker || '—')}</div>
            <p className="text-xs text-muted-foreground">
              {holdingsLoading || !holdings?.[0]?.percent_of_portfolio ? '—' : `${holdings?.[0]?.percent_of_portfolio}% of portfolio`}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Holdings */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Current Holdings</CardTitle>
              <CardDescription>
                Latest reported positions as of {fundLoading ? '—' : (fund?.last_filing_date ? formatDate(fund.last_filing_date) : '—')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(holdingsLoading ? [] : (holdings || [])).map((holding: any) => (
                  <div key={holding.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-secondary rounded-lg flex items-center justify-center">
                        <span className="font-semibold text-sm">{holding.security?.ticker || '—'}</span>
                      </div>
                      <div>
                        <p className="font-medium">{holding.security?.company_name}</p>
                        <p className="text-sm text-muted-foreground">{holding.security?.sector}</p>
                      </div>
                    </div>

                    <div className="text-right space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold">{formatCurrency((holding.market_value || 0) / 100)}</span>
                        <div className={`flex items-center text-xs text-gray-600`}>
                          {/* Change type not available from API yet; reserved icons */}
                          <Minus className="h-3 w-3 opacity-0" />
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {formatNumber(Number(holding.shares_held || 0))} shares • {holding.percent_of_portfolio || 0}%
                      </p>
                    </div>
                  </div>
                ))}
                {holdingsError && (
                  <div className="text-sm text-red-600">Failed to load holdings.</div>
                )}
                {holdingsLoading && (
                  <div className="text-sm text-muted-foreground">Loading...</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filing History & Fund Info */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Filing History</CardTitle>
              <CardDescription>Recent 13F submissions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(historyLoading ? [] : (filingHistory || [])).map((filing: any) => (
                  <div key={`${filing.filing_date}-${filing.period_end_date}`} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{filing.period_end_date}</p>
                      <p className="text-sm text-muted-foreground">{formatDate(filing.filing_date)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency((filing.total_value || 0) / 100)}</p>
                      <p className="text-sm text-muted-foreground">{filing.total_positions || 0} positions</p>
                    </div>
                  </div>
                ))}
                {historyError && (
                  <div className="text-sm text-red-600">Failed to load filing history.</div>
                )}
                {historyLoading && (
                  <div className="text-sm text-muted-foreground">Loading...</div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Fund Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Address</p>
                  <p>{fund?.address || '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Phone</p>
                  <p>{fund?.phone || '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">CIK Number</p>
                  <p>{fund?.cik || '—'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}