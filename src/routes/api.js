const express = require("express");
const { pool } = require("../db");
const { encode } = require("../services/codeGenerator");
const { validateUrl, validateAlias } = require("../services/validate");
const { pendingClicks } = require("../services/analytics");
const rateLimit = require("../services/rateLimiter");

const router = express.Router();
const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

router.post(
  "/shorten",
  rateLimit({
    limit: Number(process.env.RATE_LIMIT || 10),
    windowSeconds: Number(process.env.RATE_WINDOW || 60),
  }),
  async (req, res) => {
    try {
      const { url, alias, ttlSeconds } = req.body || {};
      const longUrl = validateUrl(url, new URL(BASE_URL).host);
      if (alias !== undefined) validateAlias(alias);
      if (ttlSeconds !== undefined && (!Number.isInteger(ttlSeconds) || ttlSeconds < 1)) {
        throw new Error("ttlSeconds must be a positive integer");
      }

      const { rows } = await pool.query("SELECT nextval('url_id_seq') AS id");
      const id = rows[0].id;
      const code = alias || encode(id);
      const expiresAt = ttlSeconds ? new Date(Date.now() + ttlSeconds * 1000) : null;

      await pool.query(
        "INSERT INTO urls (id, code, long_url, expires_at) VALUES ($1, $2, $3, $4)",
        [id, code, longUrl, expiresAt]
      );
      res.status(201).json({ code, shortUrl: `${BASE_URL}/${code}`, longUrl, expiresAt });
    } catch (err) {
      if (err.code === "23505") return res.status(409).json({ error: "alias already taken" });
      if (err.code) {
        console.error(err);
        return res.status(500).json({ error: "internal error" });
      }
      res.status(400).json({ error: err.message });
    }
  }
);

router.get("/stats/:code", async (req, res) => {
  const { rows } = await pool.query(
    "SELECT code, long_url, created_at, expires_at, click_count FROM urls WHERE code = $1",
    [req.params.code]
  );
  if (!rows.length) return res.status(404).json({ error: "not found" });
  const r = rows[0];
  const pending = await pendingClicks(r.code);
  res.json({
    code: r.code,
    longUrl: r.long_url,
    createdAt: r.created_at,
    expiresAt: r.expires_at,
    clicks: Number(r.click_count) + pending,
  });
});

module.exports = router;
