import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, formatNumber } from '@/lib/format';

export function Dashboard() {
  // Mock data for now
  const stats = {
    totalFunds: 1234,
    totalSecurities: 5678,
    totalValue: 2500000000000, // $2.5T
    lastUpdated: new Date().toISOString(),
  };

  const topFunds = [
    { name: 'Berkshire Hathaway', totalValue: 500000000000, change: 2.3 },
    { name: 'BlackRock', totalValue: 400000000000, change: 1.8 },
    { name: 'Vanguard', totalValue: 350000000000, change: -0.5 },
  ];

  const topHoldings = [
    { symbol: 'AAPL', name: 'Apple Inc.', totalValue: 150000000000, holders: 156 },
    { symbol: 'MSFT', name: 'Microsoft Corporation', totalValue: 120000000000, holders: 234 },
    { symbol: 'GOOGL', name: 'Alphabet Inc.', totalValue: 100000000000, holders: 189 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of hedge fund activity and market trends
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Funds</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(stats.totalFunds)}</div>
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
            <div className="text-2xl font-bold">{formatNumber(stats.totalSecurities)}</div>
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
            <div className="text-2xl font-bold">{formatCurrency(stats.totalValue)}</div>
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
            <div className="text-2xl font-bold">Q3 2024</div>
            <p className="text-xs text-muted-foreground">
              Latest filing period
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
              {topFunds.map((fund, index) => (
                <div key={fund.name} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium">{fund.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatCurrency(fund.totalValue)}
                      </p>
                    </div>
                  </div>
                  <div className={`text-sm ${fund.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {fund.change >= 0 ? '+' : ''}{fund.change}%
                  </div>
                </div>
              ))}
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
              {topHoldings.map((holding) => (
                <div key={holding.symbol} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center text-xs font-medium">
                      {holding.symbol.slice(0, 2)}
                    </div>
                    <div>
                      <p className="font-medium">{holding.symbol}</p>
                      <p className="text-sm text-muted-foreground">
                        {holding.name}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{formatCurrency(holding.totalValue)}</p>
                    <p className="text-xs text-muted-foreground">
                      {holding.holders} holders
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}