/**
 * Serverless entry (Vercel Build Output API). No `listen()` and no background worker: the
 * snapshot module runs in on-demand mode and Vercel's CDN caches the read endpoints.
 * The Express app is itself a `(req, res)` handler, which is exactly what the Node runtime expects.
 */
import app from "./app";

export default app;
