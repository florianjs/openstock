import { eq, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import {
  supplierPrices,
  supplierPriceHistory,
} from '~~/server/database/schema';

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');
  const supplierId = getRouterParam(event, 'supplierId');
  const body = await readBody(event);
  const db = useDrizzle();

  if (!id || !supplierId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Product ID and Supplier ID are required',
    });
  }

  const existingPrice = await db.query.supplierPrices.findFirst({
    where: and(
      eq(supplierPrices.productId, id),
      eq(supplierPrices.supplierId, supplierId)
    ),
  });

  if (!existingPrice) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Supplier not associated with this product',
    });
  }

  const {
    price,
    minQuantity,
    leadTimeDays,
    supplierSku,
    purchaseUrl,
    isPreferred,
  } = body;

  const updateData: any = {};
  if (price !== undefined) updateData.price = price;
  if (minQuantity !== undefined) updateData.minQuantity = minQuantity;
  if (leadTimeDays !== undefined) updateData.leadTimeDays = leadTimeDays;
  if (supplierSku !== undefined) updateData.supplierSku = supplierSku;
  if (purchaseUrl !== undefined) updateData.purchaseUrl = purchaseUrl;
  if (isPreferred !== undefined) updateData.isPreferred = isPreferred;

  updateData.updatedAt = new Date();

  const updatedSupplierPrice = await db
    .update(supplierPrices)
    .set(updateData)
    .where(eq(supplierPrices.id, existingPrice.id))
    .returning()
    .get();

  if (price !== undefined && price !== existingPrice.price) {
    await db.insert(supplierPriceHistory).values({
      id: nanoid(),
      supplierPriceId: existingPrice.id,
      price: price,
      createdAt: new Date(),
    });
  }

  return updatedSupplierPrice;
});
