import { XMLParser } from 'fast-xml-parser';

/** WXR (WordPress eXtended RSS) parser - the precise mode of the scanner, and the heart of the future migrator. */

export interface WxrSummary {
  valid: boolean;
  postCount: number;
  pageCount: number;
  attachmentCount: number;
  cptCounts: Record<string, number>;
  authorCount: number;
  termCount: number;
  shortcodeDensityPerItem: number;
  topShortcodes: string[];
  siteUrl: string | null;
}

const SHORTCODE_RE = /\[([a-z0-9_\-]+)(?:\s[^\]]*)?\]/g;

export function parseWxr(xml: string): WxrSummary {
  const parser = new XMLParser({ ignoreAttributes: false, trimValues: true });
  const doc = parser.parse(xml) as Record<string, unknown>;
  const channel = (doc as { rss?: { channel?: Record<string, unknown> } }).rss?.channel;
  if (!channel) return empty();
  const items = (channel['item'] as Record<string, unknown>[] | undefined) ?? [];
  const summary = empty();
  summary.siteUrl = (typeof channel['link'] === 'string' ? channel['link'] : null) ?? null;
  const authors = new Set<string>();
  const terms = new Set<string>();
  const shortcodeCounter = new Map<string, number>();
  let shortcodesTotal = 0;
  let contentItems = 0;

  for (const item of items) {
    const type = String(item['wp:post_type'] ?? 'post');
    const status = String(item['wp:status'] ?? 'publish');
    if (status === 'trash') continue;
    contentItems++;
    if (type === 'post') summary.postCount++;
    else if (type === 'page') summary.pageCount++;
    else if (type === 'attachment') summary.attachmentCount++;
    else summary.cptCounts[type] = (summary.cptCounts[type] ?? 0) + 1;

    const creator = item['dc:creator'];
    if (typeof creator === 'string' && creator) authors.add(creator);
    const cat = item['category'];
    if (Array.isArray(cat)) cat.forEach((c) => terms.add(String(c)));
    else if (cat) terms.add(String(cat));

    const content = item['content:encoded'];
    if (typeof content === 'string') {
      let m: RegExpExecArray | null;
      SHORTCODE_RE.lastIndex = 0;
      while ((m = SHORTCODE_RE.exec(content)) !== null) {
        shortcodesTotal++;
        shortcodeCounter.set(m[1], (shortcodeCounter.get(m[1]) ?? 0) + 1);
      }
    }
  }
  summary.authorCount = authors.size;
  summary.termCount = terms.size;
  summary.shortcodeDensityPerItem = Math.round((shortcodesTotal / Math.max(1, contentItems)) * 100) / 100;
  summary.topShortcodes = [...shortcodeCounter.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([k]) => k);
  summary.valid = items.length > 0;
  return summary;
}

function empty(): WxrSummary {
  return {
    valid: false, postCount: 0, pageCount: 0, attachmentCount: 0,
    cptCounts: {}, authorCount: 0, termCount: 0, shortcodeDensityPerItem: 0, topShortcodes: [], siteUrl: null,
  };
}
