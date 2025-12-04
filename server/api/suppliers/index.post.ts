export default defineEventHandler(async (event) => {
  const db = useDB();
  const body = await readBody(event);

  const id = generateId('supp');

  await db.insert(tables.suppliers).values({
    id,
    name: body.name,
    email: body.email || null,
    phone: body.phone || null,
    address: body.address || null,
    city: body.city || null,
    postalCode: body.postalCode || null,
    country: body.country || 'France',
    notes: body.notes || null,
    isActive: true,
  });

  return { id };
});
