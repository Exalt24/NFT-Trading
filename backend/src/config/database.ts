import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';
import { env } from './env.js';

// Prisma talks to PostgreSQL through the pg driver, so the pool limits the old code set by hand still apply.
const adapter = new PrismaPg({
  connectionString: env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export const prisma = new PrismaClient({ adapter });

export async function testDatabaseConnection(): Promise<boolean> {
  try {
    // A real round trip, so a wrong URL or a stopped database is reported here and not on the first request.
    const rows = await prisma.$queryRaw<Array<{ now: Date }>>`SELECT NOW() AS now`;
    console.log('✅ Database connected successfully at', rows[0].now);
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
}

export async function closeDatabaseConnection(): Promise<void> {
  await prisma.$disconnect();
  console.log('🔌 Database connection pool closed');
}
