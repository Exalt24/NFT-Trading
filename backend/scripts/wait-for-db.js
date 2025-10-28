import pg from 'pg';

const config = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'nft_marketplace',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
};

const maxRetries = 30;
const retryDelay = 2000;

async function waitForDatabase() {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const client = new pg.Client(config);
      await client.connect();
      await client.query('SELECT 1');
      await client.end();
      console.log('✅ Database is ready!');
      return;
    } catch (error) {
      console.log(`⏳ Waiting for database... (${i + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }
  console.error('❌ Database connection timeout');
  process.exit(1);
}

waitForDatabase();