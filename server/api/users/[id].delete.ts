import { users } from '../../database/schema';
import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event);

  if (!session.user) {
    throw createError({
      statusCode: 401,
      message: 'Not authenticated',
    });
  }

  // Only admins can delete users
  if (session.user.role !== 'admin') {
    throw createError({
      statusCode: 403,
      message: 'Only administrators can delete users',
    });
  }

  const db = useDB();
  const id = getRouterParam(event, 'id');

  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'User ID is required',
    });
  }

  // Prevent deleting yourself
  if (id === session.user.id) {
    throw createError({
      statusCode: 403,
      message: 'You cannot delete your own account',
    });
  }

  // Check if user exists
  const existingUser = await db
    .select()
    .from(users)
    .where(eq(users.id, id))
    .get();

  if (!existingUser) {
    throw createError({
      statusCode: 404,
      message: 'User not found',
    });
  }

  await db.delete(users).where(eq(users.id, id));

  return { success: true };
});
