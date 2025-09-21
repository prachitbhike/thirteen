CREATE TABLE IF NOT EXISTS fund_managers (
  id serial PRIMARY KEY,
  cik varchar(10) NOT NULL UNIQUE,
  name varchar(255) NOT NULL,
  address text,
  phone varchar(20),
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);
-->statement-breakpoint

CREATE TABLE IF NOT EXISTS securities (
  id serial PRIMARY KEY,
  cusip varchar(9) NOT NULL UNIQUE,
  ticker varchar(10),
  company_name varchar(255) NOT NULL,
  security_type varchar(50),
  sector varchar(100),
  industry varchar(100),
  created_at timestamp DEFAULT now()
);
-->statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_securities_ticker ON securities(ticker);
-->statement-breakpoint

CREATE TABLE IF NOT EXISTS filings (
  id serial PRIMARY KEY,
  fund_manager_id integer NOT NULL REFERENCES fund_managers(id),
  filing_date date NOT NULL,
  period_end_date date NOT NULL,
  form_type varchar(10) DEFAULT '13F-HR',
  total_value bigint,
  total_positions integer,
  filing_url varchar(500),
  processed_at timestamp,
  created_at timestamp DEFAULT now()
);
-->statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_filings_period ON filings(period_end_date);
-->statement-breakpoint

CREATE TABLE IF NOT EXISTS holdings (
  id serial PRIMARY KEY,
  filing_id integer NOT NULL REFERENCES filings(id),
  security_id integer NOT NULL REFERENCES securities(id),
  fund_manager_id integer NOT NULL REFERENCES fund_managers(id),
  period_end_date date NOT NULL,
  shares_held bigint NOT NULL,
  market_value bigint NOT NULL,
  percent_of_portfolio numeric(5, 2),
  investment_discretion varchar(20),
  voting_authority varchar(20),
  created_at timestamp DEFAULT now()
);
-->statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_holdings_fund_period ON holdings(fund_manager_id, period_end_date);
-->statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_holdings_security ON holdings(security_id);
-->statement-breakpoint

CREATE TABLE IF NOT EXISTS position_changes (
  id serial PRIMARY KEY,
  fund_manager_id integer NOT NULL REFERENCES fund_managers(id),
  security_id integer NOT NULL REFERENCES securities(id),
  from_period date NOT NULL,
  to_period date NOT NULL,
  shares_change bigint,
  value_change bigint,
  percent_change numeric(8, 2),
  change_type varchar(20),
  created_at timestamp DEFAULT now()
);
-->statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_position_changes_fund ON position_changes(fund_manager_id, to_period);
-->statement-breakpoint

CREATE TABLE IF NOT EXISTS analysis_cache (
  id serial PRIMARY KEY,
  fund_manager_id integer NOT NULL REFERENCES fund_managers(id),
  period_end_date date,
  analysis_type varchar(50),
  analysis_result jsonb,
  created_at timestamp DEFAULT now(),
  expires_at timestamp
);
-->statement-breakpoint

CREATE TABLE IF NOT EXISTS users (
  id serial PRIMARY KEY,
  email varchar(255) NOT NULL,
  username varchar(50),
  full_name varchar(255),
  hashed_password varchar(255),
  email_verified boolean DEFAULT false,
  is_active boolean DEFAULT true,
  last_login_at timestamp,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now(),
  CONSTRAINT users_email_unique UNIQUE (email),
  CONSTRAINT users_username_unique UNIQUE (username)
);
-->statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
-->statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
-->statement-breakpoint

CREATE TABLE IF NOT EXISTS user_tracked_funds (
  id serial PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users(id),
  fund_manager_id integer NOT NULL REFERENCES fund_managers(id),
  created_at timestamp DEFAULT now(),
  CONSTRAINT user_tracked_funds_user_fund_unique UNIQUE (user_id, fund_manager_id)
);
-->statement-breakpoint

CREATE TABLE IF NOT EXISTS sessions (
  id serial PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_token varchar(255) NOT NULL UNIQUE,
  expires_at timestamp NOT NULL,
  created_at timestamp DEFAULT now()
);
-->statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(session_token);
-->statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
-->statement-breakpoint

CREATE TABLE IF NOT EXISTS user_preferences (
  id serial PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  dashboard_layout jsonb,
  notifications jsonb,
  theme varchar(20) DEFAULT 'light',
  timezone varchar(50) DEFAULT 'UTC',
  currency varchar(3) DEFAULT 'USD',
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);
-->statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);
-->statement-breakpoint

CREATE TABLE IF NOT EXISTS user_watchlists (
  id serial PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name varchar(100) NOT NULL,
  description text,
  is_default boolean DEFAULT false,
  is_public boolean DEFAULT false,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);
-->statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_user_watchlists_user_id ON user_watchlists(user_id);
-->statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_watchlists_user_default ON user_watchlists(user_id) WHERE is_default;
-->statement-breakpoint

CREATE TABLE IF NOT EXISTS watchlist_funds (
  id serial PRIMARY KEY,
  watchlist_id integer NOT NULL REFERENCES user_watchlists(id) ON DELETE CASCADE,
  fund_manager_id integer NOT NULL REFERENCES fund_managers(id),
  added_at timestamp DEFAULT now(),
  notes text,
  CONSTRAINT watchlist_funds_unique UNIQUE (watchlist_id, fund_manager_id)
);
-->statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_watchlist_funds_watchlist_id ON watchlist_funds(watchlist_id);
-->statement-breakpoint

CREATE TABLE IF NOT EXISTS user_alerts (
  id serial PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  alert_type varchar(50) NOT NULL,
  entity_type varchar(20) NOT NULL,
  entity_id integer NOT NULL,
  conditions jsonb NOT NULL,
  is_active boolean DEFAULT true,
  last_triggered timestamp,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);
-->statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_user_alerts_user_id ON user_alerts(user_id);
-->statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_user_alerts_entity ON user_alerts(entity_type, entity_id);
-->statement-breakpoint

CREATE TABLE IF NOT EXISTS alert_notifications (
  id serial PRIMARY KEY,
  alert_id integer NOT NULL REFERENCES user_alerts(id) ON DELETE CASCADE,
  user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title varchar(255) NOT NULL,
  message text NOT NULL,
  data jsonb,
  is_read boolean DEFAULT false,
  read_at timestamp,
  sent_at timestamp DEFAULT now(),
  delivery_method varchar(20) DEFAULT 'in_app'
);
-->statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_alert_notifications_user_id ON alert_notifications(user_id);
-->statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_alert_notifications_is_read ON alert_notifications(is_read);
-->statement-breakpoint

CREATE TABLE IF NOT EXISTS user_activity (
  id serial PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action varchar(100) NOT NULL,
  entity_type varchar(50),
  entity_id integer,
  metadata jsonb,
  ip_address varchar(45),
  user_agent text,
  created_at timestamp DEFAULT now()
);
-->statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_user_activity_user_id ON user_activity(user_id);
-->statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_user_activity_action ON user_activity(action);
-->statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_user_activity_created_at ON user_activity(created_at);
-->statement-breakpoint
