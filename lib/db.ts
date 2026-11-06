import { getCloudflareContext } from "@opennextjs/cloudflare";

export async function getD1(): Promise<D1Database> {
  const { env } = await getCloudflareContext({ async: true });
  if (!env.DB) throw new Error("قاعدة البيانات غير مهيأة.");
  return env.DB;
}

export async function all<T>(sql: string, values: unknown[] = []): Promise<T[]> {
  const db = await getD1();
  const result = await db.prepare(sql).bind(...values).all<T>();
  return result.results ?? [];
}

export async function first<T>(sql: string, values: unknown[] = []): Promise<T | null> {
  const db = await getD1();
  return db.prepare(sql).bind(...values).first<T>();
}

export async function run(sql: string, values: unknown[] = []) {
  const db = await getD1();
  return db.prepare(sql).bind(...values).run();
}

export function newId(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}
