export function Securities() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Securities
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Analyze securities and their institutional holders
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          Securities Page
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Browse and analyze securities held by institutional investors.
        </p>
      </div>
    </div>
  );
}