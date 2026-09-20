import { Fetcher, crawlPages } from './fetcher';
import { detectAcf, detectBuilders, detectTheme, extractPluginSlugs } from './fingerprints';
import { probeRest } from './rest-probe';
import { classifyPermalinks } from './url-classifier';
import { evaluate } from './scoring';
import type { FetcherOptions, ScanReport, ScanStats } from './types';

export type { ScanReport, ScanStats, Finding, Light, MigrationPath } from './types';

/** Orchestrator: URL mode scan. Everything public, read-only, rate-limited. */

export interface ScanSiteOptions extends FetcherOptions {
  maxPages?: number;
}

export async function scanSite(rawUrl: string, opts: ScanSiteOptions = {}): Promise<ScanReport> {
  const started = Date.now();
  const input = { url: rawUrl, mode: 'url' as const, scannedAt: new Date().toISOString() };
  const origin = new URL(rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`).origin;
  const fetcher = new Fetcher(opts);
  const maxPages = opts.maxPages ?? 12;

  const emptyStats = (over: Partial<ScanStats> = {}): ScanStats => ({
    pagesSampled: 0, plugins: [], builders: [], themeType: 'unknown', themeSlug: null,
    cptCount: 0, cptTypes: [], hasAcf: false, shortcodeDensityPerPost: 0,
    urlStructure: 'unknown', mediaCount: null, pageCount: null, ...over,
  });

  // 1. Homepage + detection
  const home = await fetcher.fetchPage(origin + '/');
  const wpEvidence = detectWordPress(home.html);
  if (!wpEvidence.length) {
    return {
      input, isWordPress: false, evidence: [], score: 0, light: 'red', flags: [],
      findings: [], path: 'not-suitable',
      summary: "This doesn't look like a WordPress site. If it is one, its /wp-json endpoint may be disabled - try the WXR upload mode instead.",
      stats: emptyStats(), durationMs: Date.now() - started,
    };
  }

  // 2. REST probe + page discovery in parallel
  const [rest, sampleUrls] = await Promise.all([
    probeRest(fetcher, origin),
    discoverPages(fetcher, origin, home.html, maxPages),
  ]);

  // 3. Sample pages
  const pages = await crawlPages(fetcher, sampleUrls, { maxPages, concurrency: opts.concurrency ?? 5 });
  const htmls = [home.html, ...pages.filter((p) => p.ok).map((p) => p.html)];

  // 4. Fingerprints & metrics
  const pluginSlugs = extractPluginSlugs(htmls);
  const builders = detectBuilders(htmls);
  const theme = detectTheme(htmls);
  const hasAcf = detectAcf(htmls, pluginSlugs);
  const density = shortcodeDensity(htmls);
  const hrefs = htmls.flatMap((h) => extractHrefs(h, origin));
  const urlInfo = classifyPermalinks(hrefs);

  const cptCount = rest.cptTypes.filter((t) => !/^(jp_|jetpack)/.test(t) && t !== 'feedback').length;
  const contentCount = (rest.pageCount ?? 0) + (rest.postCount ?? 0) || null;

  const stats: ScanStats = {
    pagesSampled: htmls.length,
    plugins: pluginSlugs,
    builders,
    themeType: theme.type,
    themeSlug: theme.slug,
    cptCount,
    cptTypes: rest.cptTypes,
    hasAcf,
    shortcodeDensityPerPost: density,
    urlStructure: urlInfo.structure,
    mediaCount: rest.mediaCount,
    pageCount: contentCount,
  };

  const result = evaluate({
    builders, plugins: pluginSlugs, theme, hasAcf,
    shortcodeDensity: density, url: urlInfo, mediaCount: rest.mediaCount, contentCount,
    cptCount,
  });

  return {
    input, isWordPress: true, evidence: wpEvidence,
    score: result.score, light: result.light, flags: result.flags,
    findings: result.findings, path: result.path, summary: result.summary,
    stats, durationMs: Date.now() - started,
  };
}

export function detectWordPress(html: string): string[] {
  const ev: string[] = [];
  if (/name="generator" content="wordpress/i.test(html)) ev.push('generator meta tag');
  if (/\/wp-content\//.test(html)) ev.push('/wp-content/ asset paths');
  if (/\/wp-includes\//.test(html)) ev.push('/wp-includes/ asset paths');
  if (/wp-emoji|wp-block-library/.test(html)) ev.push('core asset references');
  return ev;
}

/** Discover sample pages: sitemap first, then homepage same-origin links. */
async function discoverPages(fetcher: Fetcher, origin: string, homeHtml: string, maxPages: number): Promise<string[]> {
  const urls = new Set<string>();
  const sitemap = await fetcher.fetchPage(`${origin}/sitemap.xml`);
  if (sitemap.ok) {
    for (const m of sitemap.html.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)) {
      const u = m[1];
      if (u.startsWith(origin) && !/\.(xml|xsl|css|js|jpe?g|png|webp|pdf)$/i.test(u) && !/\/(wp-content|wp-includes|wp-admin)\//.test(u)) {
        urls.add(u);
      }
    }
  }
  if (urls.size < maxPages) {
    for (const m of homeHtml.matchAll(/href="(https?:\/\/[^"#?]+)"/gi)) {
      const u = m[1];
      if (u.startsWith(origin) && !/\.(xml|css|js|jpe?g|png|webp|svg|ico|pdf|txt)$/i.test(u) && !/\/(wp-content|wp-includes|wp-admin|feed|comment|author)\//.test(u)) {
        urls.add(u);
      }
    }
  }
  urls.delete(origin + '/');
  return [...urls].slice(0, Math.max(0, maxPages - 1));
}

export function extractHrefs(html: string, origin: string): string[] {
  const out: string[] = [];
  for (const m of html.matchAll(/href="([^"#]+)"/gi)) {
    const u = m[1];
    if (u.startsWith(origin)) out.push(u);
    else if (u.startsWith('/') && !u.startsWith('//')) out.push(origin + u);
  }
  return out;
}

export function shortcodeDensity(htmls: string[]): number {
  let total = 0;
  let pages = 0;
  for (const html of htmls) {
    const body = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '');
    const matches = body.match(/\[[a-z0-9_\-]+(\s[^\]]*)?\]/g) || [];
    // filter obvious non-shortcode bracket text
    const real = matches.filter((s) => /^[a-z][a-z0-9_\-]{2,}$/.test(s.slice(1, -1).trim().split(/\s/)[0]));
    if (real.length || body.length > 500) {
      total += real.length;
      pages++;
    }
  }
  return pages ? Math.round((total / pages) * 100) / 100 : 0;
}
