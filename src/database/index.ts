import { SupabaseDatabaseAdapter } from "./adapter-supabase/src/index.js";
import path from "path";

export function initializeDatabase(dataDir: string) {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
    const db = new SupabaseDatabaseAdapter(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_KEY
    );
    return db;
  } else {
    throw new Error("SUPABASE_URL and SUPABASE_KEY environment variables are required");
  }
}
