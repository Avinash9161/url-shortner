# URL Shortener

A URL shortener built for scale discussions: base62 IDs, Redis cache-aside, rate limiting, and asynchronous click analytics.

**Stack:** Node.js (Express) · PostgreSQL · Redis · Docker

## Run it

```bash
docker compose up --build
```

Open http://localhost:3000 for the UI, or use the API:

```bash
# create
curl -X POST localhost:3000/api/shorten -H "Content-Type: application/json" \
  -d '{"url":"https://example.com/a/very/long/path"}'

# custom alias + expiry (seconds)
curl -X POST localhost:3000/api/shorten -H "Content-Type: application/json" \
  -d '{"url":"https://example.com","alias":"my-link","ttlSeconds":3600}'

# redirect
curl -i localhost:3000/my-link

# stats
curl localhost:3000/api/stats/my-link
```

Try the rate limiter: run the create command 11 times within a minute and you get `429`.

Run tests: `npm install && npm test`

## Architecture

```
Client ──> Express ──> Redis (cache, rate limits, click counters)
                  └──> PostgreSQL (source of truth)
```

**Create:** validate URL -> `nextval` from a Postgres sequence -> base62-encode -> insert.
**Redirect:** Redis lookup -> on miss, query Postgres and populate cache -> `302`.
**Analytics:** each redirect does `HINCRBY` in Redis; a job flushes counts to Postgres every 10 s.

## Design decisions and trade-offs

| Decision | Why | Trade-off |
|---|---|---|
| Base62 of a unique ID | No collisions, no retry loop, short codes | Codes are guessable/sequential. Fix: shuffle the alphabet or XOR the ID with a secret. |
| Sequence starts at 100,000,000 | Codes are at least 5 chars | Wastes a small part of the key space |
| Cache-aside with 1 h TTL | Reads dominate writes; most redirects skip the DB | Stale data until TTL; expiry-aware TTL handles expiring links |
| `302` instead of `301` | Browsers don't cache it, so every click is counted | More server load than a `301` |
| Fixed-window rate limiter | Two Redis commands, easy to reason about | Bursts up to 2x the limit at window edges. Upgrade: sliding window or token bucket. |
| Fail open on Redis errors | Redis outage doesn't take the service down | Rate limiting is disabled during the outage |
| Async click counting | Redirect latency stays low | Up to ~10 s of lag; counts can be lost if Redis crashes between flushes |

## Scaling to 100M+ links (interview answers)

- **Reads:** add Postgres read replicas, run several app instances behind a load balancer, and put a CDN in front for hot links.
- **Cache:** Redis Cluster, sharded by code.
- **Writes/IDs:** replace the single sequence with range allocation (each app server reserves a block of IDs) or a Snowflake-style generator.
- **Storage:** shard `urls` by `code`; archive expired rows.
- **Analytics:** send click events to Kafka and aggregate in a separate service instead of Redis counters.

## Ideas to extend

Per-user accounts and API keys, QR codes, click geography/referrer breakdown, a sliding-window limiter, Prometheus metrics, GitHub Actions CI.
website: https://url-shortner-e1xn.onrender.com
