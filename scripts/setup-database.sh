#!/bin/bash

# Hedge Fund Tracker Database Setup Script

set -e

echo "🚀 Setting up Hedge Fund Tracker database..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Start PostgreSQL container
echo "📦 Starting PostgreSQL container..."
docker-compose up -d postgres

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
timeout 60 bash -c 'until docker-compose exec postgres pg_isready -U postgres; do sleep 2; done'

if [ $? -eq 0 ]; then
    echo "✅ PostgreSQL is ready!"
else
    echo "❌ PostgreSQL failed to start within 60 seconds"
    exit 1
fi

# Run database migrations
echo "🔄 Running database migrations..."
npm run db:migrate

echo "✅ Database setup complete!"
echo ""
echo "🎯 Next steps:"
echo "  1. Copy .env.example to .env and configure your settings"
echo "  2. Run 'npm install' to install dependencies"
echo "  3. Run 'npm run dev' to start the development servers"
echo ""
echo "🔗 Database connection:"
echo "  URL: postgresql://postgres:postgres@localhost:5432/hedge_fund_tracker"