"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.probeRest = probeRest;
exports.total = total;
const DEFAULT_TYPES = new Set([
    'post', 'page', 'attachment', 'nav_menu_item', 'wp_block', 'wp_template',
    'wp_template_part', 'wp_navigation', 'wp_font_family', 'wp_font_face',
]);
async function total(fetcher, url) {
    const res = await fetcher.fetchPage(url);
    if (!res.ok)
        return null;
    const t = res.html ? undefined : undefined; // headers not exposed in FetchedPage; use JSON body fallback
    void t;
    return null;
}
/** fetch with headers (separate from page fetch since we need response headers). */
async function fetchJsonTotal(fetcher, url) {
    try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 8000);
        const ua = fetcher.opts.userAgent;
        const res = await fetch(url, { signal: ctrl.signal, headers: { 'user-agent': ua } });
        clearTimeout(timer);
        if (!res.ok)
            return null;
        const total = res.headers.get('x-wp-total');
        if (total && /^\d+$/.test(total))
            return parseInt(total, 10);
        const body = (await res.json().catch(() => null));
        return Array.isArray(body) ? body.length : null;
    }
    catch {
        return null;
    }
}
async function probeRest(fetcher, origin) {
    const out = {
        restAvailable: false, cptTypes: [], mediaCount: null, pageCount: null, postCount: null,
    };
    const root = await fetchJsonTotal(fetcher, `${origin}/wp-json/`);
    out.restAvailable = root !== null || (await fetcher.fetchPage(`${origin}/wp-json/wp/v2/posts?per_page=1`)).ok;
    if (!out.restAvailable)
        return out;
    const typesUrl = `${origin}/wp-json/wp/v2/types?context=view`;
    try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 8000);
        const ua = fetcher.opts.userAgent;
        const res = await fetch(typesUrl, { signal: ctrl.signal, headers: { 'user-agent': ua } });
        clearTimeout(timer);
        if (res.ok) {
            const body = (await res.json().catch(() => null));
            if (body) {
                out.cptTypes = Object.keys(body).filter((k) => !DEFAULT_TYPES.has(k) && body[k]?.rest_base);
            }
        }
    }
    catch { /* ignore */ }
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
