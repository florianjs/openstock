import { generateId } from '../utils/id';
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
} from '../database/schema';

/**
 * Seed the database with sample data
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
        message: 'Seed endpoint is not configured for production',
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
  await db.delete(supplierPrices);
  await db.delete(productVariants);
  await db.delete(products);
  await db.delete(suppliers);
  await db.delete(categories);
  await db.delete(taxes);

  async function insertInBatches<T>(
    table: any,
    data: T[],
    batchSize: number = 3
  ) {
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      await db.insert(table).values(batch);
    }
  }

  const taxData = [
    { id: generateId('tax'), name: 'TVA 20%', rate: 0.2, isDefault: true },
    { id: generateId('tax'), name: 'TVA 10%', rate: 0.1, isDefault: false },
    { id: generateId('tax'), name: 'TVA 5.5%', rate: 0.055, isDefault: false },
    { id: generateId('tax'), name: 'Exempt', rate: 0, isDefault: false },
  ];
  await insertInBatches(taxes, taxData);

  const electronicsId = generateId('cat');
  const clothingId = generateId('cat');
  const foodId = generateId('cat');

  const categoryData = [
    {
      id: electronicsId,
      name: 'Electronics',
      description: 'Electronic devices and accessories',
      color: '#3B82F6',
    },
    {
      id: generateId('cat'),
      name: 'Smartphones',
      description: 'Mobile phones and accessories',
      parentId: electronicsId,
      color: '#6366F1',
    },
    {
      id: generateId('cat'),
      name: 'Laptops',
      description: 'Portable computers',
      parentId: electronicsId,
      color: '#8B5CF6',
    },
    {
      id: clothingId,
      name: 'Clothing',
      description: 'Apparel and fashion items',
      color: '#EC4899',
    },
    {
      id: generateId('cat'),
      name: 'T-Shirts',
      description: 'Casual wear',
      parentId: clothingId,
      color: '#F472B6',
    },
    {
      id: generateId('cat'),
      name: 'Shoes',
      description: 'Footwear',
      parentId: clothingId,
      color: '#FB7185',
    },
    {
      id: foodId,
      name: 'Food & Beverages',
      description: 'Consumable products',
      color: '#22C55E',
    },
    {
      id: generateId('cat'),
      name: 'Organic',
      description: 'Organic and bio products',
      parentId: foodId,
      color: '#4ADE80',
    },
  ];
  await insertInBatches(categories, categoryData);

  const smartphonesCategory = categoryData[1];
  const laptopsCategory = categoryData[2];
  const tshirtsCategory = categoryData[4];
  const shoesCategory = categoryData[5];
  const organicCategory = categoryData[7];

  const supplierData = [
    {
      id: generateId('sup'),
      name: 'TechDistrib Europe',
      email: 'orders@techdistrib.eu',
      phone: '+33 1 23 45 67 89',
      address: '12 Rue de la Tech',
      city: 'Paris',
      postalCode: '75001',
      country: 'France',
      notes: 'Main electronics supplier, 30 days payment terms',
      isActive: true,
    },
    {
      id: generateId('sup'),
      name: 'FashionWholesale',
      email: 'contact@fashionwholesale.com',
      phone: '+33 4 56 78 90 12',
      address: '45 Avenue de la Mode',
      city: 'Lyon',
      postalCode: '69001',
      country: 'France',
      notes: 'Fast shipping, minimum order 500€',
      isActive: true,
    },
    {
      id: generateId('sup'),
      name: 'BioFresh SARL',
      email: 'commandes@biofresh.fr',
      phone: '+33 2 34 56 78 90',
      address: '8 Chemin des Vignes',
      city: 'Bordeaux',
      postalCode: '33000',
      country: 'France',
      notes: 'Certified organic supplier',
      isActive: true,
    },
    {
      id: generateId('sup'),
      name: 'GlobalTech Asia',
      email: 'sales@globaltech.asia',
      phone: '+86 21 1234 5678',
      address: '888 Innovation Road',
      city: 'Shenzhen',
      postalCode: '518000',
      country: 'China',
      notes: 'Long lead times but competitive prices',
      isActive: true,
    },
    {
      id: generateId('sup'),
      name: 'EcoTextile',
      email: 'info@ecotextile.de',
      phone: '+49 30 123 456',
      address: '15 Grüne Straße',
      city: 'Berlin',
      postalCode: '10115',
      country: 'Germany',
      notes: 'Sustainable and ethical manufacturing',
      isActive: false,
    },
  ];
  await insertInBatches(suppliers, supplierData);

  const productData = [
    {
      id: generateId('prod'),
      sku: 'IPHONE-15-PRO',
      barcode: '0194253123456',
      name: 'iPhone 15 Pro',
      description:
        'Latest Apple smartphone with A17 Pro chip and titanium design',
      categoryId: smartphonesCategory.id,
      costPrice: 899,
      sellingPrice: 1199,
      marginPercent: 33.4,
      taxId: taxData[0].id,
      stockQuantity: 45,
      stockMin: 10,
      stockMax: 100,
      unit: 'unit',
      supplierId: supplierData[0].id,
      isActive: true,
      options: JSON.stringify([
        { name: 'Storage', values: ['128GB', '256GB', '512GB', '1TB'] },
        {
          name: 'Color',
          values: ['Natural Titanium', 'Blue Titanium', 'White Titanium'],
        },
      ]),
    },
    {
      id: generateId('prod'),
      sku: 'MACBOOK-PRO-14',
      barcode: '0194253789012',
      name: 'MacBook Pro 14"',
      description: 'Professional laptop with M3 Pro chip',
      categoryId: laptopsCategory.id,
      costPrice: 1599,
      sellingPrice: 2199,
      marginPercent: 37.5,
      taxId: taxData[0].id,
      stockQuantity: 22,
      stockMin: 5,
      stockMax: 50,
      unit: 'unit',
      supplierId: supplierData[0].id,
      isActive: true,
      options: JSON.stringify([
        { name: 'RAM', values: ['18GB', '36GB'] },
        { name: 'Storage', values: ['512GB', '1TB', '2TB'] },
      ]),
    },
    {
      id: generateId('prod'),
      sku: 'TSHIRT-BASIC',
      barcode: '3700123456789',
      name: 'T-Shirt Premium Cotton',
      description: 'High quality 100% cotton t-shirt, made in Portugal',
      categoryId: tshirtsCategory.id,
      costPrice: 8.5,
      sellingPrice: 24.99,
      marginPercent: 66,
      taxId: taxData[0].id,
      stockQuantity: 350,
      stockMin: 50,
      stockMax: 500,
      unit: 'unit',
      supplierId: supplierData[1].id,
      isActive: true,
      options: JSON.stringify([
        { name: 'Size', values: ['XS', 'S', 'M', 'L', 'XL', 'XXL'] },
        { name: 'Color', values: ['White', 'Black', 'Navy', 'Grey'] },
      ]),
    },
    {
      id: generateId('prod'),
      sku: 'SNEAKERS-RUN',
      barcode: '3700987654321',
      name: 'Running Sneakers Pro',
      description: 'Lightweight running shoes with cushioned sole',
      categoryId: shoesCategory.id,
      costPrice: 45,
      sellingPrice: 89.99,
      marginPercent: 50,
      taxId: taxData[0].id,
      stockQuantity: 78,
      stockMin: 20,
      stockMax: 150,
      unit: 'pair',
      supplierId: supplierData[1].id,
      isActive: true,
      options: JSON.stringify([
        {
          name: 'Size',
          values: ['38', '39', '40', '41', '42', '43', '44', '45'],
        },
        { name: 'Color', values: ['Black/Red', 'White/Blue', 'Grey/Green'] },
      ]),
    },
    {
      id: generateId('prod'),
      sku: 'OLIVE-OIL-BIO',
      barcode: '3760012345678',
      name: 'Organic Extra Virgin Olive Oil',
      description: 'Cold pressed olive oil from Provence, 500ml',
      categoryId: organicCategory.id,
      costPrice: 6.5,
      sellingPrice: 14.99,
      marginPercent: 56.6,
      taxId: taxData[2].id,
      stockQuantity: 120,
      stockMin: 30,
      stockMax: 200,
      unit: 'bottle',
      supplierId: supplierData[2].id,
      isActive: true,
    },
    {
      id: generateId('prod'),
      sku: 'HONEY-BIO-500',
      barcode: '3760098765432',
      name: 'Raw Organic Honey',
      description: 'Unfiltered wildflower honey, 500g jar',
      categoryId: organicCategory.id,
      costPrice: 8,
      sellingPrice: 18.5,
      marginPercent: 56.8,
      taxId: taxData[2].id,
      stockQuantity: 85,
      stockMin: 20,
      stockMax: 150,
      unit: 'jar',
      supplierId: supplierData[2].id,
      isActive: true,
    },
    {
      id: generateId('prod'),
      sku: 'SAMSUNG-S24',
      barcode: '8806095123456',
      name: 'Samsung Galaxy S24 Ultra',
      description: 'Premium Android smartphone with S Pen',
      categoryId: smartphonesCategory.id,
      costPrice: 750,
      sellingPrice: 1099,
      marginPercent: 46.5,
      taxId: taxData[0].id,
      stockQuantity: 0,
      stockMin: 10,
      stockMax: 80,
      unit: 'unit',
      supplierId: supplierData[3].id,
      isActive: true,
      options: JSON.stringify([
        { name: 'Storage', values: ['256GB', '512GB', '1TB'] },
        {
          name: 'Color',
          values: ['Titanium Black', 'Titanium Gray', 'Titanium Violet'],
        },
      ]),
    },
    {
      id: generateId('prod'),
      sku: 'AIRPODS-PRO2',
      barcode: '0194253456789',
      name: 'AirPods Pro 2',
      description: 'Wireless earbuds with active noise cancellation',
      categoryId: smartphonesCategory.id,
      costPrice: 180,
      sellingPrice: 279,
      marginPercent: 35.5,
      taxId: taxData[0].id,
      stockQuantity: 67,
      stockMin: 15,
      stockMax: 100,
      unit: 'unit',
      supplierId: supplierData[0].id,
      isActive: true,
    },
  ];
  await insertInBatches(products, productData, 2);

  const variantData = [
    // iPhone variants
    {
      id: generateId('var'),
      productId: productData[0].id,
      name: '128GB - Natural Titanium',
      sku: 'IPHONE-15-PRO-128-NAT',
      costPrice: 899,
      marginPercent: 33.4,
      price: 1199,
      taxId: taxData[0].id,
      stockQuantity: 15,
      stockMin: 3,
      supplierId: supplierData[0].id,
    },
    {
      id: generateId('var'),
      productId: productData[0].id,
      name: '256GB - Blue Titanium',
      sku: 'IPHONE-15-PRO-256-BLU',
      costPrice: 999,
      marginPercent: 30,
      price: 1299,
      taxId: taxData[0].id,
      stockQuantity: 20,
      stockMin: 5,
      supplierId: supplierData[0].id,
    },
    {
      id: generateId('var'),
      productId: productData[0].id,
      name: '512GB - White Titanium',
      sku: 'IPHONE-15-PRO-512-WHT',
      costPrice: 1149,
      marginPercent: 30.5,
      price: 1499,
      taxId: taxData[0].id,
      stockQuantity: 10,
      stockMin: 2,
      supplierId: supplierData[0].id,
    },
    // T-Shirt variants
    {
      id: generateId('var'),
      productId: productData[2].id,
      name: 'M - White',
      sku: 'TSHIRT-BASIC-M-WHT',
      costPrice: 8.5,
      marginPercent: 66,
      price: 24.99,
      taxId: taxData[0].id,
      stockQuantity: 50,
      stockMin: 10,
      supplierId: supplierData[1].id,
    },
    {
      id: generateId('var'),
      productId: productData[2].id,
      name: 'L - Black',
      sku: 'TSHIRT-BASIC-L-BLK',
      costPrice: 8.5,
      marginPercent: 66,
      price: 24.99,
      taxId: taxData[0].id,
      stockQuantity: 45,
      stockMin: 10,
      supplierId: supplierData[1].id,
    },
    {
      id: generateId('var'),
      productId: productData[2].id,
      name: 'XL - Navy',
      sku: 'TSHIRT-BASIC-XL-NAV',
      costPrice: 8.5,
      marginPercent: 66,
      price: 24.99,
      taxId: taxData[0].id,
      stockQuantity: 30,
      stockMin: 8,
      supplierId: supplierData[1].id,
    },
    // Sneakers variants
    {
      id: generateId('var'),
      productId: productData[3].id,
      name: '42 - Black/Red',
      sku: 'SNEAKERS-42-BLKRED',
      costPrice: 45,
      marginPercent: 50,
      price: 89.99,
      taxId: taxData[0].id,
      stockQuantity: 12,
      stockMin: 3,
      supplierId: supplierData[1].id,
    },
    {
      id: generateId('var'),
      productId: productData[3].id,
      name: '43 - White/Blue',
      sku: 'SNEAKERS-43-WHTBLU',
      costPrice: 45,
      marginPercent: 50,
      price: 89.99,
      taxId: taxData[0].id,
      stockQuantity: 8,
      stockMin: 3,
      supplierId: supplierData[1].id,
    },
  ];
  await insertInBatches(productVariants, variantData);

  const supplierPriceData = [
    // iPhone from main supplier
    {
      id: generateId('sp'),
      productId: productData[0].id,
      supplierId: supplierData[0].id,
      price: 899,
      minQuantity: 1,
      leadTimeDays: 3,
      supplierSku: 'APPLE-IP15P',
      purchaseUrl: 'https://b2b.techdistrib.eu/products/apple-iphone-15-pro',
      isPreferred: true,
    },
    // iPhone from Asia supplier (cheaper but longer lead time)
    {
      id: generateId('sp'),
      productId: productData[0].id,
      supplierId: supplierData[3].id,
      price: 820,
      minQuantity: 10,
      leadTimeDays: 21,
      supplierSku: 'IP15PRO-BULK',
      purchaseUrl: 'https://globaltech.asia/wholesale/iphone-15-pro',
      isPreferred: false,
    },
    // MacBook
    {
      id: generateId('sp'),
      productId: productData[1].id,
      supplierId: supplierData[0].id,
      price: 1599,
      minQuantity: 1,
      leadTimeDays: 5,
      supplierSku: 'APPLE-MBP14',
      purchaseUrl: 'https://b2b.techdistrib.eu/products/macbook-pro-14-m3',
      isPreferred: true,
    },
    // T-Shirt
    {
      id: generateId('sp'),
      productId: productData[2].id,
      supplierId: supplierData[1].id,
      price: 8.5,
      minQuantity: 50,
      leadTimeDays: 7,
      supplierSku: 'TEE-PREM-001',
      purchaseUrl: 'https://fashionwholesale.com/catalog/tee-premium-cotton',
      isPreferred: true,
    },
    // Sneakers
    {
      id: generateId('sp'),
      productId: productData[3].id,
      supplierId: supplierData[1].id,
      price: 45,
      minQuantity: 20,
      leadTimeDays: 10,
      supplierSku: 'SNKR-RUN-PRO',
      purchaseUrl: 'https://fashionwholesale.com/catalog/running-sneakers-pro',
      isPreferred: true,
    },
    // Olive Oil
    {
      id: generateId('sp'),
      productId: productData[4].id,
      supplierId: supplierData[2].id,
      price: 6.5,
      minQuantity: 24,
      leadTimeDays: 4,
      supplierSku: 'BIO-OLIVE-500',
      purchaseUrl: 'https://biofresh.fr/pro/huile-olive-bio-500ml',
      isPreferred: true,
    },
    // Honey
    {
      id: generateId('sp'),
      productId: productData[5].id,
      supplierId: supplierData[2].id,
      price: 8,
      minQuantity: 12,
      leadTimeDays: 4,
      supplierSku: 'BIO-HONEY-500',
      purchaseUrl: 'https://biofresh.fr/pro/miel-brut-bio-500g',
      isPreferred: true,
    },
    // Samsung from Asia
    {
      id: generateId('sp'),
      productId: productData[6].id,
      supplierId: supplierData[3].id,
      price: 750,
      minQuantity: 5,
      leadTimeDays: 14,
      supplierSku: 'SAM-S24U-BULK',
      purchaseUrl: 'https://globaltech.asia/wholesale/samsung-s24-ultra',
      isPreferred: true,
    },
    // AirPods
    {
      id: generateId('sp'),
      productId: productData[7].id,
      supplierId: supplierData[0].id,
      price: 180,
      minQuantity: 5,
      leadTimeDays: 3,
      supplierSku: 'APPLE-APP2',
      purchaseUrl: 'https://b2b.techdistrib.eu/products/airpods-pro-2',
      isPreferred: true,
    },
  ];
  await insertInBatches(supplierPrices, supplierPriceData);

  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const twoMonthsAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
  const sixWeeksAgo = new Date(now.getTime() - 42 * 24 * 60 * 60 * 1000);

  const supplierPriceHistoryData = [
    // iPhone price history (prices went up over time)
    {
      id: generateId('sph'),
      supplierPriceId: supplierPriceData[0].id,
      price: 849,
      createdAt: threeMonthsAgo,
    },
    {
      id: generateId('sph'),
      supplierPriceId: supplierPriceData[0].id,
      price: 869,
      createdAt: twoMonthsAgo,
    },
    {
      id: generateId('sph'),
      supplierPriceId: supplierPriceData[0].id,
      price: 889,
      createdAt: oneMonthAgo,
    },
    {
      id: generateId('sph'),
      supplierPriceId: supplierPriceData[0].id,
      price: 899,
      createdAt: oneWeekAgo,
    },
    // MacBook price history
    {
      id: generateId('sph'),
      supplierPriceId: supplierPriceData[2].id,
      price: 1649,
      createdAt: threeMonthsAgo,
    },
    {
      id: generateId('sph'),
      supplierPriceId: supplierPriceData[2].id,
      price: 1599,
      createdAt: oneMonthAgo,
    },
    // T-Shirt price history (stable then slight increase)
    {
      id: generateId('sph'),
      supplierPriceId: supplierPriceData[3].id,
      price: 7.5,
      createdAt: threeMonthsAgo,
    },
    {
      id: generateId('sph'),
      supplierPriceId: supplierPriceData[3].id,
      price: 8.0,
      createdAt: sixWeeksAgo,
    },
    {
      id: generateId('sph'),
      supplierPriceId: supplierPriceData[3].id,
      price: 8.5,
      createdAt: twoWeeksAgo,
    },
    // Olive oil price history (seasonal variation)
    {
      id: generateId('sph'),
      supplierPriceId: supplierPriceData[5].id,
      price: 5.8,
      createdAt: threeMonthsAgo,
    },
    {
      id: generateId('sph'),
      supplierPriceId: supplierPriceData[5].id,
      price: 6.2,
      createdAt: twoMonthsAgo,
    },
    {
      id: generateId('sph'),
      supplierPriceId: supplierPriceData[5].id,
      price: 6.5,
      createdAt: oneMonthAgo,
    },
  ];
  await insertInBatches(supplierPriceHistory, supplierPriceHistoryData);

  const sellingPriceHistoryData = [
    // iPhone selling price history
    {
      id: generateId('selph'),
      productId: productData[0].id,
      price: 1149,
      createdAt: threeMonthsAgo,
    },
    {
      id: generateId('selph'),
      productId: productData[0].id,
      price: 1179,
      createdAt: twoMonthsAgo,
    },
    {
      id: generateId('selph'),
      productId: productData[0].id,
      price: 1199,
      createdAt: oneMonthAgo,
    },
    // MacBook selling price history
    {
      id: generateId('selph'),
      productId: productData[1].id,
      price: 2299,
      createdAt: threeMonthsAgo,
    },
    {
      id: generateId('selph'),
      productId: productData[1].id,
      price: 2249,
      createdAt: twoMonthsAgo,
    },
    {
      id: generateId('selph'),
      productId: productData[1].id,
      price: 2199,
      createdAt: oneMonthAgo,
    },
    // T-Shirt selling price (promo then back to normal)
    {
      id: generateId('selph'),
      productId: productData[2].id,
      price: 29.99,
      createdAt: threeMonthsAgo,
    },
    {
      id: generateId('selph'),
      productId: productData[2].id,
      price: 19.99,
      createdAt: sixWeeksAgo,
      createdBy: 'promo-black-friday',
    },
    {
      id: generateId('selph'),
      productId: productData[2].id,
      price: 24.99,
      createdAt: twoWeeksAgo,
    },
    // Sneakers price history
    {
      id: generateId('selph'),
      productId: productData[3].id,
      price: 79.99,
      createdAt: threeMonthsAgo,
    },
    {
      id: generateId('selph'),
      productId: productData[3].id,
      price: 84.99,
      createdAt: twoMonthsAgo,
    },
    {
      id: generateId('selph'),
      productId: productData[3].id,
      price: 89.99,
      createdAt: oneMonthAgo,
    },
    // Olive oil (seasonal pricing)
    {
      id: generateId('selph'),
      productId: productData[4].id,
      price: 12.99,
      createdAt: threeMonthsAgo,
    },
    {
      id: generateId('selph'),
      productId: productData[4].id,
      price: 13.99,
      createdAt: twoMonthsAgo,
    },
    {
      id: generateId('selph'),
      productId: productData[4].id,
      price: 14.99,
      createdAt: oneMonthAgo,
    },
    // AirPods (price drop)
    {
      id: generateId('selph'),
      productId: productData[7].id,
      price: 299,
      createdAt: threeMonthsAgo,
    },
    {
      id: generateId('selph'),
      productId: productData[7].id,
      price: 289,
      createdAt: twoMonthsAgo,
    },
    {
      id: generateId('selph'),
      productId: productData[7].id,
      price: 279,
      createdAt: oneMonthAgo,
    },
    // Variant price history (iPhone 256GB variant)
    {
      id: generateId('selph'),
      productId: productData[0].id,
      variantId: variantData[1].id,
      price: 1249,
      createdAt: twoMonthsAgo,
    },
    {
      id: generateId('selph'),
      productId: productData[0].id,
      variantId: variantData[1].id,
      price: 1299,
      createdAt: oneMonthAgo,
    },
  ];
  await insertInBatches(sellingPriceHistory, sellingPriceHistoryData);

  const movementData: Array<{
    id: string;
    productId: string;
    variantId?: string;
    type: 'in' | 'out' | 'adjustment' | 'transfer' | 'return';
    quantity: number;
    stockBefore: number;
    stockAfter: number;
    unitCost: number;
    reference?: string;
    reason?: string;
    supplierId?: string;
    createdAt: Date;
  }> = [];

  // Helper to create a date X days ago
  const daysAgo = (days: number) =>
    new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  // iPhone movements (high velocity product)
  let iphoneStock = 30;
  movementData.push({
    id: generateId('mov'),
    productId: productData[0].id,
    type: 'in',
    quantity: 30,
    stockBefore: 0,
    stockAfter: 30,
    unitCost: 899,
    reference: 'PO-2024-001',
    reason: 'Initial stock',
    supplierId: supplierData[0].id,
    createdAt: daysAgo(14),
  });

  // Simulate daily sales and restocks
  const iphoneDailySales = [3, 2, 4, 1, 5, 2, 3, 6, 2, 4, 3, 2, 5, 3];
  for (let i = 13; i >= 0; i--) {
    const sales = iphoneDailySales[13 - i];
    if (sales > 0) {
      movementData.push({
        id: generateId('mov'),
        productId: productData[0].id,
        type: 'out',
        quantity: -sales,
        stockBefore: iphoneStock,
        stockAfter: iphoneStock - sales,
        unitCost: 899,
        reference: `SO-2024-${100 + (13 - i)}`,
        reason: 'Customer orders',
        createdAt: daysAgo(i),
      });
      iphoneStock -= sales;
    }
    // Restock on specific days
    if (i === 10 || i === 5) {
      movementData.push({
        id: generateId('mov'),
        productId: productData[0].id,
        type: 'in',
        quantity: 20,
        stockBefore: iphoneStock,
        stockAfter: iphoneStock + 20,
        unitCost: 899,
        reference: `PO-2024-00${i === 10 ? 2 : 3}`,
        reason: 'Restock order',
        supplierId: supplierData[0].id,
        createdAt: daysAgo(i),
      });
      iphoneStock += 20;
    }
  }

  // T-Shirt movements (very high velocity)
  let tshirtStock = 200;
  movementData.push({
    id: generateId('mov'),
    productId: productData[2].id,
    type: 'in',
    quantity: 200,
    stockBefore: 0,
    stockAfter: 200,
    unitCost: 8.5,
    reference: 'PO-2024-010',
    reason: 'Seasonal stock',
    supplierId: supplierData[1].id,
    createdAt: daysAgo(14),
  });

  const tshirtDailySales = [
    15, 12, 20, 8, 25, 18, 22, 30, 14, 19, 16, 21, 28, 17,
  ];
  for (let i = 13; i >= 0; i--) {
    const sales = tshirtDailySales[13 - i];
    movementData.push({
      id: generateId('mov'),
      productId: productData[2].id,
      type: 'out',
      quantity: -sales,
      stockBefore: tshirtStock,
      stockAfter: tshirtStock - sales,
      unitCost: 8.5,
      reference: `SO-2024-${200 + (13 - i)}`,
      reason: 'Daily sales',
      createdAt: daysAgo(i),
    });
    tshirtStock -= sales;
    // Big restock mid-period
    if (i === 7) {
      movementData.push({
        id: generateId('mov'),
        productId: productData[2].id,
        type: 'in',
        quantity: 200,
        stockBefore: tshirtStock,
        stockAfter: tshirtStock + 200,
        unitCost: 8.5,
        reference: 'PO-2024-011',
        reason: 'Restock - high demand',
        supplierId: supplierData[1].id,
        createdAt: daysAgo(i),
      });
      tshirtStock += 200;
    }
  }

  // Sneakers movements
  let sneakersStock = 50;
  movementData.push({
    id: generateId('mov'),
    productId: productData[3].id,
    type: 'in',
    quantity: 50,
    stockBefore: 0,
    stockAfter: 50,
    unitCost: 45,
    reference: 'PO-2024-020',
    reason: 'Initial stock',
    supplierId: supplierData[1].id,
    createdAt: daysAgo(14),
  });

  const sneakersSales = [2, 1, 3, 0, 4, 2, 1, 5, 2, 3, 1, 2, 4, 2];
  for (let i = 13; i >= 0; i--) {
    const sales = sneakersSales[13 - i];
    if (sales > 0) {
      movementData.push({
        id: generateId('mov'),
        productId: productData[3].id,
        type: 'out',
        quantity: -sales,
        stockBefore: sneakersStock,
        stockAfter: sneakersStock - sales,
        unitCost: 45,
        reference: `SO-2024-${300 + (13 - i)}`,
        reason: 'Customer order',
        createdAt: daysAgo(i),
      });
      sneakersStock -= sales;
    }
    if (i === 6) {
      movementData.push({
        id: generateId('mov'),
        productId: productData[3].id,
        type: 'in',
        quantity: 40,
        stockBefore: sneakersStock,
        stockAfter: sneakersStock + 40,
        unitCost: 45,
        reference: 'PO-2024-021',
        reason: 'Restock',
        supplierId: supplierData[1].id,
        createdAt: daysAgo(i),
      });
      sneakersStock += 40;
    }
  }

  // Olive oil movements (steady sales)
  let oliveOilStock = 100;
  movementData.push({
    id: generateId('mov'),
    productId: productData[4].id,
    type: 'in',
    quantity: 100,
    stockBefore: 0,
    stockAfter: 100,
    unitCost: 6.5,
    reference: 'PO-2024-030',
    reason: 'Seasonal stock',
    supplierId: supplierData[2].id,
    createdAt: daysAgo(14),
  });

  const oliveOilSales = [5, 4, 6, 3, 7, 5, 4, 8, 5, 6, 4, 5, 7, 6];
  for (let i = 13; i >= 0; i--) {
    const sales = oliveOilSales[13 - i];
    movementData.push({
      id: generateId('mov'),
      productId: productData[4].id,
      type: 'out',
      quantity: -sales,
      stockBefore: oliveOilStock,
      stockAfter: oliveOilStock - sales,
      unitCost: 6.5,
      reference: `SO-2024-${400 + (13 - i)}`,
      reason: 'Daily sales',
      createdAt: daysAgo(i),
    });
    oliveOilStock -= sales;
  }
  // Restock at end
  movementData.push({
    id: generateId('mov'),
    productId: productData[4].id,
    type: 'in',
    quantity: 50,
    stockBefore: oliveOilStock,
    stockAfter: oliveOilStock + 50,
    unitCost: 6.5,
    reference: 'PO-2024-031',
    reason: 'Weekly restock',
    supplierId: supplierData[2].id,
    createdAt: daysAgo(0),
  });

  // AirPods movements
  let airpodsStock = 40;
  movementData.push({
    id: generateId('mov'),
    productId: productData[7].id,
    type: 'in',
    quantity: 40,
    stockBefore: 0,
    stockAfter: 40,
    unitCost: 180,
    reference: 'PO-2024-040',
    reason: 'Initial stock',
    supplierId: supplierData[0].id,
    createdAt: daysAgo(14),
  });

  const airpodsSales = [2, 1, 3, 2, 4, 2, 3, 5, 2, 3, 2, 2, 4, 2];
  for (let i = 13; i >= 0; i--) {
    const sales = airpodsSales[13 - i];
    if (sales > 0) {
      movementData.push({
        id: generateId('mov'),
        productId: productData[7].id,
        type: 'out',
        quantity: -sales,
        stockBefore: airpodsStock,
        stockAfter: airpodsStock - sales,
        unitCost: 180,
        reference: `SO-2024-${500 + (13 - i)}`,
        reason: 'Customer order',
        createdAt: daysAgo(i),
      });
      airpodsStock -= sales;
    }
    if (i === 8) {
      movementData.push({
        id: generateId('mov'),
        productId: productData[7].id,
        type: 'in',
        quantity: 30,
        stockBefore: airpodsStock,
        stockAfter: airpodsStock + 30,
        unitCost: 180,
        reference: 'PO-2024-041',
        reason: 'Restock',
        supplierId: supplierData[0].id,
        createdAt: daysAgo(i),
      });
      airpodsStock += 30;
    }
  }

  // Some returns and adjustments
  movementData.push(
    {
      id: generateId('mov'),
      productId: productData[0].id,
      type: 'return',
      quantity: 1,
      stockBefore: iphoneStock,
      stockAfter: iphoneStock + 1,
      unitCost: 899,
      reference: 'RMA-2024-001',
      reason: 'Customer return - defective screen',
      createdAt: daysAgo(3),
    },
    {
      id: generateId('mov'),
      productId: productData[2].id,
      type: 'adjustment',
      quantity: -5,
      stockBefore: tshirtStock,
      stockAfter: tshirtStock - 5,
      unitCost: 8.5,
      reason: 'Inventory count - 5 units damaged',
      createdAt: daysAgo(2),
    },
    {
      id: generateId('mov'),
      productId: productData[7].id,
      type: 'return',
      quantity: 2,
      stockBefore: airpodsStock,
      stockAfter: airpodsStock + 2,
      unitCost: 180,
      reference: 'RMA-2024-002',
      reason: 'Customer returns - unopened',
      createdAt: daysAgo(1),
    }
  );

  await insertInBatches(stockMovements, movementData, 2);

  return {
    success: true,
    message: 'Database seeded successfully',
    counts: {
      taxes: taxData.length,
      categories: categoryData.length,
      suppliers: supplierData.length,
      products: productData.length,
      variants: variantData.length,
      supplierPrices: supplierPriceData.length,
      supplierPriceHistory: supplierPriceHistoryData.length,
      sellingPriceHistory: sellingPriceHistoryData.length,
      stockMovements: movementData.length,
    },
  };
});
