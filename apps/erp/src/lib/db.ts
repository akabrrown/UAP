import { Pool } from "pg";

const globalForPg = global as unknown as { pgPool: Pool };

export const db =
  globalForPg.pgPool ||
  new Pool({
    connectionString: process.env.DATABASE_URL || "postgres://postgres@127.0.0.1:54329/uap",
  });

if (process.env.NODE_ENV !== "production") globalForPg.pgPool = db;
