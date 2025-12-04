import { desc } from 'drizzle-orm';

export default defineEventHandler(async () => {
  const db = useDB();

  const suppliers = await db.query.suppliers.findMany({
    orderBy: [desc(tables.suppliers.createdAt)],
  });

  return suppliers;
});
