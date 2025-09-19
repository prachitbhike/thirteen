import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { formatCurrency } from '@hedge-fund-tracker/shared';

interface SectorData {
  sector: string;
  totalValue: string;
  positionCount: number;
  fundCount: number;
  percentage: number;
}

interface SectorAllocationProps {
  data?: {
    sectors: SectorData[];
    totalValue: string;
  };
  loading?: boolean;
}

const COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Yellow
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#06B6D4', // Cyan
  '#F97316', // Orange
  '#84CC16', // Lime
  '#EC4899', // Pink
  '#6B7280'  // Gray
];

export function SectorAllocation({ data, loading }: SectorAllocationProps) {
  if (loading) {
    return (
      <div className="h-64 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
    );
  }

  if (!data?.sectors?.length) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
        No sector data available
      </div>
    );
  }

  const chartData = data.sectors.map((sector, index) => ({
    name: sector.sector,
    value: sector.percentage,
    totalValue: Number(sector.totalValue),
    positionCount: sector.positionCount,
    fundCount: sector.fundCount,
    color: COLORS[index % COLORS.length]
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900 dark:text-white">
            {data.name}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Value: {formatCurrency(data.totalValue / 100)}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Share: {data.value.toFixed(1)}%
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Positions: {data.positionCount.toLocaleString()}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Funds: {data.fundCount}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4">
      {/* Chart */}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-2 text-sm">
        {chartData.slice(0, 8).map((sector, index) => (
          <div key={sector.name} className="flex items-center space-x-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: sector.color }}
            />
            <span className="text-gray-700 dark:text-gray-300 truncate">
              {sector.name}
            </span>
            <span className="text-gray-500 dark:text-gray-400 ml-auto">
              {sector.value.toFixed(1)}%
            </span>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500 dark:text-gray-400">Total Sectors</p>
            <p className="font-semibold text-gray-900 dark:text-white">
              {data.sectors.length}
            </p>
          </div>
          <div>
            <p className="text-gray-500 dark:text-gray-400">Total Value</p>
            <p className="font-semibold text-gray-900 dark:text-white">
              {formatCurrency(Number(data.totalValue) / 100)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}