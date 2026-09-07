import express, { type Express, type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

// Unknown API paths answer JSON, never Express's HTML "Cannot GET" page.
app.use("/api", (req: Request, res: Response) => {
  res.status(404).json({ error: `No API route for ${req.method} ${req.originalUrl.split("?")[0]}`, code: "not_found" });
});

// Explicit JSON failures instead of Express's HTML 500 page: the UI surfaces `error` verbatim.
app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
  const message = err instanceof Error ? err.message : String(err);
  req.log?.error({ err }, "Unhandled request error");
  if (res.headersSent) return;
  res.status(500).json({ error: `Internal error: ${message}`, code: "internal_error" });
});

export default app;
