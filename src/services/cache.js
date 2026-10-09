const redis = require("../redis");
const DEFAULT_TTL = 3600; // seconds

async function get(code) {
  try {
    return await redis.get(`url:${code}`);
  } catch (err) {
    console.error("cache get failed:", err.message);
    return null; // fall back to the database
  }
}

async function set(code, longUrl, ttl = DEFAULT_TTL) {
  try {
    await redis.set(`url:${code}`, longUrl, "EX", Math.max(1, Math.min(ttl, DEFAULT_TTL)));
  } catch (err) {
    console.error("cache set failed:", err.message);
  }
}

module.exports = { get, set };
