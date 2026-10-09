const express = require("express");
const { pool } = require("../db");
const cache = require("../services/cache");
const { recordClick } = require("../services/analytics");

const router = express.Router();

router.get("/:code", async (req, res, next) => {
  const { code } = req.params;
  if (!/^[A-Za-z0-9_-]{1,32}$/.test(code)) return next();

  try {
    // 1. Cache-aside: try Redis first
    let longUrl = await cache.get(code);

    // 2. Miss: read from Postgres (ignoring expired links), then populate cache
    if (!longUrl) {
      const { rows } = await pool.query(
        `SELECT long_url, expires_at FROM urls
         WHERE code = $1 AND (expires_at IS NULL OR expires_at > now())`,
        [code]
      );
      if (!rows.length) return res.status(404).send("Link not found or expired");
      longUrl = rows[0].long_url;
      const ttl = rows[0].expires_at
        ? Math.floor((new Date(rows[0].expires_at) - Date.now()) / 1000)
        : undefined;
      await cache.set(code, longUrl, ttl);
    }

    recordClick(code); // fire and forget: don't slow the redirect
    // 302 (not 301) so browsers don't cache it and every click is counted.
    res.redirect(302, longUrl);
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal error");
  }
});

module.exports = router;
