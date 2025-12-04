import { users } from '../../database/schema';
import { eq, and } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const db = useDB();
  const body = await readBody(event);

  if (!body.email || !body.password) {
    throw createError({
      statusCode: 400,
      message: 'Email and password are required',
    });
  }

  // Find user by email
  const user = await db
    .select()
    .from(users)
    .where(
      and(
        eq(users.email, body.email.toLowerCase().trim()),
        eq(users.isActive, true)
      )
    )
    .get();

  if (!user) {
    throw createError({
      statusCode: 401,
      message: 'Invalid email or password',
    });
  }

  // Verify password
  const isValid = await verifyPassword(user.passwordHash, body.password);
  if (!isValid) {
    throw createError({
      statusCode: 401,
      message: 'Invalid email or password',
    });
  }

  // Set user session
  await setUserSession(event, {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
  });

  return {
    success: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
  };
});
