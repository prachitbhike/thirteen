# Hedge Fund Tracker - Development Guide

A comprehensive dashboard for tracking hedge fund activity through 13F filings.

## 🏗️ Architecture

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Backend**: Node.js + TypeScript + Hono
- **Database**: PostgreSQL with Drizzle ORM
- **Ingestion**: SEC EDGAR API integration
- **Analysis**: LLM API integration for insights

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm 9+
- A Supabase project with database credentials (service role key recommended)
- Git

### Setup

1. **Clone and install dependencies:**
   ```bash
   git clone <repository-url>
   cd hedge-fund-tracker
   npm install
   ```

2. **Configure environment variables:**
   ```bash
   cp .env.example .env
   # Fill in DATABASE_URL, SUPABASE_* keys, and service secrets
   ```

3. **Provision the database (Supabase):**
   ```bash
   npm run db:setup   # runs migrations then seeds sample data
   ```

4. **Start development servers:**
   ```bash
   # Backend API
   npm run dev --workspace=@hedge-fund-tracker/api

   # Frontend
   npm run dev --workspace=@hedge-fund-tracker/web

   # Ingestion service (optional)
   npm run dev --workspace=@hedge-fund-tracker/ingestion
   ```

## 📦 Project Structure

```
hedge-fund-tracker/
├── apps/
│   ├── web/              # React frontend dashboard
│   ├── api/              # Backend API server
│   └── ingestion/        # 13F data ingestion service
├── packages/
│   ├── database/         # Database schema and migrations
│   ├── shared/           # Shared types and utilities
│   └── ui/               # Shared UI components
```

## 🗄️ Database

The application uses PostgreSQL with the following core tables:

- `fund_managers` - Hedge fund information
- `securities` - Security/stock information
- `filings` - 13F filing metadata
- `holdings` - Position data from filings
- `position_changes` - Calculated changes between periods

### Database Commands

```bash
# Run migrations
npm run db:migrate

# Seed initial data
npm run db:seed

# Open Drizzle Studio
npm run studio --workspace=@hedge-fund-tracker/database
```

## 🔧 Development Commands

### Root Level

```bash
npm run build         # Build all packages
npm run dev          # Start all dev servers
npm run lint         # Lint all packages
npm run typecheck    # Type check all packages
npm run test         # Run all tests
```

### Individual Packages

```bash
# Frontend (React app)
npm run dev --workspace=@hedge-fund-tracker/web

# Backend API
npm run dev --workspace=@hedge-fund-tracker/api

# Data ingestion
npm run dev --workspace=@hedge-fund-tracker/ingestion

# Database operations
npm run migrate --workspace=@hedge-fund-tracker/database
```

### Testing status and next steps

- Automated tests are not yet configured; `npm run test` currently skips every workspace because no package exposes a `test` script.
- Recommended coverage roadmap:
  - **Shared utilities** (`packages/shared/src/utils.ts`): add Vitest unit suites for formatting helpers such as `formatCurrency`, `formatLargeNumber`, `calculatePercentageChange`, and `getQuarterEndDate`.
  - **API routes** (`apps/api/src/routes/*`): add Supertest-powered integration tests that seed a disposable Postgres database and verify response payloads, pagination, and error handling.
  - **Web components/pages** (`apps/web/src`): use React Testing Library with mocked API calls to assert dashboard metrics rendering, table sorting/filtering, and empty-state messaging.
  - **Ingestion service** (`apps/ingestion/src/services/data-ingestion-service.ts`): create scenario tests that stub SEC ingestion inputs and confirm holdings/filings persistence plus idempotent retries.
- Tooling required: add `vitest` (root config), `@testing-library/react` for the web workspace, and `supertest` for the API workspace, then expose a `test` npm script in each package.

### Supabase configuration

1. **Create a Supabase project** and retrieve the Node.js connection string plus the service role key.
2. **Populate `.env`** using the placeholders in `.env.example` (`DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, etc.).
3. **Run `npm run db:setup`** to execute migrations and seed sample portfolio data.
4. **Verify connectivity** by hitting `http://localhost:3001/health`; failures usually point to an incorrect connection string or missing SSL flags.

## 🌐 API Endpoints

The backend API provides the following key endpoints:

- `GET /api/funds` - List tracked hedge funds
- `GET /api/holdings` - Get holdings data with filters
- `GET /api/position-changes` - Get position changes
- `GET /api/dashboard/stats` - Dashboard statistics
- `POST /api/analysis` - Generate LLM analysis

## 📊 Features

### Core Functionality

- [x] Database schema and setup
- [ ] 13F filing data ingestion
- [ ] Real-time dashboard
- [ ] Position change tracking
- [ ] LLM-powered analysis
- [ ] User management
- [ ] Fund selection interface

### Planned Features

- Advanced filtering and search
- Real-time notifications
- Export capabilities
- Performance analytics
- Sector analysis
- Concentration risk metrics

## 🔐 Environment Variables

Key environment variables (see `.env.example`):

```bash
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT_ID.supabase.co:5432/postgres
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
OPENAI_API_KEY=your-openai-key
SEC_USER_AGENT=YourCompany your@email.com
```

## 🐛 Troubleshooting

### Database Issues

```bash
# Reset database by re-running migrations
npm run db:migrate

# Re-seed sample data
npm run db:seed
```

### Port Conflicts

- Frontend: http://localhost:5173
- Backend API: http://localhost:3001

### Common Issues

1. **Docker not running**: Ensure Docker Desktop is started
2. **Port already in use**: Check for other services on ports 5173, 3001, 5432
3. **Environment variables**: Ensure .env file is properly configured

## 📚 Additional Resources

- [SEC EDGAR API Documentation](https://www.sec.gov/edgar/sec-api-documentation)
- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [Hono Framework Documentation](https://hono.dev/)
- [React Query Documentation](https://tanstack.com/query/latest)
