import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import dotenv from 'dotenv';
import { resolveDatabaseUrl } from '../src/config/databaseUrl.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

const { Pool } = pg;

// DATABASE_URL wins; the older DB_* variables still work (see src/config/databaseUrl.ts).
const pool = new Pool({ connectionString: resolveDatabaseUrl() });

async function runMigrations() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Starting database migrations...');
    
    const sqlPath = join(__dirname, '001_nft_tables.sql');
    const sql = readFileSync(sqlPath, 'utf8');
    
    console.log('📝 Executing migration: 001_nft_tables.sql');
    await client.query(sql);
    
    console.log('✅ Migration completed successfully!');
    
    const tableCheck = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    
    console.log('\n📊 Created tables:');
    tableCheck.rows.forEach(row => {
      console.log(`   - ${row.table_name}`);
    });
    
    const indexCheck = await client.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE schemaname = 'public' 
      ORDER BY indexname;
    `);
    
    console.log('\n🔍 Created indexes:');
    indexCheck.rows.forEach(row => {
      console.log(`   - ${row.indexname}`);
    });
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});