export default defineEventHandler(async (event) => {
  const db = useDB();
  const body = await readBody(event);

  const id = generateId('cat');

  await db.insert(tables.categories).values({
    id,
    name: body.name,
    description: body.description || null,
    parentId: body.parentId || null,
    color: body.color || '#6B7280',
  });

  return { id };
});
