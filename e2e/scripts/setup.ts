import pg from 'pg';
import { execSync } from 'child_process';
import { seedTestUser } from '../utils/test-user.js';

const { Pool } = pg;

const TEST_DB_NAME = 'coffee_tracker_test';
const ADMIN_DATABASE_URL = 'postgres://coffee:coffee123@localhost:5432/postgres?sslmode=disable';
const TEST_DATABASE_URL = `postgres://coffee:coffee123@localhost:5432/${TEST_DB_NAME}?sslmode=disable`;

async function waitForPostgres(maxRetries = 30, delayMs = 1000): Promise<void> {
  const pool = new Pool({ connectionString: ADMIN_DATABASE_URL });

  for (let i = 0; i < maxRetries; i++) {
    try {
      await pool.query('SELECT 1');
      await pool.end();
      console.log('PostgreSQL is available');
      return;
    } catch {
      console.log(`Waiting for PostgreSQL... (${i + 1}/${maxRetries})`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  await pool.end();
  throw new Error('PostgreSQL is not available');
}

async function dropAndCreateDatabase(): Promise<void> {
  const pool = new Pool({ connectionString: ADMIN_DATABASE_URL });

  try {
    // Terminate existing connections
    await pool.query(`
      SELECT pg_terminate_backend(pid)
      FROM pg_stat_activity
      WHERE datname = $1 AND pid <> pg_backend_pid()
    `, [TEST_DB_NAME]);

    // Drop database if exists
    await pool.query(`DROP DATABASE IF EXISTS ${TEST_DB_NAME}`);
    console.log(`Dropped database ${TEST_DB_NAME} (if existed)`);

    // Create fresh database
    await pool.query(`CREATE DATABASE ${TEST_DB_NAME}`);
    console.log(`Created database ${TEST_DB_NAME}`);
  } finally {
    await pool.end();
  }
}

async function runMigrations(): Promise<void> {
  console.log('Running migrations...');
  execSync(`DATABASE_URL="${TEST_DATABASE_URL}" go run ./cmd/migrate -cmd=up`, {
    cwd: '../backend',
    stdio: 'inherit',
  });
  console.log('Migrations complete');
}

async function setup(): Promise<void> {
  console.log('E2E Test Setup Starting...\n');

  await waitForPostgres();
  await dropAndCreateDatabase();
  await runMigrations();
  await seedTestUser(TEST_DATABASE_URL);

  console.log('\nE2E Test Setup Complete!');
}

setup().catch((error) => {
  console.error('Setup failed:', error);
  process.exit(1);
});
