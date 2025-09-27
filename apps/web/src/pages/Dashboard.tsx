import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, formatNumber } from '@/lib/format';
import { useQuery } from '@tanstack/react-query';
import { getDashboardStats, getTopFunds, getTopHoldings } from '@/lib/api';

export function Dashboard() {
  const { data: stats, isLoading: statsLoading, error: statsError } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: getDashboardStats
  });

  const { data: topFunds, isLoading: fundsLoading, error: fundsError } = useQuery({
    queryKey: ['top-funds'],
    queryFn: () => getTopFunds(3)
  });

  const { data: topHoldings, isLoading: holdingsLoading, error: holdingsError } = useQuery({
    queryKey: ['top-holdings'],
    queryFn: () => getTopHoldings(3)
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Overview of hedge fund activity and market trends</p>
        {statsError && (
          <p className="text-sm text-red-600">Failed to load dashboard stats.</p>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Funds</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statsLoading ? '—' : formatNumber(stats?.totalFunds || 0)}</div>
            <p className="text-xs text-muted-foreground">
              Active hedge funds tracked
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Securities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statsLoading ? '—' : formatNumber(stats?.totalSecurities || 0)}</div>
            <p className="text-xs text-muted-foreground">
              Unique securities held
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total AUM</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statsLoading ? '—' : formatCurrency((stats?.totalValue || 0) / 100)}</div>
            <p className="text-xs text-muted-foreground">
              Assets under management
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Updated</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statsLoading ? '—' : 'Latest filing period'}</div>
            <p className="text-xs text-muted-foreground">
              {statsLoading ? '' : 'Latest filing period'}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Funds */}
        <Card>
          <CardHeader>
            <CardTitle>Top Funds by AUM</CardTitle>
            <CardDescription>
              Largest hedge funds by assets under management
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(fundsLoading ? [] : (topFunds || [])).map((fund: any, index: number) => (
                <div key={fund.name} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium">{fund.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatCurrency((fund.total_value || 0) / 100)}
                      </p>
                    </div>
                  </div>
                  <div className={`text-sm ${(fund.quarterly_change || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {(fund.quarterly_change || 0) >= 0 ? '+' : ''}{(fund.quarterly_change || 0).toFixed(1)}%
                  </div>
                </div>
              ))}
              {fundsError && (
                <div className="text-sm text-red-600">Failed to load top funds.</div>
              )}
              {fundsLoading && (
                <div className="text-sm text-muted-foreground">Loading...</div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top Holdings */}
        <Card>
          <CardHeader>
            <CardTitle>Most Popular Holdings</CardTitle>
            <CardDescription>
              Securities held by the most hedge funds
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(holdingsLoading ? [] : (topHoldings || [])).map((holding: any) => (
                <div key={holding.security?.ticker || holding.security?.company_name} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center text-xs font-medium">
                      {(holding.security?.ticker || '—').slice(0, 2)}
                    </div>
                    <div>
                      <p className="font-medium">{holding.security?.ticker || holding.security?.company_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {holding.security?.company_name}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{formatCurrency((holding.total_value || 0) / 100)}</p>
                    <p className="text-xs text-muted-foreground">
                      {holding.holder_count || 0} holders
                    </p>
                  </div>
                </div>
              ))}
              {holdingsError && (
                <div className="text-sm text-red-600">Failed to load top holdings.</div>
              )}
              {holdingsLoading && (
                <div className="text-sm text-muted-foreground">Loading...</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}