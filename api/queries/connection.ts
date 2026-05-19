import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { env } from "../lib/env";
import * as schema from "@db/schema";
import * as relations from "@db/relations";

const fullSchema = { ...schema, ...relations };
let instance: ReturnType<typeof drizzle<typeof fullSchema>>;

export function getDb() {
  if (!instance) {
    // Filess.io는 포트 3307, SSL 필요
    const url = new URL(env.databaseUrl);
    const pool = mysql.createPool({
      host: url.hostname,
      port: parseInt(url.port || "3306"),
      user: url.username,
      password: url.password,
      database: url.pathname.replace("/", ""),
      ssl: { rejectUnauthorized: false },
      waitForConnections: true,
      connectionLimit: 3,
    });
    instance = drizzle(pool, { schema: fullSchema, mode: "default" });
  }
  return instance;
}
