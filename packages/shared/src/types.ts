// API Response Types
export interface ApiResponse<T = any> {
  data: T;
  success: boolean;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Fund Manager Types
export interface FundManager {
  id: number;
  cik: string;
  name: string;
  address?: string;
  phone?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FundManagerWithStats extends FundManager {
  totalValue?: string;
  totalPositions?: number;
  lastFilingDate?: string;
  quarterlyReturn?: number;
}

// Security Types
export interface Security {
  id: number;
  cusip: string;
  ticker?: string;
  companyName: string;
  securityType?: string;
  sector?: string;
  industry?: string;
  createdAt: string;
}

// Filing Types
export interface Filing {
  id: number;
  fundManagerId: number;
  filingDate: string;
  periodEndDate: string;
  formType: string;
  totalValue?: string;
  totalPositions?: number;
  filingUrl?: string;
  processedAt?: string;
  createdAt: string;
}

// Holdings Types
export interface Holding {
  id: number;
  filingId: number;
  securityId: number;
  fundManagerId: number;
  periodEndDate: string;
  sharesHeld: string;
  marketValue: string;
  percentOfPortfolio?: string;
  investmentDiscretion?: string;
  votingAuthority?: string;
  createdAt: string;
}

export interface HoldingWithDetails extends Holding {
  security: Security;
  fundManager: FundManager;
}

// Position Change Types
export interface PositionChange {
  id: number;
  fundManagerId: number;
  securityId: number;
  fromPeriod: string;
  toPeriod: string;
  sharesChange?: string;
  valueChange?: string;
  percentChange?: string;
  changeType?: 'NEW' | 'SOLD' | 'INCREASED' | 'DECREASED';
  createdAt: string;
}

export interface PositionChangeWithDetails extends PositionChange {
  security: Security;
  fundManager: FundManager;
}

// Search Types
export interface SearchFilters {
  query?: string;
  sector?: string;
  minValue?: number;
  maxValue?: number;
  period?: string;
  changeType?: string;
}

export interface SearchResult {
  type: 'fund' | 'security' | 'holding';
  id: number;
  title: string;
  subtitle?: string;
  metadata?: Record<string, any>;
}

// Dashboard Types
export interface DashboardStats {
  totalFunds: number;
  totalSecurities: number;
  totalValue: string;
  lastUpdated: string;
}

export interface TopFund {
  id: number;
  name: string;
  totalValue: string;
  quarterlyChange: number;
  topHolding?: string;
}

export interface TopHolding {
  security: Security;
  totalValue: string;
  holderCount: number;
  quarterlyChange: number;
}

export interface SectorAllocation {
  sector: string;
  value: string;
  percentage: number;
  change: number;
}

// User Types
export interface User {
  id: number;
  email: string;
  firstName?: string;
  lastName?: string;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserTrackedFund {
  id: number;
  userId: number;
  fundManagerId: number;
  fundManager: FundManager;
  createdAt: string;
}

// Analysis Types
export interface AnalysisRequest {
  fundManagerId: number;
  analysisType: 'portfolio' | 'risk' | 'performance' | 'holdings';
  periodEndDate?: string;
}

export interface AnalysisResult {
  id: number;
  fundManagerId: number;
  periodEndDate?: string;
  analysisType: string;
  analysisResult: any;
  createdAt: string;
  expiresAt?: string;
}