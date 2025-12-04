import { desc } from 'drizzle-orm';

export default defineEventHandler(async () => {
  const db = useDB();

  const taxes = await db.query.taxes.findMany({
    orderBy: [desc(tables.taxes.createdAt)],
  });

  return taxes;
});
