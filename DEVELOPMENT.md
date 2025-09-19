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
- Docker and Docker Compose
- Git

### Setup

1. **Clone and install dependencies:**
   ```bash
   git clone <repository-url>
   cd hedge-fund-tracker
   npm install
   ```

2. **Set up environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start database:**
   ```bash
   ./scripts/setup-database.sh
   ```

4. **Run development servers:**
   ```bash
   # Terminal 1: Start database
   docker-compose up postgres

   # Terminal 2: Start backend API
   npm run dev --workspace=@hedge-fund-tracker/api

   # Terminal 3: Start frontend
   npm run dev --workspace=@hedge-fund-tracker/web

   # Terminal 4: Start ingestion service (optional)
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
├── scripts/              # Setup and utility scripts
└── docs/                 # Documentation
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
DATABASE_URL=postgresql://localhost:5432/hedge_fund_tracker
OPENAI_API_KEY=your-openai-key
SEC_USER_AGENT=YourCompany your@email.com
```

## 🐛 Troubleshooting

### Database Issues

```bash
# Reset database
docker-compose down -v
./scripts/setup-database.sh
```

### Port Conflicts

- Frontend: http://localhost:5173
- Backend API: http://localhost:3001
- PostgreSQL: localhost:5432

### Common Issues

1. **Docker not running**: Ensure Docker Desktop is started
2. **Port already in use**: Check for other services on ports 5173, 3001, 5432
3. **Environment variables**: Ensure .env file is properly configured

## 📚 Additional Resources

- [SEC EDGAR API Documentation](https://www.sec.gov/edgar/sec-api-documentation)
- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [Hono Framework Documentation](https://hono.dev/)
- [React Query Documentation](https://tanstack.com/query/latest)