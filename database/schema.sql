-- Create crawl_history table
CREATE TABLE IF NOT EXISTS crawl_history (
    id SERIAL PRIMARY KEY,
    url TEXT UNIQUE NOT NULL,
    content_hash VARCHAR(64) NOT NULL,
    http_status INTEGER DEFAULT 200,
    crawled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_content_hash ON crawl_history(content_hash);
CREATE INDEX IF NOT EXISTS idx_crawled_at ON crawl_history(crawled_at);

-- Create seeds table (optional, for tracking starting URLs)
CREATE TABLE IF NOT EXISTS seeds (
    id SERIAL PRIMARY KEY,
    url TEXT UNIQUE NOT NULL,
    priority INTEGER DEFAULT 10,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Grants to crawler_user
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO crawler_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO crawler_user;