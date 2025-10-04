import { drizzle } from "drizzle-orm/bun-sqlite";
import { Database } from "bun:sqlite";

const sqlite = new Database("softball.sqlite");
export const db = drizzle(sqlite);
