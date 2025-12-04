import { eq, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import {
  variantSupplierExclusions,
  supplierPrices,
  productVariants,
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

  const { variantId, supplierPriceId, exclude } = body;

  if (!variantId || !supplierPriceId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Variant ID and Supplier Price ID are required',
    });
  }

  const variant = await db.query.productVariants.findFirst({
    where: and(
      eq(productVariants.id, variantId),
      eq(productVariants.productId, id)
    ),
  });

  if (!variant) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Variant not found for this product',
    });
  }

  const supplierPrice = await db.query.supplierPrices.findFirst({
    where: and(
      eq(supplierPrices.id, supplierPriceId),
      eq(supplierPrices.productId, id)
    ),
  });

  if (!supplierPrice) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Supplier price not found for this product',
    });
  }

  const existingExclusion = await db.query.variantSupplierExclusions.findFirst({
    where: and(
      eq(variantSupplierExclusions.variantId, variantId),
      eq(variantSupplierExclusions.supplierPriceId, supplierPriceId)
    ),
  });

  if (exclude) {
    if (!existingExclusion) {
      await db.insert(variantSupplierExclusions).values({
        id: nanoid(),
        variantId,
        supplierPriceId,
      });
    }
  } else {
    if (existingExclusion) {
      await db
        .delete(variantSupplierExclusions)
        .where(eq(variantSupplierExclusions.id, existingExclusion.id));
    }
  }

  return { success: true };
});
