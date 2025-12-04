import { users } from '../../database/schema';
import { count } from 'drizzle-orm';
import { generateId } from '../../utils/id';

// Inline migration for users table (needed for first-time setup)
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

export default defineEventHandler(async (event) => {
  // Ensure users table exists before any operations
  await ensureUsersTableExists();

  const db = useDB();

  // Check if any users already exist
  const [result] = await db.select({ count: count() }).from(users);
  if (result.count > 0) {
    throw createError({
      statusCode: 403,
      message: 'Setup already completed. Please use the login page.',
    });
  }

  const body = await readBody(event);

  if (!body.email || !body.password || !body.name) {
    throw createError({
      statusCode: 400,
      message: 'Email, password, and name are required',
    });
  }

  if (body.password.length < 8) {
    throw createError({
      statusCode: 400,
      message: 'Password must be at least 8 characters',
    });
  }

  // Hash the password
  const passwordHash = await hashPassword(body.password);

  // Create the admin user
  const newUser = {
    id: generateId(),
    email: body.email.toLowerCase().trim(),
    passwordHash,
    name: body.name.trim(),
    role: 'admin' as const,
    isActive: true,
  };

  await db.insert(users).values(newUser);

  // Set user session
  await setUserSession(event, {
    user: {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      role: newUser.role,
    },
  });

  return {
    success: true,
    user: {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      role: newUser.role,
    },
  };
});
