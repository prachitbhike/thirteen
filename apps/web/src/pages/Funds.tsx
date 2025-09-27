import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatDate } from '@/lib/format';
import { useQuery } from '@tanstack/react-query';
import { getFunds } from '@/lib/api';
import { useDebouncedValue } from '@/lib/utils';

export function Funds() {
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedQuery = useDebouncedValue(searchQuery, 350);

  const { data: funds, isLoading, error } = useQuery({
    queryKey: ['funds', debouncedQuery],
    queryFn: () => getFunds(debouncedQuery || undefined, 30)
  });

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
        {(isLoading ? [] : (funds || [])).map((fund: any) => (
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
                  (fund.quarterly_change || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {(fund.quarterly_change || 0) >= 0 ? (
                    <TrendingUp className="h-4 w-4" />
                  ) : (
                    <TrendingDown className="h-4 w-4" />
                  )}
                  <span>{(fund.quarterly_change || 0) >= 0 ? '+' : ''}{(fund.quarterly_change || 0).toFixed(1)}%</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total Value</span>
                  <span className="font-semibold">{formatCurrency((fund.total_value || 0) / 100)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Positions</span>
                  <span className="font-semibold">{fund.total_positions || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Last Filing</span>
                  <span className="font-semibold">{fund.last_filing_date ? formatDate(fund.last_filing_date) : '—'}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {!isLoading && !error && (funds?.length || 0) === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No funds found matching your search.</p>
        </div>
      )}

      {error && (
        <div className="text-center py-12">
          <p className="text-red-600">Failed to load funds.</p>
        </div>
      )}
    </div>
  );
}