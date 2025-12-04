import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const db = useDB();
  const id = getRouterParam(event, 'id');

  if (!id) {
    throw createError({ statusCode: 400, message: 'Tax ID is required' });
  }

  await db.delete(tables.taxes).where(eq(tables.taxes.id, id));

  return { success: true };
});
