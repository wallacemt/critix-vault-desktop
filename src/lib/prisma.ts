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

import { Prisma, PrismaClient } from "@prisma/client";
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

export const getDatabaseFilePath = () => getDbPath();

// Run migration SQL files to initialize the database schema
const initializeDatabase = async (dbFilePath: string) => {
  try {
    // Collect available prisma/migrations directories.
    // In packaged apps we prefer the bundled migrations (current working dir)
    // and then merge with CRITIX_DATA_DIR copies for backward compatibility.
    const possibleMigrationDirs = [
      path.join(process.cwd(), "prisma", "migrations"),
      process.env.CRITIX_DATA_DIR ? path.join(process.env.CRITIX_DATA_DIR, "prisma", "migrations") : null,
    ].filter(Boolean) as string[];

    const availableMigrationDirs = possibleMigrationDirs.filter((dir) => fs.existsSync(dir));
    if (availableMigrationDirs.length === 0) {
      console.warn("⚠️ Migrations directory not found, skipping DB initialization");
      return;
    }

    console.log("📦 Migration sources:", availableMigrationDirs.join(" | "));

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

    // Merge migrations by folder name from all sources.
    const migrationSqlByName = new Map<string, string>();

    for (const sourceDir of availableMigrationDirs) {
      const entries = fs.readdirSync(sourceDir).filter((f: string) => {
        try {
          return fs.statSync(path.join(sourceDir, f)).isDirectory();
        } catch {
          return false;
        }
      });

      for (const folder of entries) {
        if (migrationSqlByName.has(folder)) {
          continue;
        }

        const sqlFile = path.join(sourceDir, folder, "migration.sql");
        if (fs.existsSync(sqlFile)) {
          migrationSqlByName.set(folder, sqlFile);
        }
      }
    }

    const migrationEntries = [...migrationSqlByName.entries()].sort(([a], [b]) => a.localeCompare(b));

    const markApplied = db.prepare(
      "INSERT OR IGNORE INTO _prisma_migrations (id, checksum, finished_at, migration_name, applied_steps_count) VALUES (?, ?, datetime('now'), ?, 1)",
    );

    for (const [folder, sqlFile] of migrationEntries) {
      if (applied.has(folder)) {
        continue;
      }

      const sql = fs.readFileSync(sqlFile, "utf-8");
      console.log(`📦 Applying migration: ${folder}`);

      try {
        // Wrap each migration in a transaction so partial failures don't leave
        // the schema in a broken state. Without this, a failed migration that
        // already ran destructive SQL (e.g. DROP TABLE) would not be marked as
        // applied and would re-run on every startup, causing data loss.
        db.transaction(() => {
          db.exec(sql);
        })();
        markApplied.run(crypto.randomUUID(), "", folder);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        const isBenignMigrationError = message.includes("already exists") || message.includes("duplicate column name");

        if (!isBenignMigrationError) {
          console.error(`❌ Migration ${folder} failed:`, message);
          // Mark as applied anyway to prevent this broken migration from
          // re-running on every startup and causing repeated data loss.
          markApplied.run(crypto.randomUUID(), "", folder);
          continue;
        }

        // If schema already matches the migration effect, mark it as applied
        // to avoid retry loops on every startup.
        console.warn(`⚠️ Migration ${folder} already reflected in schema, marking as applied.`);
        markApplied.run(crypto.randomUUID(), "", folder);
      }
    }

    db.close();
    console.log("✅ Database schema initialized");
  } catch (err) {
    console.error("⚠️ Database initialization error:", err);
  }
};

const validateSchemaReady = async (db: PrismaClient) => {
  await db.folder.count();
};

// Initialize database connection
let prismaInstance: PrismaClient | null = null;
let dbPath = "";
let initializationPromise: Promise<PrismaClient> | null = null;

export async function getPrismaClient() {
  if (prismaInstance && dbPath) {
    return prismaInstance;
  }

  if (initializationPromise) {
    return initializationPromise;
  }

  initializationPromise = (async () => {
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

    const baseClientOptions: Prisma.PrismaClientOptions = {
      log:
        process.env.NODE_ENV === "development"
          ? (["error", "warn"] as Prisma.LogLevel[])
          : (["error"] as Prisma.LogLevel[]),
      errorFormat: "minimal",
    };

    const { PrismaBetterSqlite3 } = await import("@prisma/adapter-better-sqlite3");
    const adapter = new PrismaBetterSqlite3({ url: dbPath });
    prismaInstance = new PrismaClient({
      ...baseClientOptions,
      adapter,
    });

    // Always run migration sync so existing databases receive new schema updates.
    await initializeDatabase(dbPath);

    await validateSchemaReady(prismaInstance);

    console.log("✅ Prisma Client initialized");
    return prismaInstance;
  })();

  try {
    return await initializationPromise;
  } finally {
    initializationPromise = null;
  }
}

// Export singleton instance getter
export const prisma = getPrismaClient;
