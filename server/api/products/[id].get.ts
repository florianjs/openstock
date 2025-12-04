import { eq, desc } from 'drizzle-orm';
import {
  products,
  productVariants,
  supplierPrices,
  supplierPriceHistory,
} from '~~/server/database/schema';

export default defineEventHandler(async (event) => {
  const db = useDB();
  const id = getRouterParam(event, 'id');

  if (!id) {
    throw createError({ statusCode: 400, message: 'Product ID is required' });
  }

  const product = await db.query.products.findFirst({
    where: eq(products.id, id),
    with: {
      category: true,
      tax: true,
      supplier: true,
    },
  });

  if (!product) {
    throw createError({ statusCode: 404, message: 'Product not found' });
  }

  const variants = await db.query.productVariants.findMany({
    where: eq(productVariants.productId, id),
    with: {
      supplier: true,
      tax: true,
    },
  });

  const productSuppliers = await db.query.supplierPrices.findMany({
    where: eq(supplierPrices.productId, id),
    with: {
      supplier: true,
      priceHistory: {
        orderBy: [desc(supplierPriceHistory.createdAt)],
      },
      variantExclusions: true,
    },
  });

  const bestSupplier =
    productSuppliers.length > 0
      ? productSuppliers.reduce((best, current) =>
          current.price < best.price ? current : best
        )
      : null;

  const totalVariantStock = variants.reduce(
    (sum, v) => sum + (v.stockQuantity || 0),
    0
  );

  return {
    ...product,
    variants,
    stockQuantity:
      variants.length > 0 ? totalVariantStock : product.stockQuantity,
    productSuppliers,
    bestSupplierId: bestSupplier?.supplierId || null,
    bestSupplierPrice: bestSupplier?.price || null,
  };
});
