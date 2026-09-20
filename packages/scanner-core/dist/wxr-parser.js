"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseWxr = parseWxr;
const fast_xml_parser_1 = require("fast-xml-parser");
const SHORTCODE_RE = /\[([a-z0-9_\-]+)(?:\s[^\]]*)?\]/g;
function parseWxr(xml) {
    const parser = new fast_xml_parser_1.XMLParser({ ignoreAttributes: false, trimValues: true });
    const doc = parser.parse(xml);
    const channel = doc.rss?.channel;
    if (!channel)
        return empty();
    const items = channel['item'] ?? [];
    const summary = empty();
    summary.siteUrl = (typeof channel['link'] === 'string' ? channel['link'] : null) ?? null;
    const authors = new Set();
    const terms = new Set();
    const shortcodeCounter = new Map();
    let shortcodesTotal = 0;
    let contentItems = 0;
    for (const item of items) {
        const type = String(item['wp:post_type'] ?? 'post');
        const status = String(item['wp:status'] ?? 'publish');
        if (status === 'trash')
            continue;
        contentItems++;
        if (type === 'post')
            summary.postCount++;
        else if (type === 'page')
            summary.pageCount++;
        else if (type === 'attachment')
            summary.attachmentCount++;
        else
            summary.cptCounts[type] = (summary.cptCounts[type] ?? 0) + 1;
        const creator = item['dc:creator'];
        if (typeof creator === 'string' && creator)
            authors.add(creator);
        const cat = item['category'];
        if (Array.isArray(cat))
            cat.forEach((c) => terms.add(String(c)));
        else if (cat)
            terms.add(String(cat));
        const content = item['content:encoded'];
        if (typeof content === 'string') {
            let m;
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
function empty() {
    return {
        valid: false, postCount: 0, pageCount: 0, attachmentCount: 0,
        cptCounts: {}, authorCount: 0, termCount: 0, shortcodeDensityPerItem: 0, topShortcodes: [], siteUrl: null,
    };
}
