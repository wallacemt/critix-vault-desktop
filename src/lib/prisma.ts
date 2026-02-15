"use server";
/**
 * Prisma Client Instance
 * Configured with better-sqlite3 adapter for optimal performance
 */

import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "path";
import { invoke } from "@tauri-apps/api/core";

// Get the app data directory for storing the database
const getDbPath = async () => {
  try {
    // Get Tauri app data directory (same location as JSON files)
    const appDataDir = await invoke<string>("get_data_directory");
    return path.join(appDataDir, "critix.db");
  } catch (error) {
    // Fallback to local path for development
    console.warn("Failed to get data directory from Tauri, using local path:", error);
    return path.join(process.cwd(), "prisma", "critix.db");
  }
};

// Initialize database connection
let prismaInstance: PrismaClient | null = null;
let dbPath: string | null = null;

export async function getPrismaClient() {
  if (prismaInstance && dbPath) {
    return prismaInstance;
  }

  // Get database path
  dbPath = await getDbPath();
  console.log("📦 Database path:", dbPath);

  const adapter = new PrismaBetterSqlite3({ url: dbPath });

  // Create Prisma Client
  prismaInstance = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
    errorFormat: "minimal",
  });

  console.log("✅ Prisma Client initialized");
  return prismaInstance;
}

// Export singleton instance getter
export const prisma = getPrismaClient;
