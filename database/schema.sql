-- Table to record metadata and maintain state history
CREATE TABLE IF NOT EXISTS crawl_history (
    id SERIAL PRIMARY KEY,
    url TEXT UNIQUE NOT NULL,
    content_hash VARCHAR(64) NOT NULL,
    crawled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    http_status INTEGER NOT NULL
);

-- Indexing
CREATE INDEX IF NOT EXISTS idx_crawl_history_hash ON crawl_history(content_hash);