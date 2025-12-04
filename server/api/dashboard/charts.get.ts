import { sql, eq, desc, gte } from 'drizzle-orm';

export default defineEventHandler(async () => {
  const db = useDB();

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const movementsByDay = await db
    .select({
      date: sql<string>`date(${tables.stockMovements.createdAt} / 1000, 'unixepoch')`,
      type: tables.stockMovements.type,
      totalQuantity: sql<number>`SUM(ABS(${tables.stockMovements.quantity}))`,
    })
    .from(tables.stockMovements)
    .where(gte(tables.stockMovements.createdAt, thirtyDaysAgo))
    .groupBy(
      sql`date(${tables.stockMovements.createdAt} / 1000, 'unixepoch')`,
      tables.stockMovements.type
    )
    .orderBy(sql`date(${tables.stockMovements.createdAt} / 1000, 'unixepoch')`);

  const movementsChartData = processMovementsByDay(movementsByDay);

  const productsByCategory = await db
    .select({
      categoryId: tables.products.categoryId,
      categoryName: tables.categories.name,
      categoryColor: tables.categories.color,
      count: sql<number>`count(*)`,
    })
    .from(tables.products)
    .leftJoin(
      tables.categories,
      eq(tables.products.categoryId, tables.categories.id)
    )
    .where(eq(tables.products.isActive, true))
    .groupBy(
      tables.products.categoryId,
      tables.categories.name,
      tables.categories.color
    );

  const topProductsByValue = await db
    .select({
      id: tables.products.id,
      name: tables.products.name,
      stockValue: sql<number>`${tables.products.costPrice} * ${tables.products.stockQuantity}`,
    })
    .from(tables.products)
    .where(eq(tables.products.isActive, true))
    .orderBy(
      desc(sql`${tables.products.costPrice} * ${tables.products.stockQuantity}`)
    )
    .limit(10);

  const stockLevelsResult = await db
    .select({
      stockStatus: sql<string>`
        CASE 
          WHEN ${tables.products.stockQuantity} = 0 THEN 'out_of_stock'
          WHEN ${tables.products.stockQuantity} <= ${tables.products.stockMin} THEN 'low_stock'
          WHEN ${tables.products.stockMax} IS NOT NULL AND ${tables.products.stockQuantity} >= ${tables.products.stockMax} THEN 'overstock'
          ELSE 'normal'
        END
      `,
      count: sql<number>`count(*)`,
    })
    .from(tables.products)
    .where(eq(tables.products.isActive, true)).groupBy(sql`
      CASE 
        WHEN ${tables.products.stockQuantity} = 0 THEN 'out_of_stock'
        WHEN ${tables.products.stockQuantity} <= ${tables.products.stockMin} THEN 'low_stock'
        WHEN ${tables.products.stockMax} IS NOT NULL AND ${tables.products.stockQuantity} >= ${tables.products.stockMax} THEN 'overstock'
        ELSE 'normal'
      END
    `);

  const movementsByType = await db
    .select({
      type: tables.stockMovements.type,
      count: sql<number>`count(*)`,
      totalQuantity: sql<number>`SUM(ABS(${tables.stockMovements.quantity}))`,
    })
    .from(tables.stockMovements)
    .where(gte(tables.stockMovements.createdAt, thirtyDaysAgo))
    .groupBy(tables.stockMovements.type);

  return {
    movementsChart: movementsChartData,
    productsByCategory,
    topProductsByValue,
    stockLevels: stockLevelsResult,
    movementsByType,
  };
});

function processMovementsByDay(
  movements: { date: string; type: string; totalQuantity: number }[]
) {
  const dateMap = new Map<string, { in: number; out: number }>();

  const dates: string[] = [];
  for (let i = 13; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    dates.push(dateStr);
    dateMap.set(dateStr, { in: 0, out: 0 });
  }

  for (const m of movements) {
    if (dateMap.has(m.date)) {
      const existing = dateMap.get(m.date)!;
      if (m.type === 'in') {
        existing.in = m.totalQuantity;
      } else if (m.type === 'out') {
        existing.out = m.totalQuantity;
      }
    }
  }

  const labels = dates.map((d) => {
    const date = new Date(d);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  });
  const stockIn = dates.map((d) => dateMap.get(d)?.in || 0);
  const stockOut = dates.map((d) => dateMap.get(d)?.out || 0);

  return { labels, stockIn, stockOut };
}
