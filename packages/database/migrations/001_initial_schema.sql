-- Create extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Authentication tables
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  email_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) NOT NULL,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Core 13F data tables
CREATE TABLE fund_managers (
  id SERIAL PRIMARY KEY,
  cik VARCHAR(10) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  address TEXT,
  phone VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE securities (
  id SERIAL PRIMARY KEY,
  cusip VARCHAR(9) UNIQUE NOT NULL,
  ticker VARCHAR(10),
  company_name VARCHAR(255) NOT NULL,
  security_type VARCHAR(50),
  sector VARCHAR(100),
  industry VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE filings (
  id SERIAL PRIMARY KEY,
  fund_manager_id INTEGER REFERENCES fund_managers(id) NOT NULL,
  filing_date DATE NOT NULL,
  period_end_date DATE NOT NULL,
  form_type VARCHAR(10) DEFAULT '13F-HR',
  total_value BIGINT,
  total_positions INTEGER,
  filing_url VARCHAR(500),
  processed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE holdings (
  id SERIAL PRIMARY KEY,
  filing_id INTEGER REFERENCES filings(id) NOT NULL,
  security_id INTEGER REFERENCES securities(id) NOT NULL,
  fund_manager_id INTEGER REFERENCES fund_managers(id) NOT NULL,
  period_end_date DATE NOT NULL,
  shares_held BIGINT NOT NULL,
  market_value BIGINT NOT NULL, -- in USD cents
  percent_of_portfolio DECIMAL(5,2),
  investment_discretion VARCHAR(20),
  voting_authority VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE position_changes (
  id SERIAL PRIMARY KEY,
  fund_manager_id INTEGER REFERENCES fund_managers(id) NOT NULL,
  security_id INTEGER REFERENCES securities(id) NOT NULL,
  from_period DATE NOT NULL,
  to_period DATE NOT NULL,
  shares_change BIGINT,
  value_change BIGINT,
  percent_change DECIMAL(8,2),
  change_type VARCHAR(20), -- 'NEW', 'SOLD', 'INCREASED', 'DECREASED'
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE user_tracked_funds (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) NOT NULL,
  fund_manager_id INTEGER REFERENCES fund_managers(id) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, fund_manager_id)
);

CREATE TABLE analysis_cache (
  id SERIAL PRIMARY KEY,
  fund_manager_id INTEGER REFERENCES fund_managers(id) NOT NULL,
  period_end_date DATE,
  analysis_type VARCHAR(50),
  analysis_result JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_securities_ticker ON securities(ticker);
CREATE INDEX idx_filings_period ON filings(period_end_date);
CREATE INDEX idx_holdings_fund_period ON holdings(fund_manager_id, period_end_date);
CREATE INDEX idx_holdings_security ON holdings(security_id);
CREATE INDEX idx_position_changes_fund ON position_changes(fund_manager_id, to_period);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add trigger to fund_managers table
CREATE TRIGGER update_fund_managers_updated_at
    BEFORE UPDATE ON fund_managers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add trigger to users table
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();