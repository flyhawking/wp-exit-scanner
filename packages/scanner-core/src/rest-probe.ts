import { Fetcher } from './fetcher.js';

/** Probe public WP REST API endpoints. Read-only, per_page=1, count via X-WP-Total headers. */

export interface RestProbeResult {
  restAvailable: boolean;
  cptTypes: string[];
  mediaCount: number | null;
  pageCount: number | null;
  postCount: number | null;
}

const DEFAULT_TYPES = new Set([
  'post', 'page', 'attachment', 'nav_menu_item', 'wp_block', 'wp_template',
  'wp_template_part', 'wp_navigation', 'wp_font_family', 'wp_font_face',
]);

async function total(fetcher: Fetcher, url: string): Promise<number | null> {
  const res = await fetcher.fetchPage(url);
  if (!res.ok) return null;
  const t = res.html ? undefined : undefined; // headers not exposed in FetchedPage; use JSON body fallback
  void t;
  return null;
}

/** fetch with headers (separate from page fetch since we need response headers). */
async function fetchJsonTotal(fetcher: Fetcher, url: string): Promise<number | null> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const ua = (fetcher as unknown as { opts: { userAgent: string } }).opts.userAgent;
    const res = await fetch(url, { signal: ctrl.signal, headers: { 'user-agent': ua } });
    clearTimeout(timer);
    if (!res.ok) return null;
    const total = res.headers.get('x-wp-total');
    if (total && /^\d+$/.test(total)) return parseInt(total, 10);
    const body = (await res.json().catch(() => null)) as unknown[] | null;
    return Array.isArray(body) ? body.length : null;
  } catch {
    return null;
  }
}

export async function probeRest(fetcher: Fetcher, origin: string): Promise<RestProbeResult> {
  const out: RestProbeResult = {
    restAvailable: false, cptTypes: [], mediaCount: null, pageCount: null, postCount: null,
  };
  const root = await fetchJsonTotal(fetcher, `${origin}/wp-json/`);
  out.restAvailable = root !== null || (await fetcher.fetchPage(`${origin}/wp-json/wp/v2/posts?per_page=1`)).ok;
  if (!out.restAvailable) return out;

  const typesUrl = `${origin}/wp-json/wp/v2/types?context=view`;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const ua = (fetcher as unknown as { opts: { userAgent: string } }).opts.userAgent;
    const res = await fetch(typesUrl, { signal: ctrl.signal, headers: { 'user-agent': ua } });
    clearTimeout(timer);
    if (res.ok) {
      const body = (await res.json().catch(() => null)) as Record<string, { slug?: string; rest_base?: string }> | null;
      if (body) {
        out.cptTypes = Object.keys(body).filter((k) => !DEFAULT_TYPES.has(k) && body[k]?.rest_base);
      }
    }
  } catch { /* ignore */ }

  const [pages, posts, media] = await Promise.all([
    fetchJsonTotal(fetcher, `${origin}/wp-json/wp/v2/pages?per_page=1`),
    fetchJsonTotal(fetcher, `${origin}/wp-json/wp/v2/posts?per_page=1`),
    fetchJsonTotal(fetcher, `${origin}/wp-json/wp/v2/media?per_page=1`),
  ]);
  out.pageCount = pages;
  out.postCount = posts;
  out.mediaCount = media;
  return out;
}

export { total };
