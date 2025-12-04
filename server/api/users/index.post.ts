import { users } from '../../database/schema';
import { eq } from 'drizzle-orm';
import { generateId } from '../../utils/id';

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event);

  if (!session.user) {
    throw createError({
      statusCode: 401,
      message: 'Not authenticated',
    });
  }

  // Only admins can create users
  if (session.user.role !== 'admin') {
    throw createError({
      statusCode: 403,
      message: 'Only administrators can create users',
    });
  }

  const db = useDB();
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

  // Check if email already exists
  const existingUser = await db
    .select()
    .from(users)
    .where(eq(users.email, body.email.toLowerCase().trim()))
    .get();

  if (existingUser) {
    throw createError({
      statusCode: 400,
      message: 'A user with this email already exists',
    });
  }

  // Hash the password
  const passwordHash = await hashPassword(body.password);

  // Validate role (only member or viewer allowed, not admin)
  const allowedRoles = ['member', 'viewer'] as const;
  const role = allowedRoles.includes(body.role) ? body.role : 'member';

  // Create the user (admin can only create members or viewers, not other admins)
  const newUser = {
    id: generateId(),
    email: body.email.toLowerCase().trim(),
    passwordHash,
    name: body.name.trim(),
    role: role as 'member' | 'viewer',
    isActive: true,
  };

  await db.insert(users).values(newUser);

  return {
    id: newUser.id,
    email: newUser.email,
    name: newUser.name,
    role: newUser.role,
    isActive: newUser.isActive,
  };
});
