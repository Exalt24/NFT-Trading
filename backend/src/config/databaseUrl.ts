/**
 * The one place that decides which database the backend, the migration runner and the Prisma CLI talk to.
 * DATABASE_URL wins when it is set. Otherwise the URL is built from the older DB_HOST, DB_PORT, DB_NAME, DB_USER
 * and DB_PASSWORD variables, so an existing .env or docker-compose file keeps working unchanged.
 */
export function resolveDatabaseUrl(source: Record<string, string | undefined> = process.env): string {
  if (source.DATABASE_URL) return source.DATABASE_URL;

  const host = source.DB_HOST || 'localhost';
  const port = source.DB_PORT || '5432';
  const name = source.DB_NAME || 'nft_marketplace';
  const user = encodeURIComponent(source.DB_USER || 'postgres');
  const password = encodeURIComponent(source.DB_PASSWORD || 'postgres');
  return `postgresql://${user}:${password}@${host}:${port}/${name}`;
}
