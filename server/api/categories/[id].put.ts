import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const db = useDB();
  const id = getRouterParam(event, 'id');
  const body = await readBody(event);

  if (!id) {
    throw createError({ statusCode: 400, message: 'Category ID is required' });
  }

  await db
    .update(tables.categories)
    .set({
      name: body.name,
      description: body.description || null,
      parentId: body.parentId || null,
      color: body.color || '#6B7280',
      updatedAt: new Date(),
    })
    .where(eq(tables.categories.id, id));

  return { success: true };
});
