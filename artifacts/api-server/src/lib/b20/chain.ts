import { createPublicClient, fallback, http } from "viem";
import { base } from "viem/chains";
import { logger } from "../logger";

/** Public, keyless Base RPCs. Rate-limited; a keyed BASE_RPC_URL is preferred and goes first. */
const PUBLIC_BASE_RPCS = ["https://mainnet.base.org", "https://base-rpc.publicnode.com", "https://base.drpc.org", "https://1rpc.io/base"];

function resolveRpcUrls(): string[] {
  const configured = process.env["BASE_RPC_URL"]?.trim();
  if (configured) {
    logger.info("Using configured BASE_RPC_URL for Base mainnet reads (public RPCs as fallback)");
    return [configured, ...PUBLIC_BASE_RPCS];
  }
  logger.info({ rpcs: PUBLIC_BASE_RPCS }, "BASE_RPC_URL not set — using public Base RPCs (rate-limited)");
  return PUBLIC_BASE_RPCS;
}

function makeClient() {
  const transports = resolveRpcUrls().map((url) => http(url, { timeout: 15_000, retryCount: 1, retryDelay: 750 }));
  return createPublicClient({
    chain: base,
    transport: fallback(transports, { rank: false, retryCount: 2, retryDelay: 1_000 }),
    // Never split a multicall into many parallel eth_calls — public RPCs rate-limit per request.
    batch: { multicall: { wait: 16, batchSize: 0 } },
  });
}

export type BaseClient = ReturnType<typeof makeClient>;

let client: BaseClient | undefined;

/** Shared viem client for Base mainnet. Multicall is batched automatically. */
export function getBaseClient(): BaseClient {
  if (!client) client = makeClient();
  return client;
}
