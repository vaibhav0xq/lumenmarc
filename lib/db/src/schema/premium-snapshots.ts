import { bigint, doublePrecision, index, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * One row per tokenized stock per snapshot tick (~60s): the Chainlink reference price,
 * the primary pool price and the resulting premium/discount. Powers premium history charts.
 */
export const premiumSnapshotsTable = pgTable(
  "premium_snapshots",
  {
    id: serial("id").primaryKey(),
    ticker: text("ticker").notNull(),
    t: timestamp("t", { withTimezone: true }).notNull(),
    referencePrice: doublePrecision("reference_price").notNull(),
    poolPrice: doublePrecision("pool_price"),
    premiumBps: doublePrecision("premium_bps"),
    feedState: text("feed_state").notNull(),
    pairAddress: text("pair_address"),
    liquidityUsd: doublePrecision("liquidity_usd"),
    blockNumber: bigint("block_number", { mode: "number" }).notNull(),
  },
  (table) => [
    index("premium_snapshots_ticker_t_idx").on(table.ticker, table.t),
    // Global "latest row" lookups (persist rate-limit) and retention pruning scan by time alone.
    index("premium_snapshots_t_idx").on(table.t),
  ],
);

export const insertPremiumSnapshotSchema = createInsertSchema(premiumSnapshotsTable).omit({ id: true });
export type InsertPremiumSnapshot = z.infer<typeof insertPremiumSnapshotSchema>;
export type PremiumSnapshot = typeof premiumSnapshotsTable.$inferSelect;
