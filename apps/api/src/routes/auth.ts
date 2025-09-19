import { Hono } from 'hono';
import { z } from 'zod';
import { authService } from '../services/auth-service.js';
import { authMiddleware } from '../middleware/auth.js';
import { ApiError } from '@hedge-fund-tracker/shared';

export const authRoutes = new Hono();

// Request schemas
const RegisterSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  username: z.string().min(3, 'Username must be at least 3 characters').optional(),
  fullName: z.string().min(1, 'Full name is required').optional()
});

const LoginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required')
});

const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters')
});

const UpdateProfileSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters').optional(),
  fullName: z.string().min(1, 'Full name cannot be empty').optional(),
  email: z.string().email('Invalid email format').optional()
});

const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required')
});

// POST /api/auth/register - Register new user
authRoutes.post('/register', async (c) => {
  try {
    const body = await c.req.json();
    const data = RegisterSchema.parse(body);

    const result = await authService.register(data);

    return c.json({
      success: true,
      data: result,
      message: 'Registration successful'
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

    console.error('Registration error:', error);
    return c.json({
      success: false,
      error: 'Registration failed'
    }, 500);
  }
});

// POST /api/auth/login - User login
authRoutes.post('/login', async (c) => {
  try {
    const body = await c.req.json();
    const data = LoginSchema.parse(body);

    const result = await authService.login(data);

    return c.json({
      success: true,
      data: result,
      message: 'Login successful'
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

    console.error('Login error:', error);
    return c.json({
      success: false,
      error: 'Login failed'
    }, 500);
  }
});

// POST /api/auth/logout - User logout
authRoutes.post('/logout', authMiddleware, async (c) => {
  try {
    const authHeader = c.req.header('authorization');
    const token = authHeader?.substring(7); // Remove 'Bearer ' prefix

    if (token) {
      await authService.logout(token);
    }

    return c.json({
      success: true,
      message: 'Logout successful'
    });

  } catch (error) {
    console.error('Logout error:', error);
    return c.json({
      success: false,
      error: 'Logout failed'
    }, 500);
  }
});

// POST /api/auth/refresh - Refresh access token
authRoutes.post('/refresh', async (c) => {
  try {
    const body = await c.req.json();
    const data = RefreshTokenSchema.parse(body);

    const result = await authService.refreshToken(data.refreshToken);

    return c.json({
      success: true,
      data: result
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

    console.error('Token refresh error:', error);
    return c.json({
      success: false,
      error: 'Token refresh failed'
    }, 500);
  }
});

// GET /api/auth/me - Get current user info
authRoutes.get('/me', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const userData = await authService.getUserById(user.userId);

    if (!userData) {
      return c.json({
        success: false,
        error: 'User not found'
      }, 404);
    }

    return c.json({
      success: true,
      data: userData
    });

  } catch (error) {
    console.error('Get user error:', error);
    return c.json({
      success: false,
      error: 'Failed to get user information'
    }, 500);
  }
});

// PUT /api/auth/profile - Update user profile
authRoutes.put('/profile', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const body = await c.req.json();
    const data = UpdateProfileSchema.parse(body);

    await authService.updateProfile(user.userId, data);

    return c.json({
      success: true,
      message: 'Profile updated successfully'
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

    console.error('Profile update error:', error);
    return c.json({
      success: false,
      error: 'Profile update failed'
    }, 500);
  }
});

// PUT /api/auth/password - Change password
authRoutes.put('/password', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const body = await c.req.json();
    const data = ChangePasswordSchema.parse(body);

    await authService.changePassword(user.userId, data.currentPassword, data.newPassword);

    return c.json({
      success: true,
      message: 'Password changed successfully'
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

    console.error('Password change error:', error);
    return c.json({
      success: false,
      error: 'Password change failed'
    }, 500);
  }
});

// GET /api/auth/validate - Validate current session
authRoutes.get('/validate', authMiddleware, async (c) => {
  const user = c.get('user');

  return c.json({
    success: true,
    data: {
      valid: true,
      user: {
        userId: user.userId,
        email: user.email,
        username: user.username
      }
    }
  });
});