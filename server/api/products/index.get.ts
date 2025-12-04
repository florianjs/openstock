import { desc } from 'drizzle-orm';

export default defineEventHandler(async () => {
  const db = useDB();

  const products = await db.query.products.findMany({
    orderBy: [desc(tables.products.createdAt)],
    with: {
      category: true,
      supplier: true,
      tax: true,
      variants: {
        with: {
          supplier: true,
          tax: true,
        },
      },
    },
  });

  return products;
});
