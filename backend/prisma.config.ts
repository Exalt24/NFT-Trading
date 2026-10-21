import 'dotenv/config';
import { defineConfig } from 'prisma/config';
import { resolveDatabaseUrl } from './src/config/databaseUrl.ts';

// The Prisma CLI (generate, db pull, migrate diff) reads its connection string from here.
// The tables themselves are created by backend/migrations/001_nft_tables.sql, not by Prisma Migrate.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: resolveDatabaseUrl(),
  },
});
