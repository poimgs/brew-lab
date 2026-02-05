import pg from 'pg';
import bcrypt from 'bcryptjs';

const { Pool } = pg;

export const TEST_USER = {
  email: 'test@example.com',
  password: 'testpassword123',
} as const;

export async function seedTestUser(databaseUrl: string): Promise<void> {
  const pool = new Pool({ connectionString: databaseUrl });

  try {
    const passwordHash = await bcrypt.hash(TEST_USER.password, 10);

    await pool.query(
      `INSERT INTO users (email, password_hash)
       VALUES ($1, $2)
       ON CONFLICT (email) DO UPDATE SET password_hash = $2`,
      [TEST_USER.email, passwordHash]
    );

    console.log(`Seeded test user: ${TEST_USER.email}`);
  } finally {
    await pool.end();
  }
}
