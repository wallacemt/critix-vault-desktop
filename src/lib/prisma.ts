"use server";
/**
 * Prisma Client Instance
 * Configured with better-sqlite3 adapter for optimal performance
 */

import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "path";
// Get the app data directory for storing the database
const getDbPath = async () => {
  return path.join(process.cwd(), "prisma", "critix.db");
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
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    errorFormat: "minimal",
  });

  console.log("✅ Prisma Client initialized");
  return prismaInstance;
}

// Export singleton instance getter
export const prisma = getPrismaClient;
