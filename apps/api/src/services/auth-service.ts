import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { connectDb } from '@hedge-fund-tracker/database';
import { users, sessions, userPreferences, userWatchlists } from '@hedge-fund-tracker/database/auth-schema';
import { eq, and, gt } from 'drizzle-orm';
import { ApiError } from '@hedge-fund-tracker/shared';

export interface UserCredentials {
  email: string;
  password: string;
}

export interface UserRegistration extends UserCredentials {
  username?: string;
  fullName?: string;
}

export interface AuthResult {
  user: {
    id: number;
    email: string;
    username: string | null;
    fullName: string | null;
    emailVerified: boolean;
  };
  accessToken: string;
  refreshToken: string;
}

export interface SessionInfo {
  userId: number;
  sessionId: number;
  email: string;
  username: string | null;
}

export class AuthService {
  private db: any;
  private jwtSecret: string;
  private jwtRefreshSecret: string;

  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || 'hedge-fund-tracker-secret';
    this.jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || 'hedge-fund-tracker-refresh-secret';
  }

  async initialize() {
    this.db = await connectDb();
  }

  async register(registration: UserRegistration): Promise<AuthResult> {
    if (!this.db) await this.initialize();

    // Validate input
    if (!registration.email || !registration.password) {
      throw new ApiError('Email and password are required', 400, 'INVALID_INPUT');
    }

    if (registration.password.length < 8) {
      throw new ApiError('Password must be at least 8 characters', 400, 'WEAK_PASSWORD');
    }

    // Check if user already exists
    const existingUser = await this.db
      .select()
      .from(users)
      .where(eq(users.email, registration.email))
      .limit(1);

    if (existingUser.length > 0) {
      throw new ApiError('User with this email already exists', 409, 'USER_EXISTS');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(registration.password, 12);

    // Create user
    const [newUser] = await this.db
      .insert(users)
      .values({
        email: registration.email,
        username: registration.username,
        fullName: registration.fullName,
        hashedPassword,
        emailVerified: false,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning({
        id: users.id,
        email: users.email,
        username: users.username,
        fullName: users.fullName,
        emailVerified: users.emailVerified
      });

    // Create default user preferences
    await this.db.insert(userPreferences).values({
      userId: newUser.id,
      dashboardLayout: { layout: 'default', widgets: ['overview', 'top-funds', 'top-holdings'] },
      notifications: { email: true, inApp: true, positionChanges: true, newFilings: true },
      theme: 'light',
      timezone: 'UTC',
      currency: 'USD',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Create default watchlist
    await this.db.insert(userWatchlists).values({
      userId: newUser.id,
      name: 'My Watchlist',
      description: 'Default watchlist for tracked hedge funds',
      isDefault: true,
      isPublic: false,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Generate tokens
    const tokens = await this.generateTokens(newUser.id);

    return {
      user: newUser,
      ...tokens
    };
  }

  async login(credentials: UserCredentials): Promise<AuthResult> {
    if (!this.db) await this.initialize();

    // Find user
    const [user] = await this.db
      .select()
      .from(users)
      .where(and(
        eq(users.email, credentials.email),
        eq(users.isActive, true)
      ))
      .limit(1);

    if (!user) {
      throw new ApiError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(credentials.password, user.hashedPassword);
    if (!isValidPassword) {
      throw new ApiError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    // Update last login
    await this.db
      .update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, user.id));

    // Generate tokens
    const tokens = await this.generateTokens(user.id);

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        fullName: user.fullName,
        emailVerified: user.emailVerified
      },
      ...tokens
    };
  }

  async logout(sessionToken: string): Promise<void> {
    if (!this.db) await this.initialize();

    await this.db
      .delete(sessions)
      .where(eq(sessions.sessionToken, sessionToken));
  }

  async refreshToken(refreshToken: string): Promise<{ accessToken: string }> {
    if (!this.db) await this.initialize();

    try {
      const payload = jwt.verify(refreshToken, this.jwtRefreshSecret) as any;

      // Verify session exists and is not expired
      const [session] = await this.db
        .select()
        .from(sessions)
        .where(and(
          eq(sessions.sessionToken, refreshToken),
          gt(sessions.expiresAt, new Date())
        ))
        .limit(1);

      if (!session) {
        throw new ApiError('Invalid refresh token', 401, 'INVALID_TOKEN');
      }

      // Generate new access token
      const accessToken = jwt.sign(
        { userId: payload.userId, sessionId: session.id },
        this.jwtSecret,
        { expiresIn: '1h' }
      );

      return { accessToken };
    } catch (error) {
      throw new ApiError('Invalid refresh token', 401, 'INVALID_TOKEN');
    }
  }

  async validateSession(token: string): Promise<SessionInfo> {
    if (!this.db) await this.initialize();

    try {
      const payload = jwt.verify(token, this.jwtSecret) as any;

      // Get user and session info
      const [sessionData] = await this.db
        .select({
          userId: users.id,
          sessionId: sessions.id,
          email: users.email,
          username: users.username,
          isActive: users.isActive,
          sessionExpiry: sessions.expiresAt
        })
        .from(sessions)
        .innerJoin(users, eq(users.id, sessions.userId))
        .where(and(
          eq(sessions.id, payload.sessionId),
          eq(users.id, payload.userId),
          eq(users.isActive, true),
          gt(sessions.expiresAt, new Date())
        ))
        .limit(1);

      if (!sessionData) {
        throw new ApiError('Invalid session', 401, 'INVALID_SESSION');
      }

      return {
        userId: sessionData.userId,
        sessionId: sessionData.sessionId,
        email: sessionData.email,
        username: sessionData.username
      };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Invalid token', 401, 'INVALID_TOKEN');
    }
  }

  async changePassword(userId: number, currentPassword: string, newPassword: string): Promise<void> {
    if (!this.db) await this.initialize();

    // Get current user
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      throw new ApiError('User not found', 404, 'USER_NOT_FOUND');
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.hashedPassword);
    if (!isValidPassword) {
      throw new ApiError('Current password is incorrect', 401, 'INVALID_PASSWORD');
    }

    // Validate new password
    if (newPassword.length < 8) {
      throw new ApiError('New password must be at least 8 characters', 400, 'WEAK_PASSWORD');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    await this.db
      .update(users)
      .set({
        hashedPassword,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));

    // Invalidate all existing sessions for this user
    await this.db
      .delete(sessions)
      .where(eq(sessions.userId, userId));
  }

  async updateProfile(userId: number, updates: {
    username?: string;
    fullName?: string;
    email?: string;
  }): Promise<void> {
    if (!this.db) await this.initialize();

    // If email is being updated, check for duplicates
    if (updates.email) {
      const existingUser = await this.db
        .select()
        .from(users)
        .where(and(
          eq(users.email, updates.email),
          // Not the current user
          // We need to use SQL for this
        ))
        .limit(1);

      if (existingUser.length > 0) {
        throw new ApiError('Email already in use', 409, 'EMAIL_EXISTS');
      }
    }

    await this.db
      .update(users)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));
  }

  private async generateTokens(userId: number): Promise<{ accessToken: string; refreshToken: string }> {
    // Generate session token (used as refresh token)
    const sessionToken = crypto.randomBytes(32).toString('hex');

    // Create session
    const [session] = await this.db
      .insert(sessions)
      .values({
        userId,
        sessionToken,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        createdAt: new Date()
      })
      .returning({ id: sessions.id });

    // Generate access token
    const accessToken = jwt.sign(
      { userId, sessionId: session.id },
      this.jwtSecret,
      { expiresIn: '1h' }
    );

    // Generate refresh token
    const refreshToken = jwt.sign(
      { userId, sessionId: session.id },
      this.jwtRefreshSecret,
      { expiresIn: '30d' }
    );

    return { accessToken, refreshToken };
  }

  async getUserById(userId: number) {
    if (!this.db) await this.initialize();

    const [user] = await this.db
      .select({
        id: users.id,
        email: users.email,
        username: users.username,
        fullName: users.fullName,
        emailVerified: users.emailVerified,
        isActive: users.isActive,
        lastLoginAt: users.lastLoginAt,
        createdAt: users.createdAt
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    return user;
  }
}

// Singleton instance
export const authService = new AuthService();