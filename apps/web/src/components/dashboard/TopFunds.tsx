import { Link } from 'react-router-dom';
import { formatCurrency, formatDate } from '@hedge-fund-tracker/shared';
import { ExternalLink, TrendingUp } from 'lucide-react';

interface Fund {
  id: number;
  cik: string;
  name: string;
  stats: {
    totalValue: string;
    positionCount: number;
    uniqueSecurities: number;
    latestPeriod: string | null;
  };
}

interface TopFundsProps {
  data?: {
    metric: string;
    funds: Fund[];
  };
  loading?: boolean;
}

export function TopFunds({ data, loading }: TopFundsProps) {
  if (loading) {
    return (
      <div className="p-6">
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="flex items-center space-x-4">
                <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                </div>
                <div className="text-right">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20 mb-2" />
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!data?.funds?.length) {
    return (
      <div className="p-6 text-center text-gray-500 dark:text-gray-400">
        No fund data available
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="space-y-4">
        {data.funds.map((fund, index) => (
          <div
            key={fund.id}
            className="flex items-center space-x-4 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            {/* Rank */}
            <div className="flex-shrink-0 w-8 h-8 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center text-sm font-semibold">
              {index + 1}
            </div>

            {/* Fund Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <Link
                  to={`/funds/${fund.id}`}
                  className="text-sm font-medium text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 truncate"
                >
                  {fund.name}
                </Link>
                <ExternalLink className="h-3 w-3 text-gray-400" />
              </div>
              <div className="flex items-center space-x-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
                <span>CIK: {fund.cik}</span>
                <span>•</span>
                <span>{fund.stats.positionCount} positions</span>
                <span>•</span>
                <span>{fund.stats.uniqueSecurities} securities</span>
              </div>
            </div>

            {/* Stats */}
            <div className="text-right">
              <div className="text-sm font-semibold text-gray-900 dark:text-white">
                {formatCurrency(Number(fund.stats.totalValue) / 100)}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {fund.stats.latestPeriod
                  ? `Updated ${formatDate(fund.stats.latestPeriod, 'MMM dd')}`
                  : 'No recent data'
                }
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* View All Link */}
      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
        <Link
          to="/funds"
          className="flex items-center justify-center text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
        >
          View all funds
          <TrendingUp className="ml-1 h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}