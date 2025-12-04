import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const db = useDB();
  const id = getRouterParam(event, 'id');
  const body = await readBody(event);

  if (!id) {
    throw createError({ statusCode: 400, message: 'Product ID is required' });
  }

  await db
    .update(tables.products)
    .set({
      name: body.name,
      sku: body.sku || null,
      barcode: body.barcode || null,
      description: body.description || null,
      categoryId: body.categoryId || null,
      costPrice: body.costPrice ?? 0,
      sellingPrice: body.sellingPrice ?? 0,
      marginPercent: body.marginPercent ?? 30,
      taxId: body.taxId || null,
      stockQuantity: body.stockQuantity ?? 0,
      stockMin: body.stockMin ?? 0,
      stockMax: body.stockMax || null,
      unit: body.unit || 'unit',
      supplierId: body.supplierId || null,
      options: body.options || null,
      updatedAt: new Date(),
    })
    .where(eq(tables.products.id, id));

  await db
    .delete(tables.productVariants)
    .where(eq(tables.productVariants.productId, id));

  if (
    body.variants &&
    Array.isArray(body.variants) &&
    body.variants.length > 0
  ) {
    const variantsToInsert = body.variants.map((v: any) => ({
      id: v.id || generateId('var'),
      productId: id,
      name: v.name,
      sku: v.sku || null,
      barcode: v.barcode || null,
      costPrice: v.costPrice ?? 0,
      marginPercent: v.marginPercent ?? 30,
      price: v.price ?? 0,
      taxId: v.taxId || null,
      stockQuantity: v.stockQuantity ?? 0,
      stockMin: v.stockMin ?? 0,
      stockMax: v.stockMax || null,
      supplierId: v.supplierId || null,
    }));
    await db.insert(tables.productVariants).values(variantsToInsert);
  }

  return { success: true };
});
