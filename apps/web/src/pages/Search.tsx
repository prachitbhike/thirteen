import { useState } from 'react';
import { Search as SearchIcon, Building2, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatDate } from '@/lib/format';

export function Search() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'all' | 'funds' | 'securities'>('all');

  // Mock search results
  const searchResults = searchQuery ? [
    {
      type: 'fund' as const,
      id: 1,
      title: 'Berkshire Hathaway Inc',
      subtitle: 'CIK: 0001067983',
      metadata: {
        totalValue: 500000000000,
        positions: 45,
        lastFiling: '2024-08-14'
      }
    },
    {
      type: 'security' as const,
      id: 1,
      title: 'Apple Inc. (AAPL)',
      subtitle: 'Technology • CUSIP: 037833100',
      metadata: {
        holders: 156,
        totalValue: 150000000000,
        sector: 'Technology'
      }
    },
    {
      type: 'fund' as const,
      id: 2,
      title: 'BlackRock Inc.',
      subtitle: 'CIK: 0001364742',
      metadata: {
        totalValue: 400000000000,
        positions: 234,
        lastFiling: '2024-08-15'
      }
    }
  ].filter(result => searchType === 'all' || result.type === searchType) : [];

  const popularSearches = [
    'Berkshire Hathaway',
    'Apple',
    'Microsoft',
    'Warren Buffett',
    'Tesla',
    'Amazon'
  ];

  const trendingSecurities = [
    { symbol: 'AAPL', name: 'Apple Inc.', change: 2.3 },
    { symbol: 'MSFT', name: 'Microsoft Corporation', change: 1.8 },
    { symbol: 'GOOGL', name: 'Alphabet Inc.', change: -0.5 },
    { symbol: 'TSLA', name: 'Tesla Inc.', change: 4.2 }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Search</h1>
        <p className="text-muted-foreground">
          Find hedge funds, securities, and institutional holdings
        </p>
      </div>

      {/* Search Input */}
      <div className="space-y-4">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search for funds, securities, or tickers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 text-lg border rounded-lg bg-background"
          />
        </div>

        {/* Search Type Filters */}
        <div className="flex space-x-2">
          <Button
            variant={searchType === 'all' ? 'default' : 'outline'}
            onClick={() => setSearchType('all')}
            size="sm"
          >
            All
          </Button>
          <Button
            variant={searchType === 'funds' ? 'default' : 'outline'}
            onClick={() => setSearchType('funds')}
            size="sm"
          >
            Funds
          </Button>
          <Button
            variant={searchType === 'securities' ? 'default' : 'outline'}
            onClick={() => setSearchType('securities')}
            size="sm"
          >
            Securities
          </Button>
        </div>
      </div>

      {/* Search Results */}
      {searchQuery && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Search Results</h2>
          {searchResults.length > 0 ? (
            <div className="space-y-3">
              {searchResults.map((result) => (
                <Card key={`${result.type}-${result.id}`} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          result.type === 'fund' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'
                        }`}>
                          {result.type === 'fund' ? (
                            <Building2 className="h-5 w-5" />
                          ) : (
                            <TrendingUp className="h-5 w-5" />
                          )}
                        </div>
                        <div>
                          <Link
                            to={result.type === 'fund' ? `/funds/${result.id}` : `/securities/${result.id}`}
                            className="font-medium hover:text-primary transition-colors"
                          >
                            {result.title}
                          </Link>
                          <p className="text-sm text-muted-foreground">{result.subtitle}</p>
                        </div>
                      </div>
                      <div className="text-right text-sm">
                        {result.type === 'fund' && (
                          <>
                            <p className="font-semibold">{formatCurrency(result.metadata.totalValue)}</p>
                            <p className="text-muted-foreground">{result.metadata.positions} positions</p>
                          </>
                        )}
                        {result.type === 'security' && (
                          <>
                            <p className="font-semibold">{result.metadata.holders} holders</p>
                            <p className="text-muted-foreground">{formatCurrency(result.metadata.totalValue)}</p>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No results found for "{searchQuery}"</p>
            </div>
          )}
        </div>
      )}

      {/* Default Content */}
      {!searchQuery && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Popular Searches */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold mb-4">Popular Searches</h2>
              <div className="flex flex-wrap gap-2">
                {popularSearches.map((search) => (
                  <Button
                    key={search}
                    variant="outline"
                    size="sm"
                    onClick={() => setSearchQuery(search)}
                  >
                    {search}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Trending Securities */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold mb-4">Trending Securities</h2>
              <div className="space-y-3">
                {trendingSecurities.map((security) => (
                  <div key={security.symbol} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{security.symbol}</p>
                      <p className="text-sm text-muted-foreground">{security.name}</p>
                    </div>
                    <div className={`text-sm ${
                      security.change >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {security.change >= 0 ? '+' : ''}{security.change}%
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}