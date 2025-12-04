import { desc } from 'drizzle-orm';

export default defineEventHandler(async () => {
  const db = useDB();

  const categories = await db.query.categories.findMany({
    orderBy: [desc(tables.categories.createdAt)],
    with: {
      parent: true,
    },
  });

  return categories;
});
