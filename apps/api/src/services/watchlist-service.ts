import { connectDb } from '@hedge-fund-tracker/database';
import {
  userWatchlists,
  watchlistFunds,
  users,
  fundManagers,
  holdings,
  securities
} from '@hedge-fund-tracker/database/auth-schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { ApiError } from '@hedge-fund-tracker/shared';

export interface CreateWatchlistRequest {
  name: string;
  description?: string;
  isPublic?: boolean;
}

export interface WatchlistWithFunds {
  id: number;
  name: string;
  description: string | null;
  isDefault: boolean;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
  fundCount: number;
  funds: {
    id: number;
    fundManagerId: number;
    name: string;
    cik: string;
    addedAt: Date;
    notes: string | null;
    stats?: {
      totalValue: string;
      positionCount: number;
      lastFiling: Date | null;
    };
  }[];
}

export class WatchlistService {
  private db: any;

  constructor() {}

  async initialize() {
    this.db = await connectDb();
  }

  async getUserWatchlists(userId: number, includeStats = false): Promise<WatchlistWithFunds[]> {
    if (!this.db) await this.initialize();

    // Get user's watchlists
    const userWatchlistsData = await this.db
      .select()
      .from(userWatchlists)
      .where(eq(userWatchlists.userId, userId))
      .orderBy(desc(userWatchlists.isDefault), userWatchlists.name);

    const watchlistsWithFunds: WatchlistWithFunds[] = [];

    for (const watchlist of userWatchlistsData) {
      // Get funds in this watchlist
      const watchlistFundsQuery = this.db
        .select({
          id: watchlistFunds.id,
          fundManagerId: watchlistFunds.fundManagerId,
          addedAt: watchlistFunds.addedAt,
          notes: watchlistFunds.notes,
          fundName: fundManagers.name,
          fundCik: fundManagers.cik
        })
        .from(watchlistFunds)
        .innerJoin(fundManagers, eq(fundManagers.id, watchlistFunds.fundManagerId))
        .where(eq(watchlistFunds.watchlistId, watchlist.id))
        .orderBy(watchlistFunds.addedAt);

      const funds = await watchlistFundsQuery;

      // If stats are requested, get additional fund statistics
      const fundsWithStats = [];
      for (const fund of funds) {
        let stats = undefined;

        if (includeStats) {
          const [fundStats] = await this.db
            .select({
              totalValue: sql<string>`COALESCE(SUM(${holdings.marketValue}), 0)::text`,
              positionCount: sql<string>`COUNT(${holdings.id})::text`,
              lastFiling: sql<string>`MAX(${holdings.periodEndDate})`
            })
            .from(holdings)
            .where(eq(holdings.fundManagerId, fund.fundManagerId));

          stats = {
            totalValue: fundStats?.totalValue || '0',
            positionCount: parseInt(fundStats?.positionCount || '0'),
            lastFiling: fundStats?.lastFiling ? new Date(fundStats.lastFiling) : null
          };
        }

        fundsWithStats.push({
          id: fund.id,
          fundManagerId: fund.fundManagerId,
          name: fund.fundName,
          cik: fund.fundCik,
          addedAt: fund.addedAt,
          notes: fund.notes,
          stats
        });
      }

      watchlistsWithFunds.push({
        id: watchlist.id,
        name: watchlist.name,
        description: watchlist.description,
        isDefault: watchlist.isDefault,
        isPublic: watchlist.isPublic,
        createdAt: watchlist.createdAt,
        updatedAt: watchlist.updatedAt,
        fundCount: funds.length,
        funds: fundsWithStats
      });
    }

    return watchlistsWithFunds;
  }

  async getWatchlistById(userId: number, watchlistId: number, includeStats = false): Promise<WatchlistWithFunds | null> {
    if (!this.db) await this.initialize();

    // Verify watchlist belongs to user or is public
    const [watchlist] = await this.db
      .select()
      .from(userWatchlists)
      .where(
        and(
          eq(userWatchlists.id, watchlistId),
          // User owns it OR it's public
          // In SQL we'd use OR, but with Drizzle we need to check separately
          eq(userWatchlists.userId, userId)
        )
      )
      .limit(1);

    if (!watchlist) {
      // Check if it's a public watchlist
      const [publicWatchlist] = await this.db
        .select()
        .from(userWatchlists)
        .where(
          and(
            eq(userWatchlists.id, watchlistId),
            eq(userWatchlists.isPublic, true)
          )
        )
        .limit(1);

      if (!publicWatchlist) {
        return null;
      }
    }

    const targetWatchlist = watchlist || publicWatchlist;

    // Get the watchlist with funds using the helper method
    const watchlists = await this.getUserWatchlists(targetWatchlist.userId, includeStats);
    return watchlists.find(w => w.id === watchlistId) || null;
  }

