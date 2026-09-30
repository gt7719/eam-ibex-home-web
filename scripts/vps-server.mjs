#!/usr/bin/env node
import { join } from "node:path";
import { startProdServer } from "vinext/server/prod-server";
import { validateVpsEnvironment } from "./vps-env.mjs";

validateVpsEnvironment();

const port = Number.parseInt(process.env.PORT || "3000", 10);
const host = process.env.HOST || "0.0.0.0";
const shutdownTimeout = Number.parseInt(process.env.SHUTDOWN_TIMEOUT_MS || "10000", 10);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT must be an integer between 1 and 65535.");
}

const { server } = await startProdServer({
  port,
  host,
  outDir: join(import.meta.dirname, "dist"),
});

let shuttingDown = false;
async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[ibex] ${signal} received; draining HTTP connections.`);

  const forcedExit = setTimeout(() => {
    console.error("[ibex] Graceful shutdown timed out.");
    server.closeAllConnections?.();
    process.exit(1);
  }, shutdownTimeout);
  forcedExit.unref();

  server.closeIdleConnections?.();
  server.close((error) => {
    clearTimeout(forcedExit);
    if (error) {
      console.error("[ibex] HTTP server shutdown failed.", error);
      process.exit(1);
    }
    console.log("[ibex] HTTP server stopped cleanly.");
    process.exit(0);
  });
}

process.once("SIGTERM", () => void shutdown("SIGTERM"));
process.once("SIGINT", () => void shutdown("SIGINT"));

process.on("unhandledRejection", (error) => {
  console.error("[ibex] Unhandled promise rejection.", error);
});

process.on("uncaughtException", (error) => {
  console.error("[ibex] Uncaught exception.", error);
  void shutdown("uncaughtException");
});
