/**
 * Cloudflare bindings accessor.
 *
 * On Workers (production) this returns the real KV namespace + D1 database.
 * Locally (`next dev` / `next start` outside wrangler) and at build time it
 * returns null, and the store layer falls back to an in-memory implementation.
 *
 * Structural types are declared locally so the project needs no
 * `@cloudflare/workers-types` dependency (and no global type collisions).
 */

export interface KvLike {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
}

export interface D1StmtLike {
  bind(...values: unknown[]): D1StmtLike;
  run(): Promise<unknown>;
  first<T = unknown>(): Promise<T | null>;
  all<T = unknown>(): Promise<{ results: T[] }>;
}

export interface D1Like {
  prepare(query: string): D1StmtLike;
}

export interface CfEnv {
  REPORTS?: KvLike;
  DB?: D1Like;
}

let cached: CfEnv | null | undefined;

export async function getCfEnv(): Promise<CfEnv | null> {
  if (cached !== undefined) return cached;
  try {
    const mod = await import('@opennextjs/cloudflare');
    const ctx = await mod.getCloudflareContext({ async: true });
    cached = ((ctx?.env ?? null) as CfEnv | null) ?? null;
  } catch {
    cached = null;
  }
  return cached;
}