  async createWatchlist(userId: number, data: CreateWatchlistRequest): Promise<number> {
    if (!this.db) await this.initialize();

    // Validate name is unique for this user
    const existing = await this.db
      .select()
      .from(userWatchlists)
      .where(
        and(
          eq(userWatchlists.userId, userId),
          eq(userWatchlists.name, data.name)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      throw new ApiError('Watchlist with this name already exists', 409, 'WATCHLIST_EXISTS');
    }

    const [newWatchlist] = await this.db
      .insert(userWatchlists)
      .values({
        userId,
        name: data.name,
        description: data.description || null,
        isDefault: false, // Only the first watchlist can be default
        isPublic: data.isPublic || false,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning({ id: userWatchlists.id });

    return newWatchlist.id;
  }

  async updateWatchlist(
    userId: number,
    watchlistId: number,
    updates: {
      name?: string;
      description?: string;
      isPublic?: boolean;
    }
  ): Promise<void> {
    if (!this.db) await this.initialize();

    // Verify ownership
    const [watchlist] = await this.db
      .select()
      .from(userWatchlists)
      .where(
        and(
          eq(userWatchlists.id, watchlistId),
          eq(userWatchlists.userId, userId)
        )
      )
      .limit(1);

    if (!watchlist) {
      throw new ApiError('Watchlist not found', 404, 'WATCHLIST_NOT_FOUND');
    }

    // Check name uniqueness if being updated
    if (updates.name && updates.name !== watchlist.name) {
      const existing = await this.db
        .select()
        .from(userWatchlists)
        .where(
          and(
            eq(userWatchlists.userId, userId),
            eq(userWatchlists.name, updates.name)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        throw new ApiError('Watchlist with this name already exists', 409, 'WATCHLIST_EXISTS');
      }
    }

    await this.db
      .update(userWatchlists)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(userWatchlists.id, watchlistId));
  }

  async deleteWatchlist(userId: number, watchlistId: number): Promise<void> {
    if (!this.db) await this.initialize();

    // Verify ownership and that it's not the default watchlist
    const [watchlist] = await this.db
      .select()
      .from(userWatchlists)
      .where(
        and(
          eq(userWatchlists.id, watchlistId),
          eq(userWatchlists.userId, userId)
        )
      )
      .limit(1);

    if (!watchlist) {
      throw new ApiError('Watchlist not found', 404, 'WATCHLIST_NOT_FOUND');
    }

    if (watchlist.isDefault) {
      throw new ApiError('Cannot delete default watchlist', 400, 'CANNOT_DELETE_DEFAULT');
    }

    // Delete the watchlist (funds will be cascade deleted)
    await this.db
      .delete(userWatchlists)
      .where(eq(userWatchlists.id, watchlistId));
  }

  async addFundToWatchlist(userId: number, watchlistId: number, fundManagerId: number, notes?: string): Promise<void> {
    if (!this.db) await this.initialize();

    // Verify watchlist ownership
    const [watchlist] = await this.db
      .select()
      .from(userWatchlists)
      .where(
        and(
          eq(userWatchlists.id, watchlistId),
          eq(userWatchlists.userId, userId)
        )
      )
      .limit(1);

    if (!watchlist) {
      throw new ApiError('Watchlist not found', 404, 'WATCHLIST_NOT_FOUND');
    }

    // Verify fund exists
    const [fund] = await this.db
      .select()
      .from(fundManagers)
      .where(eq(fundManagers.id, fundManagerId))
      .limit(1);

    if (!fund) {
      throw new ApiError('Fund not found', 404, 'FUND_NOT_FOUND');
    }

    // Check if fund is already in watchlist
    const existing = await this.db
      .select()
      .from(watchlistFunds)
      .where(
        and(
          eq(watchlistFunds.watchlistId, watchlistId),
          eq(watchlistFunds.fundManagerId, fundManagerId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      throw new ApiError('Fund already in watchlist', 409, 'FUND_ALREADY_IN_WATCHLIST');
    }

    // Add fund to watchlist
    await this.db
      .insert(watchlistFunds)
      .values({
        watchlistId,
        fundManagerId,
        notes: notes || null,
        addedAt: new Date()
      });

    // Update watchlist timestamp
    await this.db
      .update(userWatchlists)
      .set({ updatedAt: new Date() })
      .where(eq(userWatchlists.id, watchlistId));
  }

  async removeFundFromWatchlist(userId: number, watchlistId: number, fundManagerId: number): Promise<void> {
    if (!this.db) await this.initialize();

    // Verify watchlist ownership
    const [watchlist] = await this.db
      .select()
      .from(userWatchlists)
      .where(
        and(
          eq(userWatchlists.id, watchlistId),
          eq(userWatchlists.userId, userId)
        )
      )
      .limit(1);

    if (!watchlist) {
      throw new ApiError('Watchlist not found', 404, 'WATCHLIST_NOT_FOUND');
    }

    // Remove fund from watchlist
    const result = await this.db
      .delete(watchlistFunds)
      .where(
        and(
          eq(watchlistFunds.watchlistId, watchlistId),
          eq(watchlistFunds.fundManagerId, fundManagerId)
        )
      );

    // Update watchlist timestamp
    await this.db
      .update(userWatchlists)
      .set({ updatedAt: new Date() })
      .where(eq(userWatchlists.id, watchlistId));
  }

  async updateFundNotes(userId: number, watchlistId: number, fundManagerId: number, notes: string): Promise<void> {
    if (!this.db) await this.initialize();

    // Verify watchlist ownership
    const [watchlist] = await this.db
      .select()
      .from(userWatchlists)
      .where(
        and(
          eq(userWatchlists.id, watchlistId),
          eq(userWatchlists.userId, userId)
        )
      )
      .limit(1);

    if (!watchlist) {
      throw new ApiError('Watchlist not found', 404, 'WATCHLIST_NOT_FOUND');
    }

    // Update notes
    await this.db
      .update(watchlistFunds)
      .set({ notes })
      .where(
        and(
          eq(watchlistFunds.watchlistId, watchlistId),
          eq(watchlistFunds.fundManagerId, fundManagerId)
        )
      );
  }

  async getPublicWatchlists(limit = 10): Promise<WatchlistWithFunds[]> {
    if (!this.db) await this.initialize();

    const publicWatchlistsData = await this.db
      .select({
        watchlist: userWatchlists,
        ownerUsername: users.username,
        ownerEmail: users.email
      })
      .from(userWatchlists)
      .innerJoin(users, eq(users.id, userWatchlists.userId))
      .where(eq(userWatchlists.isPublic, true))
      .orderBy(desc(userWatchlists.updatedAt))
      .limit(limit);

    const watchlists: WatchlistWithFunds[] = [];

    for (const { watchlist } of publicWatchlistsData) {
      const funds = await this.db
        .select({
          id: watchlistFunds.id,
          fundManagerId: watchlistFunds.fundManagerId,
          addedAt: watchlistFunds.addedAt,
          notes: watchlistFunds.notes,
          fundName: fundManagers.name,
          fundCik: fundManagers.cik
        })
        .from(watchlistFunds)
        .innerJoin(fundManagers, eq(fundManagers.id, watchlistFunds.fundManagerId))
        .where(eq(watchlistFunds.watchlistId, watchlist.id))
        .orderBy(watchlistFunds.addedAt);

      watchlists.push({
        id: watchlist.id,
        name: watchlist.name,
        description: watchlist.description,
        isDefault: watchlist.isDefault,
        isPublic: watchlist.isPublic,
        createdAt: watchlist.createdAt,
        updatedAt: watchlist.updatedAt,
        fundCount: funds.length,
        funds: funds.map(fund => ({
          id: fund.id,
          fundManagerId: fund.fundManagerId,
          name: fund.fundName,
          cik: fund.fundCik,
          addedAt: fund.addedAt,
          notes: fund.notes
        }))
      });
    }

    return watchlists;
  }
}

// Singleton instance
export const watchlistService = new WatchlistService();