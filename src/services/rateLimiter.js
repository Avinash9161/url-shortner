const redis = require("../redis");

// Fixed-window limiter: INCR a per-client counter, set the TTL on first hit.
// Trade-off: allows bursts at window edges (up to 2x limit). A sliding window
// (sorted set) or token bucket smooths that at the cost of more Redis work.
function rateLimit({ limit = 10, windowSeconds = 60 } = {}) {
  return async (req, res, next) => {
    const key = `rl:${req.ip}`;
    try {
      const count = await redis.incr(key);
      if (count === 1) await redis.expire(key, windowSeconds);
      const ttl = await redis.ttl(key);
      res.set("X-RateLimit-Limit", String(limit));
      res.set("X-RateLimit-Remaining", String(Math.max(0, limit - count)));
      if (count > limit) {
        res.set("Retry-After", String(Math.max(ttl, 1)));
        return res.status(429).json({ error: "Too many requests, slow down." });
      }
    } catch (err) {
      // Fail open: if Redis is down we'd rather serve traffic than block everyone.
      console.error("rate limiter error:", err.message);
    }
    next();
  };
}

module.exports = rateLimit;
