import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const db = useDB();
  const id = getRouterParam(event, 'id');

  if (!id) {
    throw createError({ statusCode: 400, message: 'Product ID is required' });
  }

  await db.delete(tables.products).where(eq(tables.products.id, id));

  return { success: true };
});
