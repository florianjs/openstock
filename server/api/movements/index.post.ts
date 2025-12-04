import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const db = useDB();
  const body = await readBody(event);

  if (!body.productId) {
    throw createError({ statusCode: 400, message: 'Product ID is required' });
  }

  const product = await db.query.products.findFirst({
    where: eq(tables.products.id, body.productId),
  });

  if (!product) {
    throw createError({ statusCode: 404, message: 'Product not found' });
  }

  const currentStock = product.stockQuantity ?? 0;
  let quantity = body.quantity;

  if (body.type === 'out') {
    quantity = -Math.abs(quantity);
  } else if (body.type === 'adjustment') {
    quantity = body.quantity;
  }

  const newStock = currentStock + quantity;

  if (newStock < 0) {
    throw createError({
      statusCode: 400,
      message: `Insufficient stock. Current: ${currentStock}, Requested: ${Math.abs(
        quantity
      )}`,
    });
  }

  const id = generateId('mov');

  await db.insert(tables.stockMovements).values({
    id,
    productId: body.productId,
    type: body.type,
    quantity,
    stockBefore: currentStock,
    stockAfter: newStock,
    unitCost: product.costPrice ?? 0,
    reference: body.reference || null,
    reason: body.reason || null,
    supplierId: body.supplierId || null,
  });

  await db
    .update(tables.products)
    .set({
      stockQuantity: newStock,
      updatedAt: new Date(),
    })
    .where(eq(tables.products.id, body.productId));

  return { id, newStock };
});
