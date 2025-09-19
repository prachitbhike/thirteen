import { EventEmitter } from 'events';
import { connectDb } from '@hedge-fund-tracker/database';
import {
  userAlerts,
  alertNotifications,
  userWatchlists,
  watchlistFunds,
  users,
  fundManagers,
  holdings,
  positionChanges
} from '@hedge-fund-tracker/database/auth-schema';
import { eq, and, sql, inArray, gte } from 'drizzle-orm';
import { ApiError, formatCurrency, formatPercentage } from '@hedge-fund-tracker/shared';

export interface AlertCondition {
  type: 'threshold' | 'change_percentage' | 'new_position' | 'position_closed' | 'filing_date';
  operator?: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  value?: number;
  percentage?: number;
}

export interface CreateAlertRequest {
  alertType: 'position_change' | 'new_filing' | 'threshold_breach' | 'portfolio_change';
  entityType: 'fund' | 'security';
  entityId: number;
  conditions: AlertCondition[];
  isActive?: boolean;
}

export interface NotificationData {
  alertId: number;
  userId: number;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  data: any;
  deliveryMethod: 'in_app' | 'email' | 'push';
}

export class NotificationService extends EventEmitter {
  private db: any;
  private activeConnections: Map<number, any[]> = new Map(); // userId -> WebSocket connections

  constructor() {
    super();
    this.setMaxListeners(100); // Increase limit for multiple user connections
  }

  async initialize() {
    this.db = await connectDb();
  }

  // WebSocket connection management
  addConnection(userId: number, ws: any) {
    if (!this.activeConnections.has(userId)) {
      this.activeConnections.set(userId, []);
    }
    this.activeConnections.get(userId)!.push(ws);

    ws.on('close', () => {
      this.removeConnection(userId, ws);
    });

    console.log(`User ${userId} connected for real-time updates`);
  }

  removeConnection(userId: number, ws: any) {
    const connections = this.activeConnections.get(userId);
    if (connections) {
      const index = connections.indexOf(ws);
      if (index > -1) {
        connections.splice(index, 1);
        if (connections.length === 0) {
          this.activeConnections.delete(userId);
        }
      }
    }
  }

  // Send real-time update to connected users
  broadcastToUser(userId: number, data: any) {
    const connections = this.activeConnections.get(userId);
    if (connections) {
      const message = JSON.stringify(data);
      connections.forEach(ws => {
        try {
          if (ws.readyState === 1) { // WebSocket.OPEN
            ws.send(message);
          }
        } catch (error) {
          console.error('Error sending WebSocket message:', error);
        }
      });
    }
  }

  // Alert management
  async createAlert(userId: number, alertData: CreateAlertRequest): Promise<number> {
    if (!this.db) await this.initialize();

    const [newAlert] = await this.db
      .insert(userAlerts)
      .values({
        userId,
        alertType: alertData.alertType,
        entityType: alertData.entityType,
        entityId: alertData.entityId,
        conditions: alertData.conditions,
        isActive: alertData.isActive ?? true,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning({ id: userAlerts.id });

    return newAlert.id;
  }

  async getUserAlerts(userId: number): Promise<any[]> {
    if (!this.db) await this.initialize();

    return await this.db
      .select({
        alert: userAlerts,
        entityName: sql<string>`CASE
          WHEN ${userAlerts.entityType} = 'fund' THEN ${fundManagers.name}
          WHEN ${userAlerts.entityType} = 'security' THEN 'Security'
          ELSE 'Unknown'
        END`
      })
      .from(userAlerts)
      .leftJoin(fundManagers, and(
        eq(userAlerts.entityType, 'fund'),
        eq(fundManagers.id, userAlerts.entityId)
      ))
      .where(eq(userAlerts.userId, userId))
      .orderBy(userAlerts.createdAt);
  }

  async updateAlert(userId: number, alertId: number, updates: Partial<CreateAlertRequest>) {
    if (!this.db) await this.initialize();

    await this.db
      .update(userAlerts)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(and(
        eq(userAlerts.id, alertId),
        eq(userAlerts.userId, userId)
      ));
  }

  async deleteAlert(userId: number, alertId: number) {
    if (!this.db) await this.initialize();

    await this.db
      .delete(userAlerts)
      .where(and(
        eq(userAlerts.id, alertId),
        eq(userAlerts.userId, userId)
      ));
  }

  // Notification processing
  async processNewFiling(fundManagerId: number, filingData: any) {
    if (!this.db) await this.initialize();

    // Find users with alerts for this fund
    const alertsToProcess = await this.db
      .select({
        alert: userAlerts,
        user: users
      })
      .from(userAlerts)
      .innerJoin(users, eq(users.id, userAlerts.userId))
      .where(and(
        eq(userAlerts.entityType, 'fund'),
        eq(userAlerts.entityId, fundManagerId),
        eq(userAlerts.alertType, 'new_filing'),
        eq(userAlerts.isActive, true)
      ));

    for (const { alert, user } of alertsToProcess) {
      await this.sendNotification({
        alertId: alert.id,
        userId: user.id,
        title: 'New 13F Filing',
        message: `New filing available for ${filingData.fundName}`,
        type: 'info',
        data: {
          fundManagerId,
          filingId: filingData.id,
          periodEndDate: filingData.periodEndDate,
          totalValue: filingData.totalValue
        },
        deliveryMethod: 'in_app'
      });

      // Send real-time update
      this.broadcastToUser(user.id, {
        type: 'new_filing',
        data: {
          fundManagerId,
          fundName: filingData.fundName,
          filingDate: filingData.filingDate,
          totalValue: filingData.totalValue
        }
      });
    }
  }

  async processPositionChange(changeData: any) {
    if (!this.db) await this.initialize();

    // Find users with alerts for this fund or security
    const alertsToProcess = await this.db
      .select({
        alert: userAlerts,
        user: users
      })
      .from(userAlerts)
      .innerJoin(users, eq(users.id, userAlerts.userId))
      .where(and(
        eq(userAlerts.alertType, 'position_change'),
        eq(userAlerts.isActive, true),
        // Either fund alert or security alert
        sql`(
          (${userAlerts.entityType} = 'fund' AND ${userAlerts.entityId} = ${changeData.fundManagerId}) OR
          (${userAlerts.entityType} = 'security' AND ${userAlerts.entityId} = ${changeData.securityId})
        )`
      ));

    for (const { alert, user } of alertsToProcess) {
      // Check if alert conditions are met
      if (this.checkAlertConditions(alert.conditions, changeData)) {
        const notificationData = this.formatPositionChangeNotification(alert, changeData);

        await this.sendNotification({
          alertId: alert.id,
          userId: user.id,
          ...notificationData,
          deliveryMethod: 'in_app'
        });

        // Send real-time update
        this.broadcastToUser(user.id, {
          type: 'position_change',
          data: changeData
        });
      }
    }
  }

  async processThresholdBreach(entityType: 'fund' | 'security', entityId: number, thresholdData: any) {
    if (!this.db) await this.initialize();

    const alertsToProcess = await this.db
      .select({
        alert: userAlerts,
        user: users
      })
      .from(userAlerts)
      .innerJoin(users, eq(users.id, userAlerts.userId))
      .where(and(
        eq(userAlerts.entityType, entityType),
        eq(userAlerts.entityId, entityId),
        eq(userAlerts.alertType, 'threshold_breach'),
        eq(userAlerts.isActive, true)
      ));

    for (const { alert, user } of alertsToProcess) {
      if (this.checkAlertConditions(alert.conditions, thresholdData)) {
        const notificationData = this.formatThresholdNotification(alert, thresholdData);

        await this.sendNotification({
          alertId: alert.id,
          userId: user.id,
          ...notificationData,
          deliveryMethod: 'in_app'
        });

        // Send real-time update
        this.broadcastToUser(user.id, {
          type: 'threshold_breach',
          data: thresholdData
        });
      }
    }
  }

  // Send notification to user
  async sendNotification(notification: NotificationData) {
    if (!this.db) await this.initialize();

    await this.db.insert(alertNotifications).values({
      alertId: notification.alertId,
      userId: notification.userId,
      title: notification.title,
      message: notification.message,
      data: notification.data,
      deliveryMethod: notification.deliveryMethod,
      isRead: false,
      sentAt: new Date()
    });

    // Emit event for external notification handlers (email, push, etc.)
    this.emit('notification', notification);
  }

  // Get user notifications
  async getUserNotifications(userId: number, limit = 50, unreadOnly = false) {
    if (!this.db) await this.initialize();

    let query = this.db
      .select()
      .from(alertNotifications)
      .where(eq(alertNotifications.userId, userId));

    if (unreadOnly) {
      query = query.where(eq(alertNotifications.isRead, false));
    }

    return await query
      .orderBy(alertNotifications.sentAt)
      .limit(limit);
  }

  // Mark notifications as read
  async markNotificationsRead(userId: number, notificationIds: number[]) {
    if (!this.db) await this.initialize();

    await this.db
      .update(alertNotifications)
      .set({
        isRead: true,
        readAt: new Date()
      })
      .where(and(
        eq(alertNotifications.userId, userId),
        inArray(alertNotifications.id, notificationIds)
      ));
  }

  // Helper methods
  private checkAlertConditions(conditions: AlertCondition[], data: any): boolean {
    return conditions.some(condition => {
      switch (condition.type) {
        case 'change_percentage':
          const percentChange = Math.abs(data.percentChange || 0);
          return percentChange >= (condition.percentage || 0);

        case 'threshold':
          const value = data.value || data.marketValue || 0;
          switch (condition.operator) {
            case 'gt': return value > (condition.value || 0);
            case 'lt': return value < (condition.value || 0);
            case 'gte': return value >= (condition.value || 0);
            case 'lte': return value <= (condition.value || 0);
            case 'eq': return value === (condition.value || 0);
            default: return false;
          }

        case 'new_position':
          return data.changeType === 'NEW';

        case 'position_closed':
          return data.changeType === 'SOLD';

        default:
          return false;
      }
    });
  }

  private formatPositionChangeNotification(alert: any, changeData: any) {
    const changeType = changeData.changeType;
    const fundName = changeData.fundName || 'Unknown Fund';
    const securityName = changeData.securityName || 'Unknown Security';
    const valueChange = formatCurrency(Number(changeData.valueChange) / 100);
    const percentChange = formatPercentage(changeData.percentChange || 0);

    let title = '';
    let message = '';
    let type: 'info' | 'warning' | 'success' | 'error' = 'info';

    switch (changeType) {
      case 'NEW':
        title = 'New Position';
        message = `${fundName} opened a new position in ${securityName}`;
        type = 'success';
        break;
      case 'SOLD':
        title = 'Position Closed';
        message = `${fundName} closed their position in ${securityName}`;
        type = 'warning';
        break;
      case 'INCREASED':
        title = 'Position Increased';
        message = `${fundName} increased their ${securityName} position by ${valueChange} (${percentChange})`;
        type = 'success';
        break;
      case 'DECREASED':
        title = 'Position Decreased';
        message = `${fundName} decreased their ${securityName} position by ${valueChange} (${percentChange})`;
        type = 'warning';
        break;
      default:
        title = 'Position Change';
        message = `Position change detected for ${securityName}`;
    }

    return { title, message, type, data: changeData };
  }

  private formatThresholdNotification(alert: any, thresholdData: any) {
    return {
      title: 'Threshold Alert',
      message: `Threshold condition met for your alert`,
      type: 'warning' as const,
      data: thresholdData
    };
  }

  // Watchlist-based notifications
  async notifyWatchlistUpdates(userId: number) {
    if (!this.db) await this.initialize();

    // Get user's watched funds
    const watchedFunds = await this.db
      .select({
        fundManagerId: watchlistFunds.fundManagerId,
        fundName: fundManagers.name
      })
      .from(watchlistFunds)
      .innerJoin(userWatchlists, eq(userWatchlists.id, watchlistFunds.watchlistId))
      .innerJoin(fundManagers, eq(fundManagers.id, watchlistFunds.fundManagerId))
      .where(eq(userWatchlists.userId, userId));

    if (watchedFunds.length > 0) {
      const fundIds = watchedFunds.map(f => f.fundManagerId);

      // Get recent position changes for watched funds
      const recentChanges = await this.db
        .select()
        .from(positionChanges)
        .where(and(
          inArray(positionChanges.fundManagerId, fundIds),
          gte(positionChanges.createdAt, new Date(Date.now() - 24 * 60 * 60 * 1000)) // Last 24 hours
        ))
        .limit(10);

      if (recentChanges.length > 0) {
        this.broadcastToUser(userId, {
          type: 'watchlist_updates',
          data: {
            changeCount: recentChanges.length,
            changes: recentChanges
          }
        });
      }
    }
  }
}

// Singleton instance
export const notificationService = new NotificationService();