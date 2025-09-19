import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

const routeNames: Record<string, string> = {
  dashboard: 'Dashboard',
  funds: 'Hedge Funds',
  holdings: 'Holdings',
  securities: 'Securities',
  analysis: 'Analysis',
  search: 'Search'
};

export function Breadcrumbs() {
  const location = useLocation();
  const pathSegments = location.pathname.split('/').filter(Boolean);

  if (pathSegments.length === 0 || pathSegments[0] === 'dashboard') {
    return (
      <nav className="flex" aria-label="Breadcrumb">
        <ol className="flex items-center space-x-2">
          <li>
            <div className="flex items-center">
              <Home className="h-4 w-4 text-gray-400" />
              <span className="ml-2 text-sm font-medium text-gray-900 dark:text-white">
                Dashboard
              </span>
            </div>
          </li>
        </ol>
      </nav>
    );
  }

  return (
    <nav className="flex" aria-label="Breadcrumb">
      <ol className="flex items-center space-x-2">
        {/* Home/Dashboard */}
        <li>
          <div className="flex items-center">
            <Link
              to="/dashboard"
              className="flex items-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <Home className="h-4 w-4" />
              <span className="ml-2 text-sm font-medium">Dashboard</span>
            </Link>
          </div>
        </li>

        {/* Dynamic breadcrumbs */}
        {pathSegments.map((segment, index) => {
          const isLast = index === pathSegments.length - 1;
          const href = '/' + pathSegments.slice(0, index + 1).join('/');
          const isNumeric = /^\d+$/.test(segment);

          // Skip numeric segments (IDs) in breadcrumbs for cleaner display
          if (isNumeric && !isLast) {
            return null;
          }

          const displayName = isNumeric
            ? `Details`
            : routeNames[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);

          return (
            <li key={index}>
              <div className="flex items-center">
                <ChevronRight className="h-4 w-4 text-gray-400 mx-2" />
                {isLast ? (
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {displayName}
                  </span>
                ) : (
                  <Link
                    to={href}
                    className="text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    {displayName}
                  </Link>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}