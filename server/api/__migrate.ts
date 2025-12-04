export default defineEventHandler(async (event) => {
  // Protect migration endpoint with a secret key
  // Only allow in development OR with valid MIGRATE_SECRET header
  const isDev = process.dev;
  const migrateSecret = process.env.NUXT_MIGRATE_SECRET;
  const providedSecret = getHeader(event, 'x-migrate-secret');

  if (!isDev) {
    if (!migrateSecret) {
      throw createError({
        statusCode: 503,
        message:
          'Migration endpoint not configured. Set NUXT_MIGRATE_SECRET environment variable.',
      });
    }
    if (providedSecret !== migrateSecret) {
      throw createError({
        statusCode: 401,
        message: 'Invalid or missing migration secret',
      });
    }
  }

  const db = hubDatabase();

  const createStatements = [
    `CREATE TABLE IF NOT EXISTS users (
      id text PRIMARY KEY NOT NULL,
      email text NOT NULL UNIQUE,
      password_hash text NOT NULL,
      name text NOT NULL,
      role text NOT NULL DEFAULT 'member',
      is_active integer DEFAULT 1,
      created_at integer,
      updated_at integer
    )`,
    `CREATE TABLE IF NOT EXISTS taxes (
      id text PRIMARY KEY NOT NULL,
      name text NOT NULL,
      rate real NOT NULL,
      is_default integer DEFAULT 0,
      created_at integer,
      updated_at integer
    )`,
    `CREATE TABLE IF NOT EXISTS suppliers (
      id text PRIMARY KEY NOT NULL,
      name text NOT NULL,
      email text,
      phone text,
      address text,
      city text,
      postal_code text,
      country text DEFAULT 'France',
      notes text,
      is_active integer DEFAULT 1,
      created_at integer,
      updated_at integer
    )`,
    `CREATE TABLE IF NOT EXISTS categories (
      id text PRIMARY KEY NOT NULL,
      name text NOT NULL,
      description text,
      parent_id text,
      color text DEFAULT '#6B7280',
      created_at integer,
      updated_at integer,
      FOREIGN KEY (parent_id) REFERENCES categories(id) ON UPDATE no action ON DELETE no action
    )`,
    `CREATE TABLE IF NOT EXISTS products (
      id text PRIMARY KEY NOT NULL,
      sku text,
      barcode text,
      name text NOT NULL,
      description text,
      category_id text,
      cost_price real DEFAULT 0,
      selling_price real DEFAULT 0,
      margin_percent real DEFAULT 30,
      tax_id text,
      stock_quantity integer DEFAULT 0,
      stock_min integer DEFAULT 0,
      stock_max integer,
      unit text DEFAULT 'unit',
      supplier_id text,
      is_active integer DEFAULT 1,
      options text,
      created_at integer,
      updated_at integer,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON UPDATE no action ON DELETE no action,
      FOREIGN KEY (tax_id) REFERENCES taxes(id) ON UPDATE no action ON DELETE no action,
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON UPDATE no action ON DELETE no action
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS products_sku_unique ON products (sku)`,
    `CREATE TABLE IF NOT EXISTS product_variants (
      id text PRIMARY KEY NOT NULL,
      product_id text NOT NULL,
      name text NOT NULL,
      sku text,
      barcode text,
      cost_price real DEFAULT 0,
      margin_percent real DEFAULT 30,
      price real DEFAULT 0,
      tax_id text,
      stock_quantity integer DEFAULT 0,
      stock_min integer DEFAULT 0,
      stock_max integer,
      supplier_id text,
      created_at integer,
      updated_at integer,
      FOREIGN KEY (product_id) REFERENCES products(id) ON UPDATE no action ON DELETE cascade,
      FOREIGN KEY (tax_id) REFERENCES taxes(id) ON UPDATE no action ON DELETE no action,
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON UPDATE no action ON DELETE no action
    )`,
    `CREATE TABLE IF NOT EXISTS stock_movements (
      id text PRIMARY KEY NOT NULL,
      product_id text NOT NULL,
      variant_id text,
      type text NOT NULL,
      quantity integer NOT NULL,
      stock_before integer NOT NULL,
      stock_after integer NOT NULL,
      unit_cost real,
      reference text,
      reason text,
      supplier_id text,
      created_at integer,
      FOREIGN KEY (product_id) REFERENCES products(id) ON UPDATE no action ON DELETE cascade,
      FOREIGN KEY (variant_id) REFERENCES product_variants(id),
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON UPDATE no action ON DELETE no action
    )`,
    `CREATE TABLE IF NOT EXISTS supplier_prices (
      id text PRIMARY KEY NOT NULL,
      product_id text NOT NULL,
      supplier_id text NOT NULL,
      price real NOT NULL,
      min_quantity integer DEFAULT 1,
      lead_time_days integer,
      supplier_sku text,
      purchase_url text,
      is_preferred integer DEFAULT 0,
      created_at integer,
      updated_at integer,
      FOREIGN KEY (product_id) REFERENCES products(id) ON UPDATE no action ON DELETE cascade,
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON UPDATE no action ON DELETE cascade
    )`,
    `CREATE TABLE IF NOT EXISTS supplier_price_history (
      id text PRIMARY KEY NOT NULL,
      supplier_price_id text NOT NULL,
      price real NOT NULL,
      created_at integer,
      created_by text,
      FOREIGN KEY (supplier_price_id) REFERENCES supplier_prices(id) ON UPDATE no action ON DELETE cascade
    )`,
    `CREATE TABLE IF NOT EXISTS selling_price_history (
      id text PRIMARY KEY NOT NULL,
      product_id text NOT NULL,
      variant_id text,
      price real NOT NULL,
      created_at integer,
      created_by text,
      FOREIGN KEY (product_id) REFERENCES products(id) ON UPDATE no action ON DELETE cascade,
      FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON UPDATE no action ON DELETE cascade
    )`,
    `CREATE TABLE IF NOT EXISTS variant_supplier_exclusions (
      id text PRIMARY KEY NOT NULL,
      variant_id text NOT NULL,
      supplier_price_id text NOT NULL,
      created_at integer,
      FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON UPDATE no action ON DELETE cascade,
      FOREIGN KEY (supplier_price_id) REFERENCES supplier_prices(id) ON UPDATE no action ON DELETE cascade
    )`,
    `CREATE TABLE IF NOT EXISTS settings (
      id integer PRIMARY KEY NOT NULL,
      business_name text DEFAULT 'OpenStock Inc.',
      currency text DEFAULT 'EUR',
      default_margin real DEFAULT 30,
      low_stock_alert integer DEFAULT 1,
      out_of_stock_alert integer DEFAULT 1,
      email_daily_report integer DEFAULT 0,
      updated_at integer
    )`,
  ];

  const alterStatements = [
    `ALTER TABLE product_variants ADD COLUMN barcode text`,
    `ALTER TABLE product_variants ADD COLUMN margin_percent real DEFAULT 30`,
    `ALTER TABLE product_variants ADD COLUMN tax_id text REFERENCES taxes(id)`,
    `ALTER TABLE product_variants ADD COLUMN stock_max integer`,
    `ALTER TABLE product_variants ADD COLUMN supplier_id text REFERENCES suppliers(id)`,
    `ALTER TABLE supplier_prices ADD COLUMN purchase_url text`,
  ];

  const results: string[] = [];

  try {
    for (const sql of createStatements) {
      await db.prepare(sql).run();
    }
    results.push('Tables created successfully');

    for (const sql of alterStatements) {
      try {
        await db.prepare(sql).run();
        results.push(`Applied: ${sql.substring(0, 60)}...`);
      } catch (error) {
        const errorMessage = String(error);
        if (errorMessage.includes('duplicate column name')) {
          results.push(`Skipped (already exists): ${sql.substring(0, 60)}...`);
        } else {
          throw error;
        }
      }
    }

    return {
      success: true,
      message: 'Migrations applied successfully',
      results,
    };
  } catch (error) {
    return { success: false, error: String(error), results };
  }
});
