import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const db = useDB();
  const id = getRouterParam(event, 'id');
  const body = await readBody(event);

  if (!id) {
    throw createError({ statusCode: 400, message: 'Tax ID is required' });
  }

  if (body.isDefault) {
    await db
      .update(tables.taxes)
      .set({ isDefault: false })
      .where(eq(tables.taxes.isDefault, true));
  }

  await db
    .update(tables.taxes)
    .set({
      name: body.name,
      rate: body.rate,
      isDefault: body.isDefault ?? false,
      updatedAt: new Date(),
    })
    .where(eq(tables.taxes.id, id));

  return { success: true };
});
