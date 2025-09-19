import { pgTable, serial, varchar, text, timestamp, boolean, jsonb, index, unique } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// User management tables
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  username: varchar('username', { length: 50 }).unique(),
  fullName: varchar('full_name', { length: 255 }),
  hashedPassword: varchar('hashed_password', { length: 255 }),
  emailVerified: boolean('email_verified').default(false),
  isActive: boolean('is_active').default(true),
  lastLoginAt: timestamp('last_login_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table) => ({
  emailIdx: index('idx_users_email').on(table.email),
  usernameIdx: index('idx_users_username').on(table.username),
}));

// User sessions for authentication
export const sessions = pgTable('sessions', {
  id: serial('id').primaryKey(),
  userId: serial('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  sessionToken: varchar('session_token', { length: 255 }).unique().notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow()
}, (table) => ({
  sessionTokenIdx: index('idx_sessions_token').on(table.sessionToken),
  userIdIdx: index('idx_sessions_user_id').on(table.userId),
}));

// User preferences and settings
export const userPreferences = pgTable('user_preferences', {
  id: serial('id').primaryKey(),
  userId: serial('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  dashboardLayout: jsonb('dashboard_layout'),
  notifications: jsonb('notifications'),
  theme: varchar('theme', { length: 20 }).default('light'),
  timezone: varchar('timezone', { length: 50 }).default('UTC'),
  currency: varchar('currency', { length: 3 }).default('USD'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table) => ({
  userIdIdx: index('idx_user_preferences_user_id').on(table.userId),
}));

// User's tracked/watchlist funds
export const userWatchlists = pgTable('user_watchlists', {
  id: serial('id').primaryKey(),
  userId: serial('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  isDefault: boolean('is_default').default(false),
  isPublic: boolean('is_public').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table) => ({
  userIdIdx: index('idx_user_watchlists_user_id').on(table.userId),
  uniqueUserDefault: unique().on(table.userId, table.isDefault).where(table.isDefault.eq(true)),
}));

// Funds in user watchlists
export const watchlistFunds = pgTable('watchlist_funds', {
  id: serial('id').primaryKey(),
  watchlistId: serial('watchlist_id').references(() => userWatchlists.id, { onDelete: 'cascade' }).notNull(),
  fundManagerId: serial('fund_manager_id').notNull(), // References fundManagers.id
  addedAt: timestamp('added_at').defaultNow(),
  notes: text('notes')
}, (table) => ({
  watchlistFundUnique: unique().on(table.watchlistId, table.fundManagerId),
  watchlistIdIdx: index('idx_watchlist_funds_watchlist_id').on(table.watchlistId),
}));

// User alerts and notifications
export const userAlerts = pgTable('user_alerts', {
  id: serial('id').primaryKey(),
  userId: serial('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  alertType: varchar('alert_type', { length: 50 }).notNull(), // 'position_change', 'new_filing', 'threshold_breach'
  entityType: varchar('entity_type', { length: 20 }).notNull(), // 'fund', 'security'
  entityId: serial('entity_id').notNull(), // fundManagerId or securityId
  conditions: jsonb('conditions').notNull(), // Alert criteria
  isActive: boolean('is_active').default(true),
  lastTriggered: timestamp('last_triggered'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table) => ({
  userIdIdx: index('idx_user_alerts_user_id').on(table.userId),
  entityIdx: index('idx_user_alerts_entity').on(table.entityType, table.entityId),
}));

// Alert notifications sent to users
export const alertNotifications = pgTable('alert_notifications', {
  id: serial('id').primaryKey(),
  alertId: serial('alert_id').references(() => userAlerts.id, { onDelete: 'cascade' }).notNull(),
  userId: serial('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  message: text('message').notNull(),
  data: jsonb('data'), // Additional context data
  isRead: boolean('is_read').default(false),
  readAt: timestamp('read_at'),
  sentAt: timestamp('sent_at').defaultNow(),
  deliveryMethod: varchar('delivery_method', { length: 20 }).default('in_app') // 'in_app', 'email', 'push'
}, (table) => ({
  userIdIdx: index('idx_alert_notifications_user_id').on(table.userId),
  isReadIdx: index('idx_alert_notifications_is_read').on(table.isRead),
}));

// User activity log
export const userActivity = pgTable('user_activity', {
  id: serial('id').primaryKey(),
  userId: serial('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  action: varchar('action', { length: 100 }).notNull(),
  entityType: varchar('entity_type', { length: 50 }),
  entityId: serial('entity_id'),
  metadata: jsonb('metadata'),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').defaultNow()
}, (table) => ({
  userIdIdx: index('idx_user_activity_user_id').on(table.userId),
  actionIdx: index('idx_user_activity_action').on(table.action),
  createdAtIdx: index('idx_user_activity_created_at').on(table.createdAt),
}));

// Relations
export const usersRelations = relations(users, ({ many, one }) => ({
  sessions: many(sessions),
  preferences: one(userPreferences),
  watchlists: many(userWatchlists),
  alerts: many(userAlerts),
  notifications: many(alertNotifications),
  activity: many(userActivity)
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id]
  })
}));

export const userPreferencesRelations = relations(userPreferences, ({ one }) => ({
  user: one(users, {
    fields: [userPreferences.userId],
    references: [users.id]
  })
}));

export const userWatchlistsRelations = relations(userWatchlists, ({ one, many }) => ({
  user: one(users, {
    fields: [userWatchlists.userId],
    references: [users.id]
  }),
  funds: many(watchlistFunds)
}));

export const watchlistFundsRelations = relations(watchlistFunds, ({ one }) => ({
  watchlist: one(userWatchlists, {
    fields: [watchlistFunds.watchlistId],
    references: [userWatchlists.id]
  })
}));

export const userAlertsRelations = relations(userAlerts, ({ one, many }) => ({
  user: one(users, {
    fields: [userAlerts.userId],
    references: [users.id]
  }),
  notifications: many(alertNotifications)
}));

export const alertNotificationsRelations = relations(alertNotifications, ({ one }) => ({
  alert: one(userAlerts, {
    fields: [alertNotifications.alertId],
    references: [userAlerts.id]
  }),
  user: one(users, {
    fields: [alertNotifications.userId],
    references: [users.id]
  })
}));

export const userActivityRelations = relations(userActivity, ({ one }) => ({
  user: one(users, {
    fields: [userActivity.userId],
    references: [users.id]
  })
}));