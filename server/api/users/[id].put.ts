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

  // Only admins can update users
  if (session.user.role !== 'admin') {
    throw createError({
      statusCode: 403,
      message: 'Only administrators can update users',
    });
  }

  const db = useDB();
  const id = getRouterParam(event, 'id');
  const body = await readBody(event);

  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'User ID is required',
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

  // Prevent modifying the admin's own role
  if (id === session.user.id && body.role && body.role !== session.user.role) {
    throw createError({
      statusCode: 403,
      message: 'You cannot change your own role',
    });
  }

  // Prevent deactivating yourself
  if (id === session.user.id && body.isActive === false) {
    throw createError({
      statusCode: 403,
      message: 'You cannot deactivate your own account',
    });
  }

  const updateData: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (body.name) {
    updateData.name = body.name.trim();
  }

  if (body.email) {
    // Check if email already exists for another user
    const emailUser = await db
      .select()
      .from(users)
      .where(eq(users.email, body.email.toLowerCase().trim()))
      .get();

    if (emailUser && emailUser.id !== id) {
      throw createError({
        statusCode: 400,
        message: 'A user with this email already exists',
      });
    }
    updateData.email = body.email.toLowerCase().trim();
  }

  if (body.password) {
    if (body.password.length < 8) {
      throw createError({
        statusCode: 400,
        message: 'Password must be at least 8 characters',
      });
    }
    updateData.passwordHash = await hashPassword(body.password);
  }

  if (typeof body.isActive === 'boolean') {
    updateData.isActive = body.isActive;
  }

  // Allow role change (only between member and viewer, cannot make someone admin)
  if (body.role && existingUser.role !== 'admin') {
    const allowedRoles = ['member', 'viewer'];
    if (allowedRoles.includes(body.role)) {
      updateData.role = body.role;
    }
  }

  await db.update(users).set(updateData).where(eq(users.id, id));

  const updatedUser = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      isActive: users.isActive,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, id))
    .get();

  return updatedUser;
});
