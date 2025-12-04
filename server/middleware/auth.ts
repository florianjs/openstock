import { users } from '../database/schema';
import { count } from 'drizzle-orm';

/**
 * Server middleware to protect routes based on authentication and authorization.
 *
 * Security rules:
 * 1. /api/auth/setup - Only allowed if NO users exist (first-time setup)
 * 2. /api/auth/check, /api/auth/login - Always public
 * 3. /api/users/* - Admin only
 * 4. Write operations (POST, PUT, DELETE) - Blocked for viewers
 * 5. All other /api/* routes - Require authentication
 *
 * Roles:
 * - admin: Full access + user management
 * - member: Full read/write access to inventory
 * - viewer: Read-only access (GET requests only)
 */
export default defineEventHandler(async (event) => {
  const path = getRequestURL(event).pathname;
  const method = getMethod(event);

  // Skip non-API routes
  if (!path.startsWith('/api/')) {
    return;
  }

  // ============================================================================
  // PUBLIC ROUTES (no auth required)
  // ============================================================================
  const publicRoutes = [
    '/api/auth/check',
    '/api/auth/login',
    '/api/__migrate',
    '/api/__seed',
    '/api/__clear',
  ];

  // These routes have their own secret-based protection
  if (publicRoutes.includes(path)) {
    return;
  }

  // ============================================================================
  // SETUP ROUTE PROTECTION
  // Only allow setup if no users exist in the database
  // ============================================================================
  if (path === '/api/auth/setup') {
    try {
      const db = useDB();
      const [result] = await db.select({ count: count() }).from(users);

      if (result.count > 0) {
        throw createError({
          statusCode: 403,
          message: 'Setup already completed. Registration is disabled.',
        });
      }
    } catch (error: any) {
      // If table doesn't exist yet, allow setup to proceed
      // This can happen on first deployment before migrations are run
      if (error.statusCode === 403) {
        throw error;
      }
      // Table doesn't exist - allow setup (migrations will be handled by setup endpoint)
      console.warn('Users table may not exist yet:', error.message);
    }
    // Allow setup to proceed if no users exist
    return;
  }

  // ============================================================================
  // PROTECTED ROUTES (require authentication)
  // ============================================================================
  const session = await getUserSession(event);

  if (!session.user) {
    throw createError({
      statusCode: 401,
      message: 'Authentication required',
    });
  }

  // ============================================================================
  // ADMIN-ONLY ROUTES
  // ============================================================================
  const adminOnlyPaths = ['/api/users'];

  const isAdminRoute = adminOnlyPaths.some((adminPath) =>
    path.startsWith(adminPath)
  );

  if (isAdminRoute && session.user.role !== 'admin') {
    throw createError({
      statusCode: 403,
      message: 'Administrator access required',
    });
  }

  // ============================================================================
  // VIEWER RESTRICTIONS (read-only access)
  // Viewers can only perform GET requests
  // ============================================================================
  if (session.user.role === 'viewer') {
    const writeMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];

    // Allow logout for viewers
    if (path === '/api/auth/logout') {
      return;
    }

    if (writeMethods.includes(method)) {
      throw createError({
        statusCode: 403,
        message: 'Read-only access. You do not have permission to modify data.',
      });
    }
  }
});
