const app = require("./app");
const { init } = require("./db");
const { flushClicks } = require("./services/analytics");

const PORT = process.env.PORT || 3000;

(async () => {
  await init();
  setInterval(() => flushClicks().catch((e) => console.error("flush failed:", e.message)), 10000);
  app.listen(PORT, () => console.log(`Listening on port ${PORT}`));
})().catch((err) => {
  console.error("Startup failed:", err);
  process.exit(1);
});
