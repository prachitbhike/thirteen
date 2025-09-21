import { useParams } from 'react-router-dom';
import { ArrowLeft, ExternalLink, TrendingUp, TrendingDown, Plus, Minus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatDate, formatNumber } from '@/lib/format';

export function FundDetail() {
  const { id } = useParams();

  // Mock data for demonstration
  const fund = {
    id: 1,
    name: 'Berkshire Hathaway Inc',
    cik: '0001067983',
    address: '1440 Kiewit Plaza, Omaha, NE 68131',
    phone: '(402) 346-1400',
    totalValue: 500000000000,
    totalPositions: 45,
    lastFilingDate: '2024-08-14',
    quarterlyChange: 2.3,
    topHolding: 'Apple Inc.'
  };

  const holdings = [
    {
      id: 1,
      security: { ticker: 'AAPL', companyName: 'Apple Inc.', sector: 'Technology' },
      sharesHeld: 915560000,
      marketValue: 174000000000,
      percentOfPortfolio: 34.8,
      changeType: 'DECREASED',
      valueChange: -12000000000
    },
    {
      id: 2,
      security: { ticker: 'BAC', companyName: 'Bank of America Corp', sector: 'Financials' },
      sharesHeld: 1032720000,
      marketValue: 41000000000,
      percentOfPortfolio: 8.2,
      changeType: 'INCREASED',
      valueChange: 2500000000
    },
    {
      id: 3,
      security: { ticker: 'CVX', companyName: 'Chevron Corporation', sector: 'Energy' },
      sharesHeld: 123100000,
      marketValue: 18500000000,
      percentOfPortfolio: 3.7,
      changeType: 'NEW',
      valueChange: 18500000000
    },
    {
      id: 4,
      security: { ticker: 'KO', companyName: 'The Coca-Cola Company', sector: 'Consumer Staples' },
      sharesHeld: 400000000,
      marketValue: 25000000000,
      percentOfPortfolio: 5.0,
      changeType: 'INCREASED',
      valueChange: 1200000000
    }
  ];

  const filingHistory = [
    { date: '2024-08-14', period: 'Q2 2024', totalValue: 500000000000, positions: 45 },
    { date: '2024-05-15', period: 'Q1 2024', totalValue: 490000000000, positions: 47 },
    { date: '2024-02-14', period: 'Q4 2023', totalValue: 485000000000, positions: 46 },
  ];

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
          <h1 className="text-3xl font-bold">{fund.name}</h1>
          <p className="text-muted-foreground">CIK: {fund.cik}</p>
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
            <div className="text-2xl font-bold">{formatCurrency(fund.totalValue)}</div>
            <div className={`flex items-center text-xs ${
              fund.quarterlyChange >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {fund.quarterlyChange >= 0 ? (
                <TrendingUp className="h-3 w-3 mr-1" />
              ) : (
                <TrendingDown className="h-3 w-3 mr-1" />
              )}
              {fund.quarterlyChange >= 0 ? '+' : ''}{fund.quarterlyChange}% from last quarter
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Positions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fund.totalPositions}</div>
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
            <div className="text-2xl font-bold">{formatDate(fund.lastFilingDate)}</div>
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
            <div className="text-lg font-bold">AAPL</div>
            <p className="text-xs text-muted-foreground">
              {holdings[0].percentOfPortfolio}% of portfolio
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
                Latest reported positions as of {formatDate(fund.lastFilingDate)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {holdings.map((holding) => (
                  <div key={holding.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-secondary rounded-lg flex items-center justify-center">
                        <span className="font-semibold text-sm">{holding.security.ticker}</span>
                      </div>
                      <div>
                        <p className="font-medium">{holding.security.companyName}</p>
                        <p className="text-sm text-muted-foreground">{holding.security.sector}</p>
                      </div>
                    </div>

                    <div className="text-right space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold">{formatCurrency(holding.marketValue)}</span>
                        <div className={`flex items-center text-xs ${
                          holding.changeType === 'NEW' ? 'text-blue-600' :
                          holding.changeType === 'INCREASED' ? 'text-green-600' :
                          holding.changeType === 'DECREASED' ? 'text-red-600' : 'text-gray-600'
                        }`}>
                          {holding.changeType === 'NEW' && <Plus className="h-3 w-3" />}
                          {holding.changeType === 'INCREASED' && <TrendingUp className="h-3 w-3" />}
                          {holding.changeType === 'DECREASED' && <TrendingDown className="h-3 w-3" />}
                          {holding.changeType === 'SOLD' && <Minus className="h-3 w-3" />}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {formatNumber(holding.sharesHeld)} shares • {holding.percentOfPortfolio}%
                      </p>
                    </div>
                  </div>
                ))}
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
                {filingHistory.map((filing, index) => (
                  <div key={filing.date} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{filing.period}</p>
                      <p className="text-sm text-muted-foreground">{formatDate(filing.date)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(filing.totalValue)}</p>
                      <p className="text-sm text-muted-foreground">{filing.positions} positions</p>
                    </div>
                  </div>
                ))}
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
                  <p>{fund.address}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Phone</p>
                  <p>{fund.phone}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">CIK Number</p>
                  <p>{fund.cik}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}