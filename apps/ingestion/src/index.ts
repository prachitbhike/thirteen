import dotenv from 'dotenv';
import cron from 'node-cron';
import winston from 'winston';
import { DataIngestionService } from './services/data-ingestion-service.js';

// Load environment variables
dotenv.config();

// Configure logging
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'hedge-fund-ingestion' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

class IngestionScheduler {
  private ingestionService: DataIngestionService;
  private isRunning = false;

  constructor() {
    const userAgent = process.env.SEC_USER_AGENT || 'HedgeFundTracker info@example.com';
    this.ingestionService = new DataIngestionService(userAgent);
  }

  async initialize() {
    try {
      await this.ingestionService.initialize();
      logger.info('Ingestion service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize ingestion service:', error);
      throw error;
    }
  }

  async runDailyIngestion() {
    if (this.isRunning) {
      logger.warn('Ingestion already running, skipping scheduled run');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      logger.info('Starting daily 13F ingestion');

      // Ingest filings from the last 7 days
      const endDate = new Date();
      const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const result = await this.ingestionService.ingestFilings({
        startDate,
        endDate,
        skipExisting: true,
        maxConcurrent: 5
      });

      const duration = Date.now() - startTime;

      logger.info('Daily ingestion completed', {
        processedFilings: result.processedFilings,
        newHoldings: result.newHoldings,
        updatedSecurities: result.updatedSecurities,
        newFundManagers: result.newFundManagers,
        errorCount: result.errors.length,
        durationMs: duration
      });

      if (result.errors.length > 0) {
        logger.warn('Ingestion completed with errors', { errors: result.errors });
      }

    } catch (error) {
      logger.error('Daily ingestion failed:', error);
    } finally {
      this.isRunning = false;
    }
  }

  async runSpecificFundIngestion(ciks: string[]) {
    try {
      logger.info(`Starting ingestion for specific funds: ${ciks.join(', ')}`);

      const result = await this.ingestionService.ingestForSpecificFunds(ciks, {
        skipExisting: false,
        maxConcurrent: 3
      });

      logger.info('Specific fund ingestion completed', {
        ciks,
        processedFilings: result.processedFilings,
        newHoldings: result.newHoldings,
        duration: result.duration
      });

      return result;

    } catch (error) {
      logger.error('Specific fund ingestion failed:', error);
      throw error;
    }
  }

  async getStats() {
    try {
      const stats = await this.ingestionService.getIngestionStats();
      logger.info('Current ingestion statistics', stats);
      return stats;
    } catch (error) {
      logger.error('Failed to get ingestion stats:', error);
      throw error;
    }
  }

  startScheduler() {
    const scheduleEnabled = process.env.INGESTION_SCHEDULE_ENABLED === 'true';
    const cronSchedule = process.env.INGESTION_CRON_SCHEDULE || '0 0 * * 0'; // Every Sunday at midnight

    if (!scheduleEnabled) {
      logger.info('Scheduled ingestion is disabled');
      return;
    }

    logger.info(`Starting ingestion scheduler with cron: ${cronSchedule}`);

    cron.schedule(cronSchedule, async () => {
      await this.runDailyIngestion();
    }, {
      scheduled: true,
      timezone: 'America/New_York' // SEC operates on Eastern Time
    });

    logger.info('Ingestion scheduler started successfully');
  }
}

// Main execution
async function main() {
  const scheduler = new IngestionScheduler();

  try {
    await scheduler.initialize();

    const command = process.argv[2];

    switch (command) {
      case 'run':
        // Run ingestion once
        await scheduler.runDailyIngestion();
        process.exit(0);
        break;

      case 'fund':
        // Run ingestion for specific funds
        const ciks = process.argv.slice(3);
        if (ciks.length === 0) {
          logger.error('Please provide CIK numbers: npm run ingest:fund -- 1234567890 0987654321');
          process.exit(1);
        }
        await scheduler.runSpecificFundIngestion(ciks);
        process.exit(0);
        break;

      case 'stats':
        // Show ingestion statistics
        await scheduler.getStats();
        process.exit(0);
        break;

      case 'schedule':
      case 'daemon':
        // Start scheduled ingestion
        scheduler.startScheduler();
        logger.info('Ingestion scheduler is running. Press Ctrl+C to stop.');
        break;

      default:
        logger.info('Available commands:');
        logger.info('  npm run dev                    - Start in development mode with scheduler');
        logger.info('  npm run ingest:latest          - Run one-time ingestion');
        logger.info('  npm run ingest:fund -- <ciks>  - Ingest specific funds');
        logger.info('  npm run stats                  - Show ingestion statistics');
        process.exit(0);
    }

  } catch (error) {
    logger.error('Application failed to start:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('Received SIGINT, shutting down gracefully');
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the application
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}