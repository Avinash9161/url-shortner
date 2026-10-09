const redis = require("../redis");
const { pool } = require("../db");

// Redirects only do a fast HINCRBY. A background job flushes counts to Postgres.
async function recordClick(code) {
  try {
    await redis.hincrby("clicks", code, 1);
  } catch (err) {
    console.error("click record failed:", err.message);
  }
}

async function pendingClicks(code) {
  try {
    return Number((await redis.hget("clicks", code)) || 0);
  } catch {
    return 0;
  }
}

// RENAME is atomic, so clicks that arrive during the flush go into a fresh hash.
async function flushClicks() {
  try {
    await redis.rename("clicks", "clicks:flushing");
  } catch {
    return; // nothing to flush
  }
  const counts = await redis.hgetall("clicks:flushing");
  for (const [code, n] of Object.entries(counts)) {
    await pool.query("UPDATE urls SET click_count = click_count + $1 WHERE code = $2", [
      Number(n),
      code,
    ]);
  }
  await redis.del("clicks:flushing");
}

module.exports = { recordClick, pendingClicks, flushClicks };
