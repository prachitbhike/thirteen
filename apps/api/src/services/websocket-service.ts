import WebSocket from 'ws';
import { IncomingMessage } from 'http';
import { authService } from './auth-service.js';
import { notificationService } from './notification-service.js';
import { ApiError } from '@hedge-fund-tracker/shared';

export interface WebSocketClient {
  id: string;
  userId: number;
  ws: WebSocket;
  isAlive: boolean;
  lastSeen: Date;
}

export class WebSocketService {
  private clients = new Map<string, WebSocketClient>();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor() {}

  async handleConnection(ws: WebSocket, request: IncomingMessage) {
    try {
      // Extract token from query parameters or headers
      const url = new URL(request.url || '', `http://${request.headers.host}`);
      const token = url.searchParams.get('token') ||
                   request.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        ws.close(4001, 'Missing authentication token');
        return;
      }

      // Validate token and get user info
      const sessionInfo = await authService.validateSession(token);

      // Create client instance
      const clientId = this.generateClientId();
      const client: WebSocketClient = {
        id: clientId,
        userId: sessionInfo.userId,
        ws,
        isAlive: true,
        lastSeen: new Date()
      };

      this.clients.set(clientId, client);

      // Add to notification service for real-time updates
      notificationService.addConnection(sessionInfo.userId, ws);

      // Set up WebSocket event handlers
      this.setupClientHandlers(client);

      // Send welcome message
      this.sendToClient(clientId, {
        type: 'connection',
        data: {
          clientId,
          userId: sessionInfo.userId,
          message: 'Connected successfully',
          timestamp: new Date().toISOString()
        }
      });

      // Send initial data
      await this.sendInitialData(client);

      console.log(`WebSocket client connected: ${clientId} (User: ${sessionInfo.userId})`);

    } catch (error) {
      console.error('WebSocket authentication failed:', error);

      if (error instanceof ApiError) {
        ws.close(4001, error.message);
      } else {
        ws.close(4000, 'Authentication failed');
      }
    }
  }

  private setupClientHandlers(client: WebSocketClient) {
    const { ws, id } = client;

    // Handle incoming messages
    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        await this.handleClientMessage(id, message);
      } catch (error) {
        console.error('Error handling WebSocket message:', error);
        this.sendToClient(id, {
          type: 'error',
          data: { message: 'Invalid message format' }
        });
      }
    });

    // Handle pong responses for heartbeat
    ws.on('pong', () => {
      client.isAlive = true;
      client.lastSeen = new Date();
    });

    // Handle client disconnect
    ws.on('close', (code, reason) => {
      console.log(`WebSocket client disconnected: ${id} (Code: ${code}, Reason: ${reason})`);
      this.removeClient(id);
    });

    // Handle errors
    ws.on('error', (error) => {
      console.error(`WebSocket error for client ${id}:`, error);
      this.removeClient(id);
    });
  }

  private async handleClientMessage(clientId: string, message: any) {
    const client = this.clients.get(clientId);
    if (!client) return;

    switch (message.type) {
      case 'ping':
        this.sendToClient(clientId, {
          type: 'pong',
          data: { timestamp: new Date().toISOString() }
        });
        break;

      case 'subscribe':
        await this.handleSubscription(client, message.data);
        break;

      case 'unsubscribe':
        await this.handleUnsubscription(client, message.data);
        break;

      case 'get_notifications':
        await this.sendNotifications(client);
        break;

      case 'mark_notifications_read':
        await this.markNotificationsRead(client, message.data.notificationIds);
        break;

      default:
        this.sendToClient(clientId, {
          type: 'error',
          data: { message: 'Unknown message type' }
        });
    }
  }

  private async sendInitialData(client: WebSocketClient) {
    try {
      // Send recent notifications
      await this.sendNotifications(client);

      // Send watchlist updates
      await notificationService.notifyWatchlistUpdates(client.userId);

    } catch (error) {
      console.error('Error sending initial data:', error);
    }
  }

  private async sendNotifications(client: WebSocketClient) {
    try {
      const notifications = await notificationService.getUserNotifications(
        client.userId,
        20,
        true // unread only
      );

      this.sendToClient(client.id, {
        type: 'notifications',
        data: {
          notifications,
          unreadCount: notifications.length
        }
      });
    } catch (error) {
      console.error('Error sending notifications:', error);
    }
  }

  private async markNotificationsRead(client: WebSocketClient, notificationIds: number[]) {
    try {
      await notificationService.markNotificationsRead(client.userId, notificationIds);

      this.sendToClient(client.id, {
        type: 'notifications_marked_read',
        data: { notificationIds }
      });
    } catch (error) {
      console.error('Error marking notifications read:', error);
    }
  }

  private async handleSubscription(client: WebSocketClient, data: any) {
    // Handle subscription to specific data streams
    this.sendToClient(client.id, {
      type: 'subscribed',
      data: { subscription: data }
    });
  }

  private async handleUnsubscription(client: WebSocketClient, data: any) {
    // Handle unsubscription from data streams
    this.sendToClient(client.id, {
      type: 'unsubscribed',
      data: { subscription: data }
    });
  }

  // Public methods for broadcasting updates
  broadcastToAll(message: any) {
    this.clients.forEach(client => {
      this.sendToClient(client.id, message);
    });
  }

  broadcastToUser(userId: number, message: any) {
    this.clients.forEach(client => {
      if (client.userId === userId) {
        this.sendToClient(client.id, message);
      }
    });
  }

  sendToClient(clientId: string, message: any) {
    const client = this.clients.get(clientId);
    if (client && client.ws.readyState === WebSocket.OPEN) {
      try {
        client.ws.send(JSON.stringify(message));
      } catch (error) {
        console.error(`Error sending message to client ${clientId}:`, error);
        this.removeClient(clientId);
      }
    }
  }

  private removeClient(clientId: string) {
    const client = this.clients.get(clientId);
    if (client) {
      // Remove from notification service
      notificationService.removeConnection(client.userId, client.ws);

      // Close WebSocket if still open
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.close();
      }

      // Remove from clients map
      this.clients.delete(clientId);
    }
  }

  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  // Heartbeat mechanism to detect disconnected clients
  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      this.clients.forEach((client, clientId) => {
        if (!client.isAlive) {
          console.log(`Terminating inactive client: ${clientId}`);
          this.removeClient(clientId);
          return;
        }

        // Send ping and mark as not alive
        client.isAlive = false;
        if (client.ws.readyState === WebSocket.OPEN) {
          client.ws.ping();
        }
      });
    }, 30000); // 30 seconds
  }

  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // Status and monitoring
  getStats() {
    const userCounts = new Map<number, number>();

    this.clients.forEach(client => {
      const count = userCounts.get(client.userId) || 0;
      userCounts.set(client.userId, count + 1);
    });

    return {
      totalClients: this.clients.size,
      uniqueUsers: userCounts.size,
      userConnections: Array.from(userCounts.entries()).map(([userId, count]) => ({
        userId,
        connections: count
      }))
    };
  }

  // Shutdown cleanup
  shutdown() {
    console.log('Shutting down WebSocket service...');

    this.stopHeartbeat();

    this.clients.forEach((client, clientId) => {
      client.ws.close(1001, 'Server shutting down');
      this.removeClient(clientId);
    });

    console.log('WebSocket service shutdown complete');
  }
}

// Singleton instance
export const webSocketService = new WebSocketService();