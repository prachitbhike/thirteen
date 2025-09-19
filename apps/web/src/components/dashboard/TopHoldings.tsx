interface TopHoldingsProps {
  data?: any;
  loading?: boolean;
}

export function TopHoldings({ data, loading }: TopHoldingsProps) {
  if (loading) {
    return <div className="p-6 animate-pulse">Loading holdings...</div>;
  }

  return (
    <div className="p-6">
      <p className="text-gray-600 dark:text-gray-400">
        Top holdings data will be displayed here.
      </p>
    </div>
  );
}
