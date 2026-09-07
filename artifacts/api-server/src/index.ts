import app from "./app";
import { logger } from "./lib/logger";
import { startSnapshotWorker } from "./lib/snapshot/worker";

// PORT is injected by the hosting environment (Replit, a VM, a container); 8080 is the local default.
const rawPort = process.env["PORT"] ?? "8080";
const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
  startSnapshotWorker();
});
