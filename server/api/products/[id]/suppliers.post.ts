import { nanoid } from 'nanoid';
import {
  supplierPrices,
  supplierPriceHistory,
} from '~~/server/database/schema';

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');
  const body = await readBody(event);
  const db = useDrizzle();

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Product ID is required',
    });
  }

  const {
    supplierId,
    price,
    minQuantity = 1,
    leadTimeDays,
    supplierSku,
    purchaseUrl,
    isPreferred = false,
  } = body;

  if (!supplierId || price === undefined) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Supplier ID and Price are required',
    });
  }

  const newSupplierPrice = await db
    .insert(supplierPrices)
    .values({
      id: nanoid(),
      productId: id,
      supplierId,
      price,
      minQuantity,
      leadTimeDays,
      supplierSku,
      purchaseUrl,
      isPreferred,
    })
    .returning()
    .get();

  await db.insert(supplierPriceHistory).values({
    id: nanoid(),
    supplierPriceId: newSupplierPrice.id,
    price,
    createdAt: new Date(),
  });

  return newSupplierPrice;
});
