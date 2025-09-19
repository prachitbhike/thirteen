import { Hono } from 'hono';
import { z } from 'zod';
import { watchlistService } from '../services/watchlist-service.js';
import { authMiddleware } from '../middleware/auth.js';
import { ApiError } from '@hedge-fund-tracker/shared';

export const watchlistRoutes = new Hono();

// Request schemas
const CreateWatchlistSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  description: z.string().max(500, 'Description too long').optional(),
  isPublic: z.boolean().default(false)
});

const UpdateWatchlistSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long').optional(),
  description: z.string().max(500, 'Description too long').optional(),
  isPublic: z.boolean().optional()
});

const AddFundSchema = z.object({
  fundManagerId: z.number().int().positive('Invalid fund ID'),
  notes: z.string().max(1000, 'Notes too long').optional()
});

const UpdateNotesSchema = z.object({
  notes: z.string().max(1000, 'Notes too long')
});

// GET /api/watchlists - Get user's watchlists
watchlistRoutes.get('/', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const includeStats = c.req.query('includeStats') === 'true';

    const watchlists = await watchlistService.getUserWatchlists(user.userId, includeStats);

    return c.json({
      success: true,
      data: watchlists
    });

  } catch (error) {
    console.error('Error fetching watchlists:', error);
    return c.json({
      success: false,
      error: 'Failed to fetch watchlists'
    }, 500);
  }
});

// POST /api/watchlists - Create new watchlist
watchlistRoutes.post('/', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const body = await c.req.json();
    const data = CreateWatchlistSchema.parse(body);

    const watchlistId = await watchlistService.createWatchlist(user.userId, data);

    return c.json({
      success: true,
      data: { id: watchlistId },
      message: 'Watchlist created successfully'
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

    console.error('Error creating watchlist:', error);
    return c.json({
      success: false,
      error: 'Failed to create watchlist'
    }, 500);
  }
});

// GET /api/watchlists/:id - Get specific watchlist
watchlistRoutes.get('/:id', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const watchlistId = parseInt(c.req.param('id'));
    const includeStats = c.req.query('includeStats') === 'true';

    if (isNaN(watchlistId)) {
      return c.json({
        success: false,
        error: 'Invalid watchlist ID'
      }, 400);
    }

    const watchlist = await watchlistService.getWatchlistById(user.userId, watchlistId, includeStats);

    if (!watchlist) {
      return c.json({
        success: false,
        error: 'Watchlist not found'
      }, 404);
    }

    return c.json({
      success: true,
      data: watchlist
    });

  } catch (error) {
    console.error('Error fetching watchlist:', error);
    return c.json({
      success: false,
      error: 'Failed to fetch watchlist'
    }, 500);
  }
});

// PUT /api/watchlists/:id - Update watchlist
watchlistRoutes.put('/:id', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const watchlistId = parseInt(c.req.param('id'));
    const body = await c.req.json();
    const data = UpdateWatchlistSchema.parse(body);

    if (isNaN(watchlistId)) {
      return c.json({
        success: false,
        error: 'Invalid watchlist ID'
      }, 400);
    }

    await watchlistService.updateWatchlist(user.userId, watchlistId, data);

    return c.json({
      success: true,
      message: 'Watchlist updated successfully'
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

    console.error('Error updating watchlist:', error);
    return c.json({
      success: false,
      error: 'Failed to update watchlist'
    }, 500);
  }
});

// DELETE /api/watchlists/:id - Delete watchlist
watchlistRoutes.delete('/:id', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const watchlistId = parseInt(c.req.param('id'));

    if (isNaN(watchlistId)) {
      return c.json({
        success: false,
        error: 'Invalid watchlist ID'
      }, 400);
    }

    await watchlistService.deleteWatchlist(user.userId, watchlistId);

    return c.json({
      success: true,
      message: 'Watchlist deleted successfully'
    });

  } catch (error) {
    if (error instanceof ApiError) {
      return c.json({
        success: false,
        error: error.message,
        code: error.code
      }, error.statusCode);
    }

    console.error('Error deleting watchlist:', error);
    return c.json({
      success: false,
      error: 'Failed to delete watchlist'
    }, 500);
  }
});

// POST /api/watchlists/:id/funds - Add fund to watchlist
watchlistRoutes.post('/:id/funds', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const watchlistId = parseInt(c.req.param('id'));
    const body = await c.req.json();
    const data = AddFundSchema.parse(body);

    if (isNaN(watchlistId)) {
      return c.json({
        success: false,
        error: 'Invalid watchlist ID'
      }, 400);
    }

    await watchlistService.addFundToWatchlist(user.userId, watchlistId, data.fundManagerId, data.notes);

    return c.json({
      success: true,
      message: 'Fund added to watchlist successfully'
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

    console.error('Error adding fund to watchlist:', error);
    return c.json({
      success: false,
      error: 'Failed to add fund to watchlist'
    }, 500);
  }
});

// DELETE /api/watchlists/:id/funds/:fundId - Remove fund from watchlist
watchlistRoutes.delete('/:id/funds/:fundId', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const watchlistId = parseInt(c.req.param('id'));
    const fundManagerId = parseInt(c.req.param('fundId'));

    if (isNaN(watchlistId) || isNaN(fundManagerId)) {
      return c.json({
        success: false,
        error: 'Invalid watchlist or fund ID'
      }, 400);
    }

    await watchlistService.removeFundFromWatchlist(user.userId, watchlistId, fundManagerId);

    return c.json({
      success: true,
      message: 'Fund removed from watchlist successfully'
    });

  } catch (error) {
    if (error instanceof ApiError) {
      return c.json({
        success: false,
        error: error.message,
        code: error.code
      }, error.statusCode);
    }

    console.error('Error removing fund from watchlist:', error);
    return c.json({
      success: false,
      error: 'Failed to remove fund from watchlist'
    }, 500);
  }
});

// PUT /api/watchlists/:id/funds/:fundId/notes - Update fund notes
watchlistRoutes.put('/:id/funds/:fundId/notes', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const watchlistId = parseInt(c.req.param('id'));
    const fundManagerId = parseInt(c.req.param('fundId'));
    const body = await c.req.json();
    const data = UpdateNotesSchema.parse(body);

    if (isNaN(watchlistId) || isNaN(fundManagerId)) {
      return c.json({
        success: false,
        error: 'Invalid watchlist or fund ID'
      }, 400);
    }

    await watchlistService.updateFundNotes(user.userId, watchlistId, fundManagerId, data.notes);

    return c.json({
      success: true,
      message: 'Notes updated successfully'
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

    console.error('Error updating fund notes:', error);
    return c.json({
      success: false,
      error: 'Failed to update notes'
    }, 500);
  }
});

// GET /api/watchlists/public - Get public watchlists
watchlistRoutes.get('/public', async (c) => {
  try {
    const limit = parseInt(c.req.query('limit') || '10');

    const watchlists = await watchlistService.getPublicWatchlists(limit);

    return c.json({
      success: true,
      data: watchlists
    });

  } catch (error) {
    console.error('Error fetching public watchlists:', error);
    return c.json({
      success: false,
      error: 'Failed to fetch public watchlists'
    }, 500);
  }
});