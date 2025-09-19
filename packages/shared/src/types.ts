import { z } from 'zod';

// Fund Manager Types
export const FundManagerSchema = z.object({
  id: z.number(),
  cik: z.string(),
  name: z.string(),
  address: z.string().nullable(),
  phone: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date()
});

export type FundManager = z.infer<typeof FundManagerSchema>;

// Security Types
export const SecuritySchema = z.object({
  id: z.number(),
  cusip: z.string(),
  ticker: z.string().nullable(),
  companyName: z.string(),
  securityType: z.string().nullable(),
  sector: z.string().nullable(),
  industry: z.string().nullable(),
  createdAt: z.date()
});

export type Security = z.infer<typeof SecuritySchema>;

// Holdings Types
export const HoldingSchema = z.object({
  id: z.number(),
  filingId: z.number(),
  securityId: z.number(),
  fundManagerId: z.number(),
  periodEndDate: z.date(),
  sharesHeld: z.bigint(),
  marketValue: z.bigint(),
  percentOfPortfolio: z.number().nullable(),
  investmentDiscretion: z.string().nullable(),
  votingAuthority: z.string().nullable(),
  createdAt: z.date()
});

export type Holding = z.infer<typeof HoldingSchema>;

// Position Change Types
export const PositionChangeSchema = z.object({
  id: z.number(),
  fundManagerId: z.number(),
  securityId: z.number(),
  fromPeriod: z.date(),
  toPeriod: z.date(),
  sharesChange: z.bigint().nullable(),
  valueChange: z.bigint().nullable(),
  percentChange: z.number().nullable(),
  changeType: z.enum(['NEW', 'SOLD', 'INCREASED', 'DECREASED']).nullable(),
  createdAt: z.date()
});

export type PositionChange = z.infer<typeof PositionChangeSchema>;

// API Response Types
export const PaginationSchema = z.object({
  page: z.number(),
  limit: z.number(),
  total: z.number(),
  totalPages: z.number()
});

export type Pagination = z.infer<typeof PaginationSchema>;

export const ApiResponseSchema = <T extends z.ZodType>(dataSchema: T) => z.object({
  success: z.boolean(),
  data: dataSchema,
  pagination: PaginationSchema.optional(),
  message: z.string().optional()
});

// Dashboard Types
export const DashboardStatsSchema = z.object({
  totalFunds: z.number(),
  totalHoldings: z.number(),
  totalValue: z.bigint(),
  lastUpdated: z.date()
});

export type DashboardStats = z.infer<typeof DashboardStatsSchema>;

export const TopHoldingSchema = z.object({
  security: SecuritySchema,
  fundManager: FundManagerSchema,
  marketValue: z.bigint(),
  sharesHeld: z.bigint(),
  percentOfPortfolio: z.number().nullable(),
  periodEndDate: z.date()
});

export type TopHolding = z.infer<typeof TopHoldingSchema>;

// 13F Filing Types
export const FilingSchema = z.object({
  id: z.number(),
  fundManagerId: z.number(),
  filingDate: z.date(),
  periodEndDate: z.date(),
  formType: z.string(),
  totalValue: z.bigint().nullable(),
  totalPositions: z.number().nullable(),
  filingUrl: z.string().nullable(),
  processedAt: z.date().nullable(),
  createdAt: z.date()
});

export type Filing = z.infer<typeof FilingSchema>;

// Search and Filter Types
export const HoldingFiltersSchema = z.object({
  fundManagerIds: z.array(z.number()).optional(),
  securityIds: z.array(z.number()).optional(),
  sectors: z.array(z.string()).optional(),
  periodStartDate: z.date().optional(),
  periodEndDate: z.date().optional(),
  minValue: z.bigint().optional(),
  maxValue: z.bigint().optional(),
  changeType: z.enum(['NEW', 'SOLD', 'INCREASED', 'DECREASED']).optional()
});

export type HoldingFilters = z.infer<typeof HoldingFiltersSchema>;

// Analysis Types
export const AnalysisTypeSchema = z.enum([
  'portfolio_summary',
  'position_changes',
  'sector_allocation',
  'concentration_risk',
  'performance_metrics'
]);

export type AnalysisType = z.infer<typeof AnalysisTypeSchema>;

export const AnalysisResultSchema = z.object({
  type: AnalysisTypeSchema,
  summary: z.string(),
  insights: z.array(z.string()),
  data: z.record(z.unknown()),
  generatedAt: z.date()
});

export type AnalysisResult = z.infer<typeof AnalysisResultSchema>;