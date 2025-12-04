import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const db = useDB();
  const id = getRouterParam(event, 'id');

  if (!id) {
    throw createError({ statusCode: 400, message: 'Supplier ID is required' });
  }

  await db.delete(tables.suppliers).where(eq(tables.suppliers.id, id));

  return { success: true };
});
