import { users } from '../../database/schema';
import { count } from 'drizzle-orm';

// Inline migration for users table (needed for first-time setup check)
async function ensureUsersTableExists() {
  const db = hubDatabase();
  await db
    .prepare(
      `
    CREATE TABLE IF NOT EXISTS users (
      id text PRIMARY KEY NOT NULL,
      email text NOT NULL UNIQUE,
      password_hash text NOT NULL,
      name text NOT NULL,
      role text NOT NULL DEFAULT 'member',
      is_active integer DEFAULT 1,
      created_at integer,
      updated_at integer
    )
  `
    )
    .run();
}

export default defineEventHandler(async () => {
  // Ensure users table exists before any operations
  await ensureUsersTableExists();

  const db = useDB();

  // Check if any users exist in the database
  const [result] = await db.select({ count: count() }).from(users);
  const hasUsers = result.count > 0;

  return {
    hasUsers,
    needsSetup: !hasUsers,
  };
});
