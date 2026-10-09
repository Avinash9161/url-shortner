const express = require("express");
const path = require("path");
const api = require("./routes/api");
const redirect = require("./routes/redirect");

const app = express();
app.set("trust proxy", 1);
app.use(express.json({ limit: "10kb" }));
app.use(express.static(path.join(__dirname, "..", "public")));

app.get("/health", (req, res) => res.json({ status: "ok" }));
app.use("/api", api);
app.use("/", redirect);
app.use((req, res) => res.status(404).send("Not found"));

module.exports = app;
