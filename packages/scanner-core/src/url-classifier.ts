/** URL structure classification from sampled permalinks - decides whether "Zero URL change" is directly supportable in v1. */

export type UrlStructure = 'postname' | 'date-based' | 'query' | 'unknown';

export interface UrlClassification {
  structure: UrlStructure;
  hasQueryPermalinks: boolean;
  samples: { postname: number; date: number; query: number; other: number };
}

export function classifyPermalinks(hrefs: string[]): UrlClassification {
  const samples = { postname: 0, date: 0, query: 0, other: 0 };
  let hasQueryPermalinks = false;
  for (const raw of hrefs) {
    let u: URL;
    try {
      u = new URL(raw);
    } catch {
      continue;
    }
    if (u.search) {
      if (/^[?]?(p|page_id)=\d+/.test(u.search)) {
        samples.query++;
        hasQueryPermalinks = true;
      } else {
        samples.other++;
      }
      continue;
    }
    const p = u.pathname.replace(/\/+$/, '') || '/';
    if (p === '/' || /\/(feed|comments|author|tag|category)(\/|$)/.test(p)) continue;
    if (/\.(html?|php|css|js|xml|txt|jpe?g|png|webp|svg|ico|pdf)$/i.test(p)) continue;
    if (/\/\d{4}\/\d{1,2}(\/\d{1,2})?\//.test(u.pathname)) samples.date++;
    else {
      const depth = p.split('/').filter(Boolean).length;
      const looksLikeSlug = /^[\p{L}\p{N}%._~-]+$/u.test(p.split('/').filter(Boolean).pop() || '');
      if (looksLikeSlug && depth <= 4) samples.postname++;
      else samples.other++;
    }
  }
  const total = samples.postname + samples.date + samples.query + samples.other;
  let structure: UrlStructure = 'unknown';
  if (total > 0) {
    if (samples.query / total > 0.5) structure = 'query';
    else if (samples.date / total > 0.3) structure = 'date-based';
    else if (samples.postname / total >= 0.4) structure = 'postname';
  }
  return { structure, hasQueryPermalinks, samples };
}
