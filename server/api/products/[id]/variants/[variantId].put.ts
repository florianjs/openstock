import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const db = useDB();
  const productId = getRouterParam(event, 'id');
  const variantId = getRouterParam(event, 'variantId');
  const body = await readBody(event);

  if (!productId || !variantId) {
    throw createError({
      statusCode: 400,
      message: 'Product ID and Variant ID are required',
    });
  }

  const existing = await db.query.productVariants.findFirst({
    where: eq(tables.productVariants.id, variantId),
  });

  if (!existing || existing.productId !== productId) {
    throw createError({
      statusCode: 404,
      message: 'Variant not found',
    });
  }

  const updated = await db
    .update(tables.productVariants)
    .set({
      name: body.name,
      sku: body.sku || null,
      barcode: body.barcode || null,
      costPrice: body.costPrice || 0,
      marginPercent: body.marginPercent || 30,
      price: body.price || 0,
      taxId: body.taxId || null,
      stockQuantity: body.stockQuantity || 0,
      stockMin: body.stockMin || 0,
      supplierId: body.supplierId || null,
      updatedAt: new Date(),
    })
    .where(eq(tables.productVariants.id, variantId))
    .returning();

  return updated[0];
});
