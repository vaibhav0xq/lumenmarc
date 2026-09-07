import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

export type Db = NodePgDatabase<typeof schema>;

const databaseUrl = process.env.DATABASE_URL?.trim();

/**
 * Postgres is optional: it only backs the premium-history series. When
 * DATABASE_URL is unset the app still serves live labels, checks and
 * portfolios; history endpoints reply with an explicit "history disabled"
 * error instead of pretending the series is empty.
 */
export const dbConfigured: boolean = Boolean(databaseUrl);

export const pool: pg.Pool | null = databaseUrl
  ? new Pool({
      connectionString: databaseUrl,
      // Serverless-friendly: the app needs at most one connection per in-flight request, so keep the
      // per-instance pool tiny and release idle connections quickly. On Vercel + Neon, use the pooled
      // ("-pooler") connection string so many instances share Neon's PgBouncer rather than raw slots.
      max: 3,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 5_000,
    })
  : null;

export const db: Db | null = pool ? drizzle(pool, { schema }) : null;

export class DatabaseNotConfiguredError extends Error {
  readonly code = "history_disabled";
  constructor() {
    super("Premium history is disabled on this deployment: DATABASE_URL is not set.");
    this.name = "DatabaseNotConfiguredError";
  }
}

/** Returns the database handle or throws a typed, user-presentable error. */
export function requireDb(): Db {
  if (!db) throw new DatabaseNotConfiguredError();
  return db;
}

export * from "./schema";
