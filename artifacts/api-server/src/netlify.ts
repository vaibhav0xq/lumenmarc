/**
 * Serverless entry (Netlify Functions). The same Express app as the Vercel entry, wrapped with
 * serverless-http because Netlify's Node functions receive a Lambda-style event instead of Node's
 * (req, res) pair. No `listen()` and no background worker: the snapshot module runs in on-demand mode.
 *
 * netlify.toml rewrites /api/* to this function and the function receives the original /api path.
 * A direct call to /.netlify/functions/api/* is normalised to the same shape so both work.
 */
import serverless from "serverless-http";
import app from "./app";

const FUNCTION_PREFIX = "/.netlify/functions/api";

export const handler = serverless(app, {
  request(request: { url: string }) {
    if (request.url.startsWith(FUNCTION_PREFIX)) {
      const rest = request.url.slice(FUNCTION_PREFIX.length);
      request.url = `/api${rest === "" || rest.startsWith("/") || rest.startsWith("?") ? rest : `/${rest}`}`;
    }
  },
});
