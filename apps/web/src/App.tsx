import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';

// Layout components
import { DashboardLayout } from '@/components/layout/DashboardLayout';

// Page components
import { Dashboard } from '@/pages/Dashboard';
import { Funds } from '@/pages/Funds';
import { FundDetail } from '@/pages/FundDetail';
import { Holdings } from '@/pages/Holdings';
import { Securities } from '@/pages/Securities';
import { SecurityDetail } from '@/pages/SecurityDetail';
import { Analysis } from '@/pages/Analysis';
import { Search } from '@/pages/Search';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
          <Routes>
            {/* Dashboard routes */}
            <Route path="/" element={<DashboardLayout />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />

              {/* Funds */}
              <Route path="funds" element={<Funds />} />
              <Route path="funds/:id" element={<FundDetail />} />

              {/* Holdings */}
              <Route path="holdings" element={<Holdings />} />

              {/* Securities */}
              <Route path="securities" element={<Securities />} />
              <Route path="securities/:id" element={<SecurityDetail />} />

              {/* Analysis */}
              <Route path="analysis" element={<Analysis />} />

              {/* Search */}
              <Route path="search" element={<Search />} />
            </Route>
          </Routes>

          {/* Toast notifications */}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              className: 'font-medium',
            }}
          />
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;