const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/shortener",
});

// Retries because Postgres may still be starting when the app boots.
async function init(retries = 10) {
  const sql = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
  for (let i = 0; i < retries; i++) {
    try {
      await pool.query(sql);
      return;
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
}

module.exports = { pool, init };
