import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { serve } from '@hono/node-server';
import dotenv from 'dotenv';
import { connectDb } from '@hedge-fund-tracker/database';

// Route imports
import { authRoutes } from './routes/auth.js';
import { fundRoutes } from './routes/funds.js';
import { holdingRoutes } from './routes/holdings.js';
import { dashboardRoutes } from './routes/dashboard.js';
import { analysisRoutes } from './routes/analysis.js';
import { searchRoutes } from './routes/search.js';
import { watchlistRoutes } from './routes/watchlists.js';
import { notificationRoutes } from './routes/notifications.js';

// Load environment variables
dotenv.config();

const app = new Hono();

// Global middleware
app.use('*', logger());
app.use('*', cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

// Database middleware
app.use('*', async (c, next) => {
  try {
    const db = await connectDb();
    c.set('db', db);
    await next();
  } catch (error) {
    console.error('Database connection failed:', error);
    return c.json({
      success: false,
      error: 'Database connection failed'
    }, 500);
  }
});

// Health check endpoint
app.get('/health', (c) => {
  return c.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '0.1.0'
  });
});

// API routes
app.route('/api/auth', authRoutes);
app.route('/api/funds', fundRoutes);
app.route('/api/holdings', holdingRoutes);
app.route('/api/dashboard', dashboardRoutes);
app.route('/api/analysis', analysisRoutes);
app.route('/api/search', searchRoutes);
app.route('/api/watchlists', watchlistRoutes);
app.route('/api/notifications', notificationRoutes);

// 404 handler
app.notFound((c) => {
  return c.json({
    success: false,
    error: 'Endpoint not found',
    message: 'The requested API endpoint does not exist'
  }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error('API Error:', err);

  const isDevelopment = process.env.NODE_ENV === 'development';

  return c.json({
    success: false,
    error: isDevelopment ? err.message : 'Internal server error',
    ...(isDevelopment && { stack: err.stack })
  }, 500);
});

// Start server
const port = parseInt(process.env.API_PORT || '3001');

console.log(`🚀 Starting Hedge Fund Tracker API on port ${port}`);
console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`🗄️  Database: ${process.env.DATABASE_URL ? 'Connected' : 'Not configured'}`);

serve({
  fetch: app.fetch,
  port
}, (info) => {
  console.log(`✅ API server running at http://localhost:${info.port}`);
  console.log(`📖 Health check: http://localhost:${info.port}/health`);
});

export default app;