// Import this FIRST in every database test file: it points the app at the test database before src/config/env.ts is evaluated.
import { testDatabaseUrl } from './testEnv.js';

process.env.DATABASE_URL = testDatabaseUrl();
