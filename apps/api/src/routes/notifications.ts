import { Hono } from 'hono';
import { z } from 'zod';
import { notificationService } from '../services/notification-service.js';
import { authMiddleware } from '../middleware/auth.js';
import { ApiError } from '@hedge-fund-tracker/shared';

export const notificationRoutes = new Hono();

// Request schemas
const CreateAlertSchema = z.object({
  alertType: z.enum(['position_change', 'new_filing', 'threshold_breach', 'portfolio_change']),
  entityType: z.enum(['fund', 'security']),
  entityId: z.number().int().positive('Invalid entity ID'),
  conditions: z.array(z.object({
    type: z.enum(['threshold', 'change_percentage', 'new_position', 'position_closed', 'filing_date']),
    operator: z.enum(['gt', 'lt', 'eq', 'gte', 'lte']).optional(),
    value: z.number().optional(),
    percentage: z.number().min(0).max(100).optional()
  })).min(1, 'At least one condition is required'),
  isActive: z.boolean().default(true)
});

const UpdateAlertSchema = z.object({
  alertType: z.enum(['position_change', 'new_filing', 'threshold_breach', 'portfolio_change']).optional(),
  conditions: z.array(z.object({
    type: z.enum(['threshold', 'change_percentage', 'new_position', 'position_closed', 'filing_date']),
    operator: z.enum(['gt', 'lt', 'eq', 'gte', 'lte']).optional(),
    value: z.number().optional(),
    percentage: z.number().min(0).max(100).optional()
  })).optional(),
  isActive: z.boolean().optional()
});

const MarkReadSchema = z.object({
  notificationIds: z.array(z.number().int().positive()).min(1, 'At least one notification ID required')
});

// GET /api/notifications/alerts - Get user's alerts
notificationRoutes.get('/alerts', authMiddleware, async (c) => {
  try {
    const user = c.get('user');

    const alerts = await notificationService.getUserAlerts(user.userId);

    return c.json({
      success: true,
      data: alerts
    });

  } catch (error) {
    console.error('Error fetching alerts:', error);
    return c.json({
      success: false,
      error: 'Failed to fetch alerts'
    }, 500);
  }
});

// POST /api/notifications/alerts - Create new alert
notificationRoutes.post('/alerts', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const body = await c.req.json();
    const data = CreateAlertSchema.parse(body);

    const alertId = await notificationService.createAlert(user.userId, data);

    return c.json({
      success: true,
      data: { id: alertId },
      message: 'Alert created successfully'
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({
        success: false,
        error: 'Invalid input data',
        details: error.errors
      }, 400);
    }

    if (error instanceof ApiError) {
      return c.json({
        success: false,
        error: error.message,
        code: error.code
      }, error.statusCode);
    }

    console.error('Error creating alert:', error);
    return c.json({
      success: false,
      error: 'Failed to create alert'
    }, 500);
  }
});

// PUT /api/notifications/alerts/:id - Update alert
notificationRoutes.put('/alerts/:id', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const alertId = parseInt(c.req.param('id'));
    const body = await c.req.json();
    const data = UpdateAlertSchema.parse(body);

    if (isNaN(alertId)) {
      return c.json({
        success: false,
        error: 'Invalid alert ID'
      }, 400);
    }

    await notificationService.updateAlert(user.userId, alertId, data);

    return c.json({
      success: true,
      message: 'Alert updated successfully'
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({
        success: false,
        error: 'Invalid input data',
        details: error.errors
      }, 400);
    }

    if (error instanceof ApiError) {
      return c.json({
        success: false,
        error: error.message,
        code: error.code
      }, error.statusCode);
    }

    console.error('Error updating alert:', error);
    return c.json({
      success: false,
      error: 'Failed to update alert'
    }, 500);
  }
});

// DELETE /api/notifications/alerts/:id - Delete alert
notificationRoutes.delete('/alerts/:id', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const alertId = parseInt(c.req.param('id'));

    if (isNaN(alertId)) {
      return c.json({
        success: false,
        error: 'Invalid alert ID'
      }, 400);
    }

    await notificationService.deleteAlert(user.userId, alertId);

    return c.json({
      success: true,
      message: 'Alert deleted successfully'
    });

  } catch (error) {
    if (error instanceof ApiError) {
      return c.json({
        success: false,
        error: error.message,
        code: error.code
      }, error.statusCode);
    }

    console.error('Error deleting alert:', error);
    return c.json({
      success: false,
      error: 'Failed to delete alert'
    }, 500);
  }
});

// GET /api/notifications - Get user's notifications
notificationRoutes.get('/', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const limit = parseInt(c.req.query('limit') || '50');
    const unreadOnly = c.req.query('unreadOnly') === 'true';

    const notifications = await notificationService.getUserNotifications(
      user.userId,
      limit,
      unreadOnly
    );

    return c.json({
      success: true,
      data: notifications
    });

  } catch (error) {
    console.error('Error fetching notifications:', error);
    return c.json({
      success: false,
      error: 'Failed to fetch notifications'
    }, 500);
  }
});

// POST /api/notifications/mark-read - Mark notifications as read
notificationRoutes.post('/mark-read', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const body = await c.req.json();
    const data = MarkReadSchema.parse(body);

    await notificationService.markNotificationsRead(user.userId, data.notificationIds);

    return c.json({
      success: true,
      message: 'Notifications marked as read'
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({
        success: false,
        error: 'Invalid input data',
        details: error.errors
      }, 400);
    }

    console.error('Error marking notifications as read:', error);
    return c.json({
      success: false,
      error: 'Failed to mark notifications as read'
    }, 500);
  }
});

// GET /api/notifications/unread-count - Get unread notification count
notificationRoutes.get('/unread-count', authMiddleware, async (c) => {
  try {
    const user = c.get('user');

    const notifications = await notificationService.getUserNotifications(
      user.userId,
      1000,
      true // unread only
    );

    return c.json({
      success: true,
      data: {
        count: notifications.length
      }
    });

  } catch (error) {
    console.error('Error fetching unread count:', error);
    return c.json({
      success: false,
      error: 'Failed to fetch unread count'
    }, 500);
  }
});

// POST /api/notifications/test - Test notification (development only)
notificationRoutes.post('/test', authMiddleware, async (c) => {
  try {
    // Only allow in development
    if (process.env.NODE_ENV === 'production') {
      return c.json({
        success: false,
        error: 'Test notifications not allowed in production'
      }, 403);
    }

    const user = c.get('user');

    // Send a test notification
    await notificationService.sendNotification({
      alertId: 0,
      userId: user.userId,
      title: 'Test Notification',
      message: 'This is a test notification to verify the system is working.',
      type: 'info',
      data: { test: true, timestamp: new Date().toISOString() },
      deliveryMethod: 'in_app'
    });

    return c.json({
      success: true,
      message: 'Test notification sent'
    });

  } catch (error) {
    console.error('Error sending test notification:', error);
    return c.json({
      success: false,
      error: 'Failed to send test notification'
    }, 500);
  }
});