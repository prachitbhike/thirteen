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

### 🤖 **AI-Powered Analysis**
- OpenAI/Anthropic integration for intelligent insights
- Automated portfolio analysis and risk assessment
- Market trend identification and opportunity detection
- Professional-grade financial commentary and recommendations

### 👤 **User Management**
- Personal watchlists for tracking selected hedge funds
- Customizable alerts and notification preferences
- Public/private watchlist sharing capabilities
- User activity tracking and preferences

### 🔔 **Real-Time Notifications**
- WebSocket-based live updates
- Configurable alerts for position changes and new filings
- In-app notification system with read/unread status
- Email and push notification support (ready for integration)

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

### **Backend (Node.js + Hono)**
- High-performance API server with TypeScript
- PostgreSQL database with Drizzle ORM
- JWT-based authentication with session management
- WebSocket support for real-time updates

### **Data Pipeline**
- Automated SEC EDGAR API integration
- 13F filing parser supporting XML, HTML, and text formats
- Scheduled data ingestion with error handling and retry logic
- Position change calculation and trend analysis

### **AI Integration**
- Multi-provider LLM service (OpenAI + Anthropic fallback)
- Specialized financial analysis prompts and templates
- Caching system for expensive AI operations
- Professional-grade investment insights generation

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Docker and Docker Compose
- PostgreSQL 15+

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

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your API keys and database settings
   ```

4. **Start the database**
   ```bash
   ./scripts/setup-database.sh
   ```

5. **Run database migrations**
   ```bash
   npm run db:migrate
   ```

6. **Start the application**
   ```bash
   # Terminal 1: Start database
   docker-compose up postgres

   # Terminal 2: Start backend API
   npm run dev --workspace=@hedge-fund-tracker/api

   # Terminal 3: Start frontend
   npm run dev --workspace=@hedge-fund-tracker/web

   # Terminal 4 (optional): Start data ingestion
   npm run dev --workspace=@hedge-fund-tracker/ingestion
   ```

7. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3001
   - API Documentation: http://localhost:3001/health

## 📦 Project Structure

```
hedge-fund-tracker/
├── apps/
│   ├── web/              # React frontend dashboard
│   ├── api/              # Hono backend API server
│   └── ingestion/        # SEC data ingestion service
├── packages/
│   ├── database/         # Database schema and migrations
│   ├── shared/           # Shared types and utilities
│   └── ui/               # Reusable UI components
├── scripts/              # Setup and utility scripts
├── docs/                 # Documentation
└── README.md
```

## 🔧 Development

### Key Commands
```bash
# Development
npm run dev                    # Start all services
npm run build                  # Build all packages
npm run lint                   # Lint all code
npm run typecheck              # Type check all packages

# Database
npm run db:migrate             # Run database migrations
npm run db:seed                # Seed initial data
npm run db:studio              # Open database studio

# Data Ingestion
npm run ingest:latest          # Ingest recent filings
npm run ingest:fund -- <CIK>   # Ingest specific fund
```

### Environment Variables
```bash
# Database
DATABASE_URL=postgresql://localhost:5432/hedge_fund_tracker

# API Keys
OPENAI_API_KEY=your-openai-key
ANTHROPIC_API_KEY=your-anthropic-key
SEC_USER_AGENT=YourCompany your@email.com

# Application
JWT_SECRET=your-jwt-secret
NODE_ENV=development
```

## 📊 Data Sources

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

## 🤖 AI Features

### **Portfolio Analysis**
- Investment strategy assessment
- Risk concentration analysis
- Sector allocation review
- Performance metrics calculation

### **Security Analysis**
- Institutional ownership analysis
- Holder quality assessment
- Investment thesis validation
- Liquidity impact evaluation

### **Market Intelligence**
- Sector rotation trends
- Crowded trade identification
- Flow analysis and positioning
- Systemic risk assessment

## 🔐 Security

- JWT-based authentication with refresh tokens
- Session management with automatic expiration
- Password hashing with bcrypt
- Rate limiting on API endpoints
- Input validation and sanitization
- SQL injection prevention with parameterized queries

## 🚀 Deployment

### **Docker Deployment**
```bash
docker-compose up -d
```

### **Production Considerations**
- Configure SSL/TLS certificates
- Set up database backups
- Configure log aggregation
- Set up monitoring and alerting
- Configure CDN for static assets

## 📈 Performance

- Optimized database queries with proper indexing
- Redis caching for frequently accessed data
- Efficient pagination for large datasets
- WebSocket connections for real-time updates
- Image optimization and lazy loading

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- Check the [documentation](docs/) for detailed guides
- Report issues on GitHub Issues
- For questions, create a discussion thread

## 🎯 Use Cases

### **Investment Research**
- Track smart money movements
- Identify investment themes and trends
- Monitor position changes in real-time
- Analyze fund concentration and risk

### **Risk Management**
- Monitor systemic risk from crowded trades
- Track hedge fund exposure to specific securities
- Identify potential liquidation risks
- Assess market concentration levels

### **Market Intelligence**
- Understand institutional sentiment
- Track sector rotation patterns
- Identify emerging investment themes
- Monitor regulatory compliance

---

**Built with ❤️ for the financial community**

*Disclaimer: This application is for informational purposes only and does not constitute investment advice. Always conduct your own research and consult with financial professionals before making investment decisions.*
