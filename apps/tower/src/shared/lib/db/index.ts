import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./auth-schema";

function resolveDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (url) {
    return url;
  }
  if (process.env.VERCEL_ENV === "production") {
    throw new Error("DATABASE_URL is required in production (Vercel).");
  }
  // Local `next build` / CI: no real DB connection happens during the build.
  return "postgresql://placeholder:placeholder@127.0.0.1:5432/placeholder";
}

const sql = neon(resolveDatabaseUrl());

export const db = drizzle(sql, { schema });
