import { eq, desc } from 'drizzle-orm';
import {
  products,
  supplierPrices,
  supplierPriceHistory,
  sellingPriceHistory,
} from '~~/server/database/schema';

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');
  const db = useDrizzle();

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Product ID is required',
    });
  }

  const product = await db.query.products.findFirst({
    where: eq(products.id, id),
    columns: {
      sellingPrice: true,
      costPrice: true,
    },
  });

  if (!product) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Product not found',
    });
  }

  const sellingHistory = await db.query.sellingPriceHistory.findMany({
    where: eq(sellingPriceHistory.productId, id),
    orderBy: [desc(sellingPriceHistory.createdAt)],
    limit: 50,
  });

  const productSuppliers = await db.query.supplierPrices.findMany({
    where: eq(supplierPrices.productId, id),
    with: {
      supplier: {
        columns: {
          id: true,
          name: true,
        },
      },
      priceHistory: {
        orderBy: [desc(supplierPriceHistory.createdAt)],
        limit: 50,
      },
    },
  });

  const allDates = new Set<string>();

  sellingHistory.forEach((h) => {
    if (h.createdAt) {
      allDates.add(new Date(h.createdAt).toISOString().split('T')[0]);
    }
  });

  productSuppliers.forEach((sp) => {
    sp.priceHistory?.forEach((h) => {
      if (h.createdAt) {
        allDates.add(new Date(h.createdAt).toISOString().split('T')[0]);
      }
    });
  });

  if (allDates.size === 0) {
    allDates.add(new Date().toISOString().split('T')[0]);
  }

  const sortedDates = Array.from(allDates).sort();

  const sellingPriceData = sortedDates.map((date) => {
    const relevantHistory = sellingHistory
      .filter(
        (h) =>
          h.createdAt &&
          new Date(h.createdAt).toISOString().split('T')[0] <= date
      )
      .sort(
        (a, b) =>
          new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
      );

    return relevantHistory.length > 0
      ? relevantHistory[0].price
      : product.sellingPrice || 0;
  });

  const supplierDatasets = productSuppliers.map((sp) => {
    const priceData = sortedDates.map((date) => {
      const relevantHistory = (sp.priceHistory || [])
        .filter(
          (h) =>
            h.createdAt &&
            new Date(h.createdAt).toISOString().split('T')[0] <= date
        )
        .sort(
          (a, b) =>
            new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
        );

      return relevantHistory.length > 0 ? relevantHistory[0].price : sp.price;
    });

    return {
      supplierId: sp.supplierId,
      supplierName: sp.supplier.name,
      currentPrice: sp.price,
      data: priceData,
    };
  });

  return {
    labels: sortedDates,
    sellingPrice: {
      current: product.sellingPrice || 0,
      data: sellingPriceData,
    },
    suppliers: supplierDatasets,
  };
});
