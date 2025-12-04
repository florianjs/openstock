import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const db = useDB();
  const body = await readBody(event);

  const id = generateId('tax');

  if (body.isDefault) {
    await db
      .update(tables.taxes)
      .set({ isDefault: false })
      .where(eq(tables.taxes.isDefault, true));
  }

  await db.insert(tables.taxes).values({
    id,
    name: body.name,
    rate: body.rate,
    isDefault: body.isDefault ?? false,
  });

  return { id };
});
