import { eq, sql, lte, desc } from 'drizzle-orm';

export default defineEventHandler(async () => {
  const db = useDB();

  const totalProductsResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(tables.products)
    .where(eq(tables.products.isActive, true));
  const totalProducts = totalProductsResult[0]?.count ?? 0;

  const totalSuppliersResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(tables.suppliers)
    .where(eq(tables.suppliers.isActive, true));
  const totalSuppliers = totalSuppliersResult[0]?.count ?? 0;

  const lowStockProducts = await db
    .select()
    .from(tables.products)
    .where(
      sql`${tables.products.stockQuantity} <= ${tables.products.stockMin} AND ${tables.products.isActive} = 1`
    )
    .limit(5);
  const lowStockCount = lowStockProducts.length;

  const stockValueResult = await db
    .select({
      total: sql<number>`COALESCE(SUM(${tables.products.costPrice} * ${tables.products.stockQuantity}), 0)`,
    })
    .from(tables.products)
    .where(eq(tables.products.isActive, true));
  const totalStockValue =
    Math.round((stockValueResult[0]?.total ?? 0) * 100) / 100;

  const recentMovements = await db.query.stockMovements.findMany({
    limit: 5,
    orderBy: [desc(tables.stockMovements.createdAt)],
    with: {
      product: true,
    },
  });

  return {
    totalProducts,
    totalSuppliers,
    lowStockCount,
    totalStockValue,
    lowStockProducts,
    recentMovements,
  };
});
