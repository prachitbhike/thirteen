# Hedge Fund Tracker

A comprehensive platform for tracking and analyzing hedge fund activity through 13F filings with real-time insights and AI-powered analysis.

## 🎯 Overview

Hedge Fund Tracker is an enterprise-grade application that monitors institutional investment activity by processing SEC 13F filings. It provides real-time tracking, intelligent analysis, and user-friendly dashboards for analyzing hedge fund portfolios and position changes.

## ✨ Key Features

### 📊 **Real-Time Dashboard**
- Interactive overview of hedge fund activity and market trends
- Live data visualization with charts and statistics
- Sector allocation analysis and concentration metrics
- Top performing funds and most popular holdings

### 🏛️ **Fund Tracking**
- Comprehensive database of hedge funds and investment managers
- Detailed portfolio analysis with position history
- Performance metrics and risk assessment
- Search and filter capabilities across 1000+ funds

### 📈 **Position Monitoring**
- Track buy/sell activity and position changes
- Quarter-over-quarter comparison and trend analysis
- Alert system for significant position movements
- Holdings data with market value and percentage tracking

### 🔍 **Advanced Search**
- Global search across funds, securities, and holdings
- Autocomplete suggestions and similar entity recommendations
- Filter by sector, position size, time period, and more
- Trending searches and popular entities

## 🏗️ Architecture

### **Frontend (React + TypeScript)**
- Modern React 18 application with Vite build system
- Responsive design with Tailwind CSS and shadcn/ui components
- Real-time data visualization using Recharts
- React Query for efficient data fetching and caching

### **Backend (Supabase)**
- PostgreSQL database with optimized schema for 13F data
- Real-time subscriptions and automatic API generation
- Built-in authentication and authorization
- Row-level security (RLS) for data protection

### **Data Pipeline** (Future)
- Automated SEC EDGAR API integration
- 13F filing parser supporting XML, HTML, and text formats
- Scheduled data ingestion with error handling and retry logic
- Position change calculation and trend analysis

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm 9+ (workspace support)
- Supabase account and project
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd hedge-fund-tracker
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

   > ℹ️ npm 9+ is required for workspace protocol support. Upgrade with `npm install -g npm@9` if you encounter `EUNSUPPORTEDPROTOCOL`.

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your Supabase credentials
   ```

4. **Set up Supabase**
   - Create a new project at [supabase.com](https://supabase.com)
   - Copy your project URL and API keys to `.env`:
     ```bash
     DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT_ID.supabase.co:5432/postgres
     SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
     SUPABASE_ANON_KEY=your-anon-key
     SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
     ```
   - Run the database migrations:
     ```bash
     cd packages/database && npm install
     npm run migrate
     ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Access the application**
   - Frontend: http://localhost:5173
   - Supabase Dashboard: https://app.supabase.com

## 📦 Project Structure

```
hedge-fund-tracker/
├── apps/
│   └── web/              # React frontend dashboard
├── packages/
│   ├── database/         # Database schema and migrations
│   └── shared/           # Shared types and utilities
├── .env.example          # Environment variables template
└── README.md
```

## 🔧 Development

### Key Commands
```bash
# Development
npm run dev                    # Start frontend development server
npm run build                  # Build all packages
npm run typecheck              # Type check all packages

# Database
npm run db:migrate             # Run database migrations (when implemented)
npm run db:seed                # Seed initial data (when implemented)
```

### Environment Variables
```bash
# Database (Supabase)
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT_ID.supabase.co:5432/postgres
SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Application
NODE_ENV=development
WEB_PORT=5173
```

## 📊 Data Sources (Planned)

### **SEC EDGAR API**
- Official SEC filing database
- 13F-HR and 13F-HR/A forms
- Quarterly institutional holdings data
- Real-time filing notifications

### **Supported Data Formats**
- XML-based 13F filings (post-2013)
- HTML table format
- Plain text submissions
- CSV export capabilities

## 🔐 Security

- Supabase built-in authentication with JWT tokens
- Row-level security (RLS) policies
- Environment variable configuration
- Input validation and sanitization
- SQL injection prevention with Supabase's secure APIs

## 🚀 Deployment

### **Production Considerations**
- Configure Supabase production environment
- Set up custom domain and SSL certificates
- Configure environment variables in hosting platform
- Enable database backups
- Set up monitoring and alerting

### **Recommended Hosting**
- **Frontend**: Vercel, Netlify, or Cloudflare Pages
- **Database**: Supabase (managed PostgreSQL)
- **CDN**: Cloudflare for static assets

## 📈 Current Status

### ✅ Completed
- Frontend application with React + TypeScript
- Dashboard with mock data visualization
- Fund search and detail pages
- Global search interface
- Responsive design with Tailwind CSS
- Database schema design
- Development environment setup

### 🚧 In Progress
- Supabase integration and migrations
- API layer for data fetching
- Authentication system

### 📋 Planned
- SEC EDGAR API integration
- Data ingestion pipeline
- Real-time notifications
- AI-powered analysis
- Advanced filtering and analytics
- Mobile application

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- Check the environment setup section above
- Review Supabase documentation for database issues
- Report bugs via GitHub Issues
- For questions, create a discussion thread

---

**Built with ❤️ for the financial community**

*Disclaimer: This application is for informational purposes only and does not constitute investment advice. Always conduct your own research and consult with financial professionals before making investment decisions.*