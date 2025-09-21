-- Insert sample fund managers
INSERT INTO fund_managers (cik, name, address, phone) VALUES
('0001067983', 'Berkshire Hathaway Inc', '1440 Kiewit Plaza, Omaha, NE 68131', '(402) 346-1400'),
('0001364742', 'BlackRock Inc.', '55 East 52nd Street, New York, NY 10055', '(212) 810-5300'),
('0001104659', 'Vanguard Group Inc', '100 Vanguard Blvd, Malvern, PA 19355', '(610) 648-6000'),
('0000093751', 'State Street Corp', 'State Street Financial Center, Boston, MA 02111', '(617) 786-3000'),
('0001346610', 'Fidelity Management & Research Company LLC', '245 Summer Street, Boston, MA 02210', '(617) 563-7000');

-- Insert sample securities
INSERT INTO securities (cusip, ticker, company_name, security_type, sector, industry) VALUES
('037833100', 'AAPL', 'Apple Inc.', 'Common Stock', 'Technology', 'Consumer Electronics'),
('594918104', 'MSFT', 'Microsoft Corporation', 'Common Stock', 'Technology', 'Software'),
('02079K305', 'GOOGL', 'Alphabet Inc. Class A', 'Common Stock', 'Technology', 'Internet Services'),
('88160R101', 'TSLA', 'Tesla, Inc.', 'Common Stock', 'Consumer Discretionary', 'Automobiles'),
('023135106', 'AMZN', 'Amazon.com, Inc.', 'Common Stock', 'Consumer Discretionary', 'Internet Retail'),
('059428107', 'BAC', 'Bank of America Corporation', 'Common Stock', 'Financials', 'Banking'),
('166764100', 'CVX', 'Chevron Corporation', 'Common Stock', 'Energy', 'Oil & Gas'),
('191216100', 'KO', 'The Coca-Cola Company', 'Common Stock', 'Consumer Staples', 'Beverages'),
('377090104', 'WFC', 'Wells Fargo & Company', 'Common Stock', 'Financials', 'Banking'),
('46625H100', 'JPM', 'JPMorgan Chase & Co.', 'Common Stock', 'Financials', 'Banking');

-- Insert sample filings for Q2 2024
INSERT INTO filings (fund_manager_id, filing_date, period_end_date, total_value, total_positions) VALUES
(1, '2024-08-14', '2024-06-30', 50000000000000, 45), -- Berkshire Hathaway
(2, '2024-08-15', '2024-06-30', 40000000000000, 234), -- BlackRock
(3, '2024-08-13', '2024-06-30', 35000000000000, 156), -- Vanguard
(4, '2024-08-12', '2024-06-30', 28000000000000, 189), -- State Street
(5, '2024-08-16', '2024-06-30', 25000000000000, 145); -- Fidelity

-- Insert sample holdings (values in cents)
-- Berkshire Hathaway holdings
INSERT INTO holdings (filing_id, security_id, fund_manager_id, period_end_date, shares_held, market_value, percent_of_portfolio) VALUES
(1, 1, 1, '2024-06-30', 915560000, 17400000000000, 34.8), -- AAPL
(1, 6, 1, '2024-06-30', 1032720000, 4100000000000, 8.2), -- BAC
(1, 7, 1, '2024-06-30', 123100000, 1850000000000, 3.7), -- CVX
(1, 8, 1, '2024-06-30', 400000000, 2500000000000, 5.0); -- KO

-- BlackRock holdings (more diversified)
INSERT INTO holdings (filing_id, security_id, fund_manager_id, period_end_date, shares_held, market_value, percent_of_portfolio) VALUES
(2, 1, 2, '2024-06-30', 645000000, 12250000000000, 30.6), -- AAPL
(2, 2, 2, '2024-06-30', 234000000, 9800000000000, 24.5), -- MSFT
(2, 3, 2, '2024-06-30', 156000000, 2800000000000, 7.0), -- GOOGL
(2, 4, 2, '2024-06-30', 45000000, 1150000000000, 2.9), -- TSLA
(2, 5, 2, '2024-06-30', 78000000, 1400000000000, 3.5); -- AMZN

-- Vanguard holdings
INSERT INTO holdings (filing_id, security_id, fund_manager_id, period_end_date, shares_held, market_value, percent_of_portfolio) VALUES
(3, 1, 3, '2024-06-30', 567000000, 10800000000000, 30.9), -- AAPL
(3, 2, 3, '2024-06-30', 189000000, 7900000000000, 22.6), -- MSFT
(3, 5, 3, '2024-06-30', 67000000, 1200000000000, 3.4), -- AMZN
(3, 6, 3, '2024-06-30', 234000000, 930000000000, 2.7); -- BAC

-- Insert sample position changes
INSERT INTO position_changes (fund_manager_id, security_id, from_period, to_period, shares_change, value_change, percent_change, change_type) VALUES
(1, 1, '2024-03-31', '2024-06-30', -45000000, -1200000000000, -6.5, 'DECREASED'), -- Berkshire reduced AAPL
(1, 7, '2024-03-31', '2024-06-30', 123100000, 1850000000000, 100.0, 'NEW'), -- Berkshire new CVX position
(2, 4, '2024-03-31', '2024-06-30', 15000000, 385000000000, 50.0, 'INCREASED'), -- BlackRock increased TSLA
(3, 5, '2024-03-31', '2024-06-30', 12000000, 215000000000, 21.7, 'INCREASED'); -- Vanguard increased AMZN