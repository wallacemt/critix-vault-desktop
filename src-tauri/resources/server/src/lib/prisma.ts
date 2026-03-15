// This module is server-only and must never be imported in client components.
// We use the 'server-only' sentinel instead of "use server" because "use server"
// at file scope marks every export as a Server Action, which causes Turbopack to
// aggressively trace all dynamic fs.* call paths → producing overly-broad file
// patterns that match tens of thousands of files and inflate build time.
import "server-only";
/**
 * Prisma Client Instance
 * Configured with better-sqlite3 adapter for optimal performance
 */

import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "path";
import fs from "fs";

// Get the app data directory for storing the database
const getDbPath = () => {
  // In production, use CRITIX_DATA_DIR or DATABASE_URL set by the Tauri backend
  if (process.env.CRITIX_DATA_DIR) {
    return path.join(process.env.CRITIX_DATA_DIR, "critix.db");
  }

  if (process.env.DATABASE_URL) {
    const url = process.env.DATABASE_URL;
    // Strip "file:" prefix if present
    return url.startsWith("file:") ? url.slice(5) : url;
  }

  // Fallback for development
  return path.join(process.cwd(), "prisma", "critix.db");
};

// Run migration SQL files to initialize the database schema
const initializeDatabase = (dbFilePath: string) => {
  try {
    // Find the prisma/migrations directory
    const possibleMigrationDirs = [
      process.env.CRITIX_DATA_DIR ? path.join(process.env.CRITIX_DATA_DIR, "prisma", "migrations") : null,
      path.join(process.cwd(), "prisma", "migrations"),
    ].filter(Boolean) as string[];

    let migrationsDir: string | null = null;
    for (const dir of possibleMigrationDirs) {
      if (fs.existsSync(dir)) {
        migrationsDir = dir;
        break;
      }
    }

    if (!migrationsDir) {
      console.warn("⚠️ Migrations directory not found, skipping DB initialization");
      return;
    }

    // Assign to a non-nullable const so Turbopack doesn't see a 'null/' path pattern
    const mdir: string = migrationsDir;

    // Use better-sqlite3 directly to run migrations
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Database = require("better-sqlite3");
    const db = new Database(dbFilePath);

    // Create migrations tracking table
    db.exec(`CREATE TABLE IF NOT EXISTS _prisma_migrations (
      id TEXT PRIMARY KEY,
      checksum TEXT NOT NULL,
      finished_at TEXT,
      migration_name TEXT NOT NULL,
      logs TEXT,
      rolled_back_at TEXT,
      started_at TEXT NOT NULL DEFAULT (datetime('now')),
      applied_steps_count INTEGER NOT NULL DEFAULT 0
    )`);

    // Get already applied migrations
    const applied = new Set(
      db
        .prepare("SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL")
        .all()
        .map((row: { migration_name: string }) => row.migration_name),
    );

    // Read and apply migration directories in order
    const migrationFolders = fs
      .readdirSync(mdir)
      .filter((f: string) => {
        try {
          return fs.statSync(path.join(mdir, f)).isDirectory();
        } catch {
          return false;
        }
      })
      .sort();

    for (const folder of migrationFolders) {
      if (applied.has(folder)) continue;

      const sqlFile = path.join(mdir, folder, "migration.sql");
      if (!fs.existsSync(sqlFile)) continue;

      const sql = fs.readFileSync(sqlFile, "utf-8");
      console.log(`📦 Applying migration: ${folder}`);

      try {
        db.exec(sql);
        db.prepare(
          "INSERT INTO _prisma_migrations (id, checksum, finished_at, migration_name, applied_steps_count) VALUES (?, ?, datetime('now'), ?, 1)",
        ).run(crypto.randomUUID(), "", folder);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        // Ignore "already exists" errors (table may already exist from a previous partial run)
        if (!message.includes("already exists")) {
          console.error(`❌ Migration ${folder} failed:`, message);
        }
      }
    }

    db.close();
    console.log("✅ Database schema initialized");
  } catch (err) {
    console.error("⚠️ Database initialization error:", err);
  }
};

// Initialize database connection
let prismaInstance: PrismaClient | null = null;
let dbPath = "";

export async function getPrismaClient() {
  if (prismaInstance && dbPath) {
    return prismaInstance;
  }

  // Get database path
  dbPath = getDbPath();
  console.log("📦 Database path:", dbPath);

  // Ensure directory exists
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  // Initialize schema if database is new
  const isNewDb = !fs.existsSync(dbPath);
  if (isNewDb) {
    console.log("🆕 Creating new database...");
  }

  const adapter = new PrismaBetterSqlite3({ url: dbPath });

  // Create Prisma Client
  prismaInstance = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    errorFormat: "minimal",
  });

  // Run migrations if database is new
  if (isNewDb) {
    initializeDatabase(dbPath);
  }

  console.log("✅ Prisma Client initialized");
  return prismaInstance;
}

// Export singleton instance getter
export const prisma = getPrismaClient;
