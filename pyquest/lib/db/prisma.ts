import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Check if DATABASE_URL is PostgreSQL or SQLite
const databaseUrl = process.env.DATABASE_URL || '';
const isPostgres = databaseUrl.startsWith('postgresql://') || databaseUrl.startsWith('postgres://');
const isSQLite = databaseUrl.startsWith('file:');

let prismaClient: PrismaClient;

if (isPostgres) {
  // PostgreSQL with adapter
  const pool = new Pool({ connectionString: databaseUrl });
  const adapter = new PrismaPg(pool);
  prismaClient = new PrismaClient({ adapter });
} else if (isSQLite) {
  // SQLite with adapter (Prisma 7 requires non-empty client options)
  const adapter = new PrismaBetterSqlite3({ url: databaseUrl });
  prismaClient = new PrismaClient({ adapter });
} else {
  // Fallback - use default client
  prismaClient = new PrismaClient();
}

export const prisma = globalForPrisma.prisma ?? prismaClient;

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;



