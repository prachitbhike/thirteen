import { Context, Next } from 'hono';
import { authService } from '../services/auth-service.js';
import { ApiError } from '@hedge-fund-tracker/shared';

export interface AuthContext extends Context {
  get(key: 'user'): {
    userId: number;
    sessionId: number;
    email: string;
    username: string | null;
  };
}

export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header('authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({
      success: false,
      error: 'Missing or invalid authorization header'
    }, 401);
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix

  try {
    const sessionInfo = await authService.validateSession(token);
    c.set('user', sessionInfo);
    await next();
  } catch (error) {
    if (error instanceof ApiError) {
      return c.json({
        success: false,
        error: error.message,
        code: error.code
      }, error.statusCode);
    }

    return c.json({
      success: false,
      error: 'Authentication failed'
    }, 401);
  }
}

export async function optionalAuthMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header('authorization');

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);

    try {
      const sessionInfo = await authService.validateSession(token);
      c.set('user', sessionInfo);
    } catch (error) {
      // Optional auth - don't fail if token is invalid
      c.set('user', null);
    }
  } else {
    c.set('user', null);
  }

  await next();
}

export function requireAuth() {
  return authMiddleware;
}

export function optionalAuth() {
  return optionalAuthMiddleware;
}