import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatDate } from '@/lib/format';

export function Funds() {
  const [searchQuery, setSearchQuery] = useState('');

  // Mock data for demonstration
  const funds = [
    {
      id: 1,
      name: 'Berkshire Hathaway Inc',
      cik: '0001067983',
      totalValue: 500000000000,
      totalPositions: 45,
      lastFilingDate: '2024-08-14',
      quarterlyChange: 2.3,
      topHolding: 'Apple Inc.'
    },
    {
      id: 2,
      name: 'BlackRock Inc.',
      cik: '0001364742',
      totalValue: 400000000000,
      totalPositions: 234,
      lastFilingDate: '2024-08-15',
      quarterlyChange: 1.8,
      topHolding: 'Microsoft Corporation'
    },
    {
      id: 3,
      name: 'Vanguard Group Inc',
      cik: '0001104659',
      totalValue: 350000000000,
      totalPositions: 156,
      lastFilingDate: '2024-08-13',
      quarterlyChange: -0.5,
      topHolding: 'Amazon.com Inc.'
    },
    {
      id: 4,
      name: 'State Street Corp',
      cik: '0000093751',
      totalValue: 280000000000,
      totalPositions: 189,
      lastFilingDate: '2024-08-12',
      quarterlyChange: 3.1,
      topHolding: 'Tesla Inc.'
    }
  ];

  const filteredFunds = funds.filter(fund =>
    fund.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    fund.cik.includes(searchQuery)
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Hedge Funds</h1>
        <p className="text-muted-foreground">
          Search and explore institutional investment managers and their 13F filings
        </p>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search by fund name or CIK..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-md bg-background"
          />
        </div>
        <Button variant="outline">
          <Filter className="h-4 w-4 mr-2" />
          Filters
        </Button>
      </div>

      {/* Funds Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredFunds.map((fund) => (
          <Card key={fund.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-lg">
                    <Link
                      to={`/funds/${fund.id}`}
                      className="hover:text-primary transition-colors"
                    >
                      {fund.name}
                    </Link>
                  </CardTitle>
                  <CardDescription>CIK: {fund.cik}</CardDescription>
                </div>
                <div className={`flex items-center space-x-1 text-sm ${
                  fund.quarterlyChange >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {fund.quarterlyChange >= 0 ? (
                    <TrendingUp className="h-4 w-4" />
                  ) : (
                    <TrendingDown className="h-4 w-4" />
                  )}
                  <span>{fund.quarterlyChange >= 0 ? '+' : ''}{fund.quarterlyChange}%</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total Value</span>
                  <span className="font-semibold">{formatCurrency(fund.totalValue)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Positions</span>
                  <span className="font-semibold">{fund.totalPositions}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Last Filing</span>
                  <span className="font-semibold">{formatDate(fund.lastFilingDate)}</span>
                </div>
                <div className="pt-2 border-t">
                  <p className="text-sm text-muted-foreground">Top Holding:</p>
                  <p className="font-medium">{fund.topHolding}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredFunds.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No funds found matching your search.</p>
        </div>
      )}
    </div>
  );
}