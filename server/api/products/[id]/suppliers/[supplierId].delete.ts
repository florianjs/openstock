import { eq, and } from 'drizzle-orm';
import { supplierPrices } from '~~/server/database/schema';

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');
  const supplierId = getRouterParam(event, 'supplierId');
  const db = useDrizzle();

  if (!id || !supplierId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Product ID and Supplier ID are required',
    });
  }

  const result = await db
    .delete(supplierPrices)
    .where(
      and(
        eq(supplierPrices.productId, id),
        eq(supplierPrices.supplierId, supplierId)
      )
    )
    .returning()
    .get();

  if (!result) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Supplier association not found',
    });
  }

  return { success: true };
});
