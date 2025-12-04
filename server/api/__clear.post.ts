import {
  taxes,
  categories,
  suppliers,
  products,
  productVariants,
  supplierPrices,
  supplierPriceHistory,
  sellingPriceHistory,
  stockMovements,
  variantSupplierExclusions,
} from '../database/schema';

/**
 * Clear all data from the database EXCEPT users/settings
 * - In development: always accessible
 * - In production: requires NUXT_ADMIN_SECRET_KEY via query param or header
 */
export default defineEventHandler(async (event) => {
  // Allow in dev mode without any checks
  if (!import.meta.dev) {
    // In production, require secret key
    const secretKey = useRuntimeConfig().adminSecretKey;

    if (!secretKey) {
      throw createError({
        statusCode: 403,
        message: 'Clear endpoint is not configured for production',
      });
    }

    // Check for secret in query param or header
    const query = getQuery(event);
    const headerKey = getHeader(event, 'x-admin-secret');
    const providedKey = (query.key as string) || headerKey;

    if (providedKey !== secretKey) {
      throw createError({
        statusCode: 403,
        message: 'Invalid or missing admin secret key',
      });
    }
  }

  const db = useDB();

  await db.delete(stockMovements);
  await db.delete(sellingPriceHistory);
  await db.delete(supplierPriceHistory);
  await db.delete(variantSupplierExclusions);
  await db.delete(supplierPrices);
  await db.delete(productVariants);
  await db.delete(products);
  await db.delete(suppliers);
  await db.delete(categories);
  await db.delete(taxes);

  return {
    success: true,
    message: 'Database cleared successfully (settings preserved)',
  };
});
