import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const db = useDB();
  const id = getRouterParam(event, 'id');
  const body = await readBody(event);

  if (!id) {
    throw createError({ statusCode: 400, message: 'Supplier ID is required' });
  }

  await db
    .update(tables.suppliers)
    .set({
      name: body.name,
      email: body.email || null,
      phone: body.phone || null,
      address: body.address || null,
      city: body.city || null,
      postalCode: body.postalCode || null,
      country: body.country || 'France',
      notes: body.notes || null,
      updatedAt: new Date(),
    })
    .where(eq(tables.suppliers.id, id));

  return { success: true };
});
