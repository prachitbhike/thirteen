import { pgTable, serial, varchar, text, timestamp, integer, bigint, decimal, date, jsonb, index, unique } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './auth-schema';

// Hedge Funds / Investment Managers
export const fundManagers = pgTable('fund_managers', {
  id: serial('id').primaryKey(),
  cik: varchar('cik', { length: 10 }).unique().notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  address: text('address'),
  phone: varchar('phone', { length: 20 }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// Securities Universe
export const securities = pgTable('securities', {
  id: serial('id').primaryKey(),
  cusip: varchar('cusip', { length: 9 }).unique().notNull(),
  ticker: varchar('ticker', { length: 10 }),
  companyName: varchar('company_name', { length: 255 }).notNull(),
  securityType: varchar('security_type', { length: 50 }),
  sector: varchar('sector', { length: 100 }),
  industry: varchar('industry', { length: 100 }),
  createdAt: timestamp('created_at').defaultNow()
}, (table) => ({
  tickerIdx: index('idx_securities_ticker').on(table.ticker),
}));

// 13F Filings Metadata
export const filings = pgTable('filings', {
  id: serial('id').primaryKey(),
  fundManagerId: integer('fund_manager_id').references(() => fundManagers.id).notNull(),
  filingDate: date('filing_date').notNull(),
  periodEndDate: date('period_end_date').notNull(),
  formType: varchar('form_type', { length: 10 }).default('13F-HR'),
  totalValue: bigint('total_value', { mode: 'bigint' }),
  totalPositions: integer('total_positions'),
  filingUrl: varchar('filing_url', { length: 500 }),
  processedAt: timestamp('processed_at'),
  createdAt: timestamp('created_at').defaultNow()
}, (table) => ({
  periodIdx: index('idx_filings_period').on(table.periodEndDate),
}));

// Holdings Data (Core Table)
export const holdings = pgTable('holdings', {
  id: serial('id').primaryKey(),
  filingId: integer('filing_id').references(() => filings.id).notNull(),
  securityId: integer('security_id').references(() => securities.id).notNull(),
  fundManagerId: integer('fund_manager_id').references(() => fundManagers.id).notNull(),
  periodEndDate: date('period_end_date').notNull(),
  sharesHeld: bigint('shares_held', { mode: 'bigint' }).notNull(),
  marketValue: bigint('market_value', { mode: 'bigint' }).notNull(), // in USD cents
  percentOfPortfolio: decimal('percent_of_portfolio', { precision: 5, scale: 2 }),
  investmentDiscretion: varchar('investment_discretion', { length: 20 }),
  votingAuthority: varchar('voting_authority', { length: 20 }),
  createdAt: timestamp('created_at').defaultNow()
}, (table) => ({
  fundPeriodIdx: index('idx_holdings_fund_period').on(table.fundManagerId, table.periodEndDate),
  securityIdx: index('idx_holdings_security').on(table.securityId),
}));

// Position Changes (Calculated)
export const positionChanges = pgTable('position_changes', {
  id: serial('id').primaryKey(),
  fundManagerId: integer('fund_manager_id').references(() => fundManagers.id).notNull(),
  securityId: integer('security_id').references(() => securities.id).notNull(),
  fromPeriod: date('from_period').notNull(),
  toPeriod: date('to_period').notNull(),
  sharesChange: bigint('shares_change', { mode: 'bigint' }),
  valueChange: bigint('value_change', { mode: 'bigint' }),
  percentChange: decimal('percent_change', { precision: 8, scale: 2 }),
  changeType: varchar('change_type', { length: 20 }), // 'NEW', 'SOLD', 'INCREASED', 'DECREASED'
  createdAt: timestamp('created_at').defaultNow()
}, (table) => ({
  fundPeriodIdx: index('idx_position_changes_fund').on(table.fundManagerId, table.toPeriod),
}));

// User's Tracked Funds
export const userTrackedFunds = pgTable('user_tracked_funds', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  fundManagerId: integer('fund_manager_id').references(() => fundManagers.id).notNull(),
  createdAt: timestamp('created_at').defaultNow()
}, (table) => ({
  userFundUnique: unique().on(table.userId, table.fundManagerId),
}));

// LLM Analysis Cache
export const analysisCache = pgTable('analysis_cache', {
  id: serial('id').primaryKey(),
  fundManagerId: integer('fund_manager_id').references(() => fundManagers.id).notNull(),
  periodEndDate: date('period_end_date'),
  analysisType: varchar('analysis_type', { length: 50 }),
  analysisResult: jsonb('analysis_result'),
  createdAt: timestamp('created_at').defaultNow(),
  expiresAt: timestamp('expires_at')
});

// Relations
export const fundManagersRelations = relations(fundManagers, ({ many }) => ({
  filings: many(filings),
  holdings: many(holdings),
  positionChanges: many(positionChanges),
  userTrackedFunds: many(userTrackedFunds),
  analysisCache: many(analysisCache)
}));

export const securitiesRelations = relations(securities, ({ many }) => ({
  holdings: many(holdings),
  positionChanges: many(positionChanges)
}));

export const filingsRelations = relations(filings, ({ one, many }) => ({
  fundManager: one(fundManagers, {
    fields: [filings.fundManagerId],
    references: [fundManagers.id]
  }),
  holdings: many(holdings)
}));

export const holdingsRelations = relations(holdings, ({ one }) => ({
  filing: one(filings, {
    fields: [holdings.filingId],
    references: [filings.id]
  }),
  security: one(securities, {
    fields: [holdings.securityId],
    references: [securities.id]
  }),
  fundManager: one(fundManagers, {
    fields: [holdings.fundManagerId],
    references: [fundManagers.id]
  })
}));

export const positionChangesRelations = relations(positionChanges, ({ one }) => ({
  fundManager: one(fundManagers, {
    fields: [positionChanges.fundManagerId],
    references: [fundManagers.id]
  }),
  security: one(securities, {
    fields: [positionChanges.securityId],
    references: [securities.id]
  })
}));

export const usersRelations = relations(users, ({ many }) => ({
  userTrackedFunds: many(userTrackedFunds)
}));

export const userTrackedFundsRelations = relations(userTrackedFunds, ({ one }) => ({
  user: one(users, {
    fields: [userTrackedFunds.userId],
    references: [users.id]
  }),
  fundManager: one(fundManagers, {
    fields: [userTrackedFunds.fundManagerId],
    references: [fundManagers.id]
  })
}));

export const analysisCacheRelations = relations(analysisCache, ({ one }) => ({
  fundManager: one(fundManagers, {
    fields: [analysisCache.fundManagerId],
    references: [fundManagers.id]
  })
}));

export { users } from './auth-schema';