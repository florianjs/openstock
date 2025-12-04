import { drizzle } from 'drizzle-orm/d1';
import * as schema from '../database/schema';

export const tables = schema;

export function useDB() {
  return drizzle(hubDatabase(), { schema });
}

export const useDrizzle = useDB;
