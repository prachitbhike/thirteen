import { useQuery } from '@tanstack/react-query';
import { formatCurrency, formatLargeNumber } from '@hedge-fund-tracker/shared';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';

// Components
import { StatCard } from '@/components/dashboard/StatCard';
import { TopFunds } from '@/components/dashboard/TopFunds';
import { TopHoldings } from '@/components/dashboard/TopHoldings';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { SectorAllocation } from '@/components/dashboard/SectorAllocation';

// API
import { dashboardApi } from '@/lib/api';

export function Dashboard() {
  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ['dashboard', 'overview'],
    queryFn: dashboardApi.getOverview
  });

  const { data: topFunds, isLoading: fundsLoading } = useQuery({
    queryKey: ['dashboard', 'top-funds'],
    queryFn: () => dashboardApi.getTopFunds(10, 'totalValue')
  });

  const { data: topHoldings, isLoading: holdingsLoading } = useQuery({
    queryKey: ['dashboard', 'top-holdings'],
    queryFn: () => dashboardApi.getTopHoldings(10, 'totalValue')
  });

  const { data: sectorData, isLoading: sectorLoading } = useQuery({
    queryKey: ['dashboard', 'sector-allocation'],
    queryFn: dashboardApi.getSectorAllocation
  });

  const { data: marketTrends, isLoading: trendsLoading } = useQuery({
    queryKey: ['dashboard', 'market-trends'],
    queryFn: dashboardApi.getMarketTrends
  });

  if (overviewLoading) {
    return (
      <div className="animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  const stats = [
    {
      title: 'Total Funds',
      value: overview?.data.overview.totalFunds?.toLocaleString() || '0',
      change: '+5.2%',
      changeType: 'positive' as const,
      icon: '🏛️'
    },
    {
      title: 'Total Holdings',
      value: overview?.data.overview.totalHoldings?.toLocaleString() || '0',
      change: '+12.3%',
      changeType: 'positive' as const,
      icon: '📊'
    },
    {
      title: 'Total AUM',
      value: formatCurrency(Number(overview?.data.currentPeriod.totalValue || 0) / 100),
      change: '+8.7%',
      changeType: 'positive' as const,
      icon: '💰'
    },
    {
      title: 'Active Funds',
      value: overview?.data.currentPeriod.activeFunds?.toLocaleString() || '0',
      change: '+2.1%',
      changeType: 'positive' as const,
      icon: '📈'
    }
  ];

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Dashboard
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Overview of hedge fund activity and market trends
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Last updated
          </p>
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            {overview?.data.overview.lastUpdated
              ? new Date(overview.data.overview.lastUpdated).toLocaleString()
              : 'N/A'
            }
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>

      {/* Charts and Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Sector Allocation Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Sector Allocation
            </h2>
            <select className="text-sm border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
              <option>Current Quarter</option>
              <option>Previous Quarter</option>
            </select>
          </div>

          <SectorAllocation data={sectorData?.data} loading={sectorLoading} />
        </div>

        {/* Market Trends */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Activity Trends (30 days)
            </h2>
          </div>

          {trendsLoading ? (
            <div className="h-64 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-blue-600">
                    {marketTrends?.data.summary.totalChanges || 0}
                  </p>
                  <p className="text-sm text-gray-500">Position Changes</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-600">
                    {marketTrends?.data.summary.activeFunds || 0}
                  </p>
                  <p className="text-sm text-gray-500">Active Funds</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-purple-600">
                    {formatLargeNumber(Number(marketTrends?.data.summary.totalValueChange || 0) / 100)}
                  </p>
                  <p className="text-sm text-gray-500">Total Volume</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Top Funds */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Top Funds by AUM
            </h2>
          </div>
          <TopFunds data={topFunds?.data} loading={fundsLoading} />
        </div>

        {/* Top Holdings */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Most Popular Holdings
            </h2>
          </div>
          <TopHoldings data={topHoldings?.data} loading={holdingsLoading} />
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Recent Activity
          </h2>
        </div>
        <RecentActivity />
      </div>
    </div>
  );
}