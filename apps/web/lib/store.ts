import type { ScanReport } from '../components/scan-types';
import { getCfEnv, type D1Like, type KvLike } from './cf';

/**
 * Storage layer.
 *
 * Cloudflare:   KV  -> full report JSON, 7-day TTL (cheap, edge-replicated, no schema)
 *               D1  -> scan metadata rows + waitlist emails (SQL, gives us the aggregate stats)
 * Local / build / fallback: in-memory maps.
 *
 * No traditional database server is involved anywhere.
 */

const TTL_SECONDS = 7 * 24 * 60 * 60;
const TTL_MS = TTL_SECONDS * 1000;
const REPORT_PREFIX = 'report:';

// ---------- in-memory fallback ----------
const memReports = new Map<string, { report: ScanReport; expiresAt: number }>();
const memEmails = new Set<string>();
const memScans: ScanRow[] = [];

interface ScanRow {
  id: string;
  host: string;
  score: number;
  light: string;
  path: string;
  builders: string[];
  createdAt: number;
}

export interface ScanAggregate {
  scans: number;
  canMigrate: number;
  waitlist: number;
  topBlockers: Array<{ name: string; count: number }>;
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return 'unknown';
  }
}

// ---------- KV ----------
function kv(): Promise<KvLike | null> {
  return getCfEnv().then((env) => env?.REPORTS ?? null);
}

// ---------- D1 with graceful degradation ----------
async function db(): Promise<D1Like | null> {
  const env = await getCfEnv();
  return env?.DB ?? null;
}

export const reportStore = {
  async put(id: string, report: ScanReport): Promise<void> {
    const store = await kv();
    if (store) {
      await store.put(REPORT_PREFIX + id, JSON.stringify(report), { expirationTtl: TTL_SECONDS });
    } else {
      memReports.set(id, { report, expiresAt: Date.now() + TTL_MS });
    }
    await recordScan(id, report);
  },

  async get(id: string): Promise<ScanReport | null> {
    const store = await kv();
    if (store) {
      const raw = await store.get(REPORT_PREFIX + id);
      return raw ? (JSON.parse(raw) as ScanReport) : null;
    }
    const hit = memReports.get(id);
    if (!hit) return null;
    if (Date.now() > hit.expiresAt) {
      memReports.delete(id);
      return null;
    }
    return hit.report;
  },

  /** Aggregate numbers for the landing page and the public stats page. */
  async stats(): Promise<ScanAggregate> {
    const d = await db();
    const empty: ScanAggregate = { scans: 0, canMigrate: 0, waitlist: 0, topBlockers: [] };
    if (!d) {
      return {
        scans: memScans.length,
        canMigrate: memScans.filter((s) => s.path === 'v1-ready').length,
        waitlist: memEmails.size,
        topBlockers: topOf(memScans.flatMap((s) => s.builders)),
      };
    }
    try {
      const [scans, migrate, waitlist] = await Promise.all([
        d.prepare('SELECT COUNT(*) AS n FROM scans').first<{ n: number }>(),
        d.prepare("SELECT COUNT(*) AS n FROM scans WHERE path = 'v1-ready'").first<{ n: number }>(),
        d.prepare('SELECT COUNT(*) AS n FROM waitlist').first<{ n: number }>(),
      ]);
      const blockers = await d
        .prepare(
          `SELECT builders FROM scans
             WHERE builders IS NOT NULL AND builders != ''
             ORDER BY created_at DESC LIMIT 500`,
        )
        .all<{ builders: string }>();
      return {
        scans: scans?.n ?? 0,
        canMigrate: migrate?.n ?? 0,
        waitlist: waitlist?.n ?? 0,
        topBlockers: topOf(
          blockers.results.flatMap((r) => (r.builders ? r.builders.split(',').filter(Boolean) : [])),
        ),
      };
    } catch (err) {
      console.error('[store] stats failed', err);
      return empty;
    }
  },
};

function topOf(values: string[]): Array<{ name: string; count: number }> {
  const counts = new Map<string, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

async function recordScan(id: string, report: ScanReport): Promise<void> {
  const row: ScanRow = {
    id,
    host: hostOf(report.input.url),
    score: report.score,
    light: report.light,
    path: report.path,
    builders: report.stats.builders,
    createdAt: Date.now(),
  };
  const d = await db();
  if (!d) {
    memScans.push(row);
    return;
  }
  try {
    await d
      .prepare(
        `INSERT OR REPLACE INTO scans (id, host, score, light, path, builders, cpt_count, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        row.id,
        row.host,
        row.score,
        row.light,
        row.path,
        row.builders.join(','),
        report.stats.cptCount,
        row.createdAt,
      )
      .run();
  } catch (err) {
    // Never fail a scan because analytics row failed.
    console.error('[store] recordScan failed', err);
  }
}

export const emailStore = {
  async add(email: string, meta: { reportId: string; score: number; path: string }): Promise<void> {
    const normalized = email.toLowerCase();
    const d = await db();
    if (!d) {
      memEmails.add(normalized);
      console.log(`[waitlist] ${normalized} <- report=${meta.reportId} score=${meta.score} path=${meta.path}`);
      return;
    }
    try {
      await d
        .prepare(
          `INSERT OR REPLACE INTO waitlist (email, report_id, score, path, created_at)
           VALUES (?, ?, ?, ?, ?)`,
        )
        .bind(normalized, meta.reportId, meta.score, meta.path, Date.now())
        .run();
    } catch (err) {
      console.error('[store] waitlist insert failed', err);
      throw err;
    }
  },

  async has(email: string): Promise<boolean> {
    const normalized = email.toLowerCase();
    const d = await db();
    if (!d) return memEmails.has(normalized);
    const row = await d
      .prepare('SELECT 1 AS x FROM waitlist WHERE email = ?')
      .bind(normalized)
      .first<{ x: number }>();
    return Boolean(row);
  },
};
