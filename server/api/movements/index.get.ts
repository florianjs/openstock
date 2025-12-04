import { desc } from 'drizzle-orm';

export default defineEventHandler(async () => {
  const db = useDB();

  const movements = await db.query.stockMovements.findMany({
    orderBy: [desc(tables.stockMovements.createdAt)],
    with: {
      product: true,
      supplier: true,
    },
    limit: 100,
  });

  return movements;
});
