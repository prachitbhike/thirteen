# 🚀 Setup Guide for Hedge Fund Tracker

This guide will help you set up the complete 13F hedge fund tracking application with a Supabase backend.

## 📋 Prerequisites

- Node.js 18+
- npm 8+
- Supabase account

## 🏗️ Step-by-Step Setup

### 1. Install Dependencies

```bash
# Install frontend dependencies
cd apps/web && npm install

# Install database package dependencies
cd ../../packages/database && npm install
```

### 2. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for the project to be fully provisioned (this can take a few minutes)
3. Note down your:
   - Project URL (looks like: `https://xxxxx.supabase.co`)
   - Anon public key
   - Service role key (from Settings > API)
   - Database password (you set this during project creation)

### 3. Configure Environment Variables

1. Copy the environment template:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` with your Supabase credentials:
   ```bash
   # Database Configuration (Supabase)
   DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT_ID.supabase.co:5432/postgres
   DATABASE_SSL=true
   DATABASE_SSL_REJECT_UNAUTHORIZED=true
   SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
   SUPABASE_ANON_KEY=your-anon-key-here
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

   # Frontend Environment Variables (for Vite)
   VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

### 4. Set Up Database Schema

```bash
# Make sure you're in the database package directory
cd packages/database

# Run migrations to create tables and seed data
npm run migrate
```

This will:
- ✅ Create all database tables (fund_managers, securities, holdings, etc.)
- ✅ Set up proper indexes for performance
- ✅ Insert sample data (5 fund managers, 10 securities, sample holdings)

### 5. Verify Database Setup

You can verify the setup worked by:

1. **Using Supabase Dashboard:**
   - Go to your Supabase project dashboard
   - Click on "Table Editor"
   - You should see tables like `fund_managers`, `securities`, `holdings`, etc.

2. **Using Database Studio (optional):**
   ```bash
   cd packages/database
   npm run studio
   ```

### 6. Start Development Server

```bash
# From the project root
npm run dev
```

This will start the Vite development server on `http://localhost:5173`

## 🎯 What You Should See

After setup, your application will have:

### Dashboard (`/dashboard`)
- Overview statistics (total funds, securities, AUM)
- Top funds by assets under management
- Most popular holdings across all funds

### Funds Page (`/funds`)
- List of all hedge funds with search functionality
- Fund cards showing AUM, position count, and latest filing date

### Fund Detail Pages (`/funds/:id`)
- Individual fund portfolio breakdown
- Current holdings with position sizes
- Filing history

### Search (`/search`)
- Global search across funds and securities
- Trending securities and popular searches

## 🔧 Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Type checking
npm run typecheck

# Database operations
cd packages/database
npm run migrate      # Run migrations
npm run seed         # Re-seed with fresh data
npm run studio       # Open Drizzle Studio
```

## 🗃️ Sample Data Included

The initial migration includes:

**Fund Managers:**
- Berkshire Hathaway Inc (CIK: 0001067983)
- BlackRock Inc. (CIK: 0001364742)
- Vanguard Group Inc (CIK: 0001104659)
- State Street Corp (CIK: 0000093751)
- Fidelity Management & Research Company LLC (CIK: 0001346610)

**Securities:**
- Major tech stocks: AAPL, MSFT, GOOGL, TSLA, AMZN
- Financial stocks: BAC, WFC, JPM
- Other blue chips: CVX, KO

**Holdings Data:**
- Q2 2024 portfolio positions
- Realistic position sizes and allocations
- Position change tracking

## 🚨 Troubleshooting

### Database Connection Issues
- Verify your DATABASE_URL is correct
- Make sure your Supabase project is fully provisioned
- Check that your database password is correct

### Environment Variables Not Loading
- Make sure `.env` file is in the project root
- Restart the development server after changing `.env`
- For Vite variables, they must start with `VITE_`

### Migration Fails
- Check your DATABASE_URL format
- Ensure you have the service role key (not just anon key)
- Verify SSL settings match your Supabase configuration

### Frontend Shows No Data
- Check browser console for API errors
- Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set
- Make sure the database has been seeded with data

## 🚀 Next Steps

Once you have the basic setup working:

1. **Add Authentication** - User signup/login functionality
2. **SEC EDGAR Integration** - Automate 13F filing ingestion
3. **Real-time Updates** - WebSocket notifications for new filings
4. **Advanced Analytics** - Portfolio analysis and risk metrics
5. **Deploy to Production** - Host on Vercel/Netlify with Supabase backend

## 🆘 Support

If you run into issues:
1. Check this troubleshooting section
2. Verify all environment variables are set correctly
3. Ensure your Supabase project is fully set up
4. Check the browser console and terminal for error messages

The application uses mock data fallbacks, so even without a database connection, you should see the UI working with sample data.