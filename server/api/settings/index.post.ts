import { eq } from 'drizzle-orm';
import { settings } from '~~/server/database/schema';

export default defineEventHandler(async (event) => {
  const db = useDB();
  const body = await readBody(event);

  // Update settings (ID 1)
  const [updatedSettings] = await db.update(settings)
    .set({
      ...body,
      updatedAt: new Date(),
    })
    .where(eq(settings.id, 1))
    .returning();

  return updatedSettings;
});
