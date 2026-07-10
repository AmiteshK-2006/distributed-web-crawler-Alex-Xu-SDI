# Distributed Web Crawler

A highly concurrent, distributed web crawler inspired by the architecture outlined in Alex Xu's *System Design Interview (Volume 1)*. Built with Node.js, Redis, PostgreSQL, and MinIO, this system is designed to traverse the web politely, avoid spider traps, and scale horizontally across multiple isolated worker nodes.

## System Architecture Overview

This project implements a decoupled, distributed architecture to handle high-throughput I/O operations without bottlenecking memory or network layers.

* **The URL Frontier:** A hybrid priority queue and politeness engine utilizing Redis Sorted Sets (`ZSET`) and Lists.
* **The Worker Pool:** Horizontally scaled Node.js workers that independently pull from domain-specific queues, process DOMs, and extract new links.
* **The Deduplicator:** An atomic pipeline utilizing a Redis Bloom Filter for instant URL-seen checks, and SHA-256 hashing against PostgreSQL to guarantee zero duplicate content storage.
* **The Storage Tier:** Decoupled metadata (PostgreSQL) and raw HTML blob storage (MinIO/S3).
* **Observability:** Full system metrics exposed via Prometheus and visualized in Grafana.

## Key Engineering Features

* **True Horizontal Scalability:** Workers share zero local state. All consensus, deduplication, and domain locking are coordinated via atomic operations in a centralized Redis cluster.
* **$O(\log N)$ Politeness Engine:** Enforces strict domain-level rate limiting (e.g., 2-second delay per host) using Redis distributed locks (`SET NX PX`) and a timestamp-scored Sorted Set to efficiently poll active domains.
* **Asynchronous Concurrency:** Single-threaded Node.js workers are supercharged with logical Promise pooling, allowing each container to process dozens of HTTP requests concurrently while waiting on I/O.
* **Graceful Shutdown:** Traps `SIGINT`/`SIGTERM` signals at the OS level to drain active tasks, finish pending database `INSERT`s, and close socket connections without corrupting MinIO storage.
* **Smart Prioritization:** Dynamically calculates crawl priority to favor deep internal links over external outbound links, preventing premature context-switching.
* **Robust Link Processing:** Includes URL canonicalization (lowercasing, stripping fragments/trailing slashes) and infinite-loop spider trap prevention via maximum depth and length thresholds.

## Tech Stack

* **Compute:** Node.js (with `undici` for optimized HTTP pooling and `cheerio` for DOM parsing)
* **Message Broker & Caching:** Redis Stack (RedisBloom, ZSETs, Lists)
* **Metadata Storage:** PostgreSQL 15
* **Content Storage:** MinIO (S3-Compatible Object Storage)
* **Observability:** Prometheus & Grafana
* **Orchestration:** Docker & Docker Compose

## Quick Start

### Prerequisites

* Docker and Docker Compose installed on your machine.

### Installation

1. Clone the repository:
```bash
git https://github.com/AmiteshK-2006/distributed-web-crawler-Inspired-by-Alex-Xu-s-SDI-Vol-1-.git
```

2. Spin up the cluster:
```bash
docker compose -f docker/docker-compose.yml up -d --build
```

3. The following services will boot automatically:
* **Worker Nodes:** 3 isolated Node.js instances
* **Frontier Router:** 1 dedicated routing process
* **Redis, PostgreSQL, & MinIO**
* **Prometheus:** `http://localhost:9090`
* **Grafana:** `http://localhost:3000`

### Configuration

You can modify the initial crawl targets and system behavior by editing the files in the `config/` directory before booting up the cluster:

* `config/seeds.json`: Define the starting URLs and their baseline priority.
* `config/crawler-config.json`: Adjust politeness delays, max URL lengths, and standard user agents.

## 🚧 Known Limitations & Future Work

While this system handles distributed processing efficiently, it currently has a few design trade-offs made for the sake of the MVP:

* **Bloom Filter False Positives:** The system currently relies entirely on `BF.ADD` for the URL-seen check. Because Bloom filters carry a small rate of false positives, some unseen URLs may be permanently dropped. In a production environment, this would be mitigated by using the Bloom filter as a first-pass check, falling back to a definitive PostgreSQL query if the filter returns `true`.
* **Static Scoring System:** The priority queue currently uses a basic heuristic (Internal vs. External links). A future iteration would implement a dynamic scoring algorithm computing the link's depth from the seed, historical domain trust, or basic PageRank metrics.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
