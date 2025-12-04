import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const db = useDB();
  const id = getRouterParam(event, 'id');

  if (!id) {
    throw createError({ statusCode: 400, message: 'Category ID is required' });
  }

  await db.delete(tables.categories).where(eq(tables.categories.id, id));

  return { success: true };
});
