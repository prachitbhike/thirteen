import { ApiError } from '@hedge-fund-tracker/shared';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;

    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new ApiError(
          errorData.error || `HTTP ${response.status}: ${response.statusText}`,
          response.status
        );
      }

      return response.json();
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(`Network error: ${error.message}`, 500);
    }
  }

  // Dashboard API
  dashboard = {
    getOverview: () => this.request('/api/dashboard/overview'),
    getTopFunds: (limit: number = 10, metric: string = 'totalValue') =>
      this.request(`/api/dashboard/top-funds?limit=${limit}&metric=${metric}`),
    getTopHoldings: (limit: number = 10, metric: string = 'totalValue') =>
      this.request(`/api/dashboard/top-holdings?limit=${limit}&metric=${metric}`),
    getSectorAllocation: (period?: string) =>
      this.request(`/api/dashboard/sector-allocation${period ? `?period=${period}` : ''}`),
    getRecentActivity: (limit: number = 20, type: string = 'all') =>
      this.request(`/api/dashboard/recent-activity?limit=${limit}&type=${type}`),
    getMarketTrends: () => this.request('/api/dashboard/market-trends'),
    getPortfolioMetrics: (period?: string) =>
      this.request(`/api/dashboard/portfolio-metrics${period ? `?period=${period}` : ''}`)
  };

  // Funds API
  funds = {
    list: (params: {
      page?: number;
      limit?: number;
      search?: string;
      sortBy?: string;
      sortOrder?: string;
    } = {}) => {
      const query = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) query.append(key, String(value));
      });
      return this.request(`/api/funds?${query.toString()}`);
    },
    getById: (id: number) => this.request(`/api/funds/${id}`),
    getPerformance: (id: number, params: {
      fromDate?: string;
      toDate?: string;
    } = {}) => {
      const query = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value) query.append(key, value);
      });
      return this.request(`/api/funds/${id}/performance?${query.toString()}`);
    },
    getHoldings: (id: number, params: {
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: string;
    } = {}) => {
      const query = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) query.append(key, String(value));
      });
      return this.request(`/api/funds/${id}/holdings?${query.toString()}`);
    }
  };

  // Holdings API
  holdings = {
    list: (params: {
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: string;
      fundManagerIds?: number[];
      securityIds?: number[];
      sectors?: string[];
      periodStartDate?: string;
      periodEndDate?: string;
      minValue?: string;
      maxValue?: string;
      search?: string;
    } = {}) => {
      const query = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          if (Array.isArray(value)) {
            query.append(key, value.join(','));
          } else {
            query.append(key, String(value));
          }
        }
      });
      return this.request(`/api/holdings?${query.toString()}`);
    },
    getPositionChanges: (params: {
      page?: number;
      limit?: number;
      changeType?: string;
      fundManagerIds?: number[];
      periodStartDate?: string;
      periodEndDate?: string;
      minChangeValue?: string;
      sortBy?: string;
      sortOrder?: string;
    } = {}) => {
      const query = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          if (Array.isArray(value)) {
            query.append(key, value.join(','));
          } else {
            query.append(key, String(value));
          }
        }
      });
      return this.request(`/api/holdings/position-changes?${query.toString()}`);
    },
    getAggregations: (params: {
      periodEndDate?: string;
      groupBy?: string;
    } = {}) => {
      const query = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value) query.append(key, value);
      });
      return this.request(`/api/holdings/aggregations?${query.toString()}`);
    },
    getTrends: (params: {
      securityId?: number;
      fundManagerId?: number;
    }) => {
      const query = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) query.append(key, String(value));
      });
      return this.request(`/api/holdings/trends?${query.toString()}`);
    }
  };

  // Search API
  search = {
    global: (params: {
      q: string;
      type?: string;
      limit?: number;
    }) => {
      const query = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) query.append(key, String(value));
      });
      return this.request(`/api/search?${query.toString()}`);
    },
    autocomplete: (params: {
      q: string;
      type?: string;
      limit?: number;
    }) => {
      const query = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) query.append(key, String(value));
      });
      return this.request(`/api/search/autocomplete?${query.toString()}`);
    },
    similar: (params: {
      type: string;
      id: number;
      limit?: number;
    }) => {
      const query = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) query.append(key, String(value));
      });
      return this.request(`/api/search/similar?${query.toString()}`);
    },
    trending: () => this.request('/api/search/trending')
  };

  // Analysis API
  analysis = {
    generatePortfolio: (data: {
      fundManagerId: number;
      period?: string;
      includeComparisons?: boolean;
    }) => this.request('/api/analysis/portfolio', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    generateSecurity: (data: {
      securityId: number;
      period?: string;
      includeHolders?: boolean;
    }) => this.request('/api/analysis/security', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    generateMarket: (data: {
      sector?: string;
      period?: string;
      analysisType?: string;
    }) => this.request('/api/analysis/market', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    getHistory: (params: {
      type: string;
      id: number;
      limit?: number;
    }) => {
      const query = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) query.append(key, String(value));
      });
      return this.request(`/api/analysis/history?${query.toString()}`);
    }
  };
}

// Create singleton instance
export const api = new ApiClient(API_BASE_URL);

// Export specific API modules for convenience
export const dashboardApi = api.dashboard;
export const fundsApi = api.funds;
export const holdingsApi = api.holdings;
export const searchApi = api.search;
export const analysisApi = api.analysis;