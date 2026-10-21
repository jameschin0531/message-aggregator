import express from "express";
import path from "node:path";
import { api } from "./routes/index.js";

export function createApp() {
  const app = express();
  app.use(express.json({ limit: "5mb" }));
  app.get("/health", (_req, res) => void res.json({ ok: true }));
  app.use("/api", api);

  // In the container the API also serves the built inbox, so one always-on service is enough.
  const webDist = process.env.WEB_DIST;
  if (webDist) {
    app.use(express.static(webDist));
    app.get(/^\/(?!api\/).*/, (_req, res) => res.sendFile(path.resolve(webDist, "index.html")));
  }
  return app;
}
