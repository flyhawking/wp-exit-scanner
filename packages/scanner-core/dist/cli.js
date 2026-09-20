#!/usr/bin/env tsx
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/** CLI harness: scan a site and print the report. Usage: tsx src/cli.ts <url> [--json] [--fast] [--pages N] */
const index_1 = require("./index");
const wxr_parser_1 = require("./wxr-parser");
const node_fs_1 = require("node:fs");
const args = process.argv.slice(2);
const url = args.find((a) => !a.startsWith('--'));
const json = args.includes('--json');
const fast = args.includes('--fast');
const pagesArg = args.find((a) => a.startsWith('--pages'));
const maxPages = pagesArg ? parseInt(pagesArg.split('=')[1] ?? '12', 10) : 12;
if (!url) {
    console.error('Usage: tsx src/cli.ts <url-or-wxr-file> [--json] [--fast] [--pages=N]');
    process.exit(1);
}
async function main(target) {
    if (target.endsWith('.xml') || target.endsWith('.wxr')) {
        const xml = (0, node_fs_1.readFileSync)(target, 'utf8');
        const summary = (0, wxr_parser_1.parseWxr)(xml);
        console.log(json ? JSON.stringify(summary, null, 2) : formatWxr(summary));
        return;
    }
    const report = await (0, index_1.scanSite)(target, {
        maxPages,
        delayMs: fast ? 250 : 1000,
        concurrency: fast ? 8 : 5,
    });
    console.log(json ? JSON.stringify(report, null, 2) : pretty(report));
}
function pretty(r) {
    if (!r.isWordPress)
        return `NOT WORDPRESS (${r.durationMs}ms)\n${r.summary}`;
    const lines = [
        `SCORE: ${r.score}/100  [${r.light.toUpperCase()}]  ->  ${r.path}   (${r.durationMs}ms)`,
        ``,
        r.summary,
        ``,
        `STATS`,
        `  builders: ${r.stats.builders.join(', ') || 'none'}`,
        `  plugins(${r.stats.plugins.length}): ${r.stats.plugins.slice(0, 15).join(', ')}${r.stats.plugins.length > 15 ? ' …' : ''}`,
        `  theme: ${r.stats.themeType}${r.stats.themeSlug ? ` (${r.stats.themeSlug})` : ''}`,
        `  CPTs(${r.stats.cptCount}): ${r.stats.cptTypes.join(', ') || 'none'}`,
        `  ACF: ${r.stats.hasAcf}   shortcodes/post: ${r.stats.shortcodeDensityPerPost}`,
        `  URL structure: ${r.stats.urlStructure}   media: ${r.stats.mediaCount ?? '?'}   content: ${r.stats.pageCount ?? '?'}`,
        ``,
        `FINDINGS (${r.findings.length})`,
        ...r.findings.map((f) => `  [${f.severity}] ${f.title}${f.penalty ? `  (-${f.penalty})` : ''}\n        ${f.detail}`),
    ];
    return lines.join('\n');
}
function formatWxr(s) {
    if (!s.valid)
        return 'INVALID WXR FILE';
    return [
        `WXR: ${s.siteUrl ?? '?'}`,
        `posts=${s.postCount} pages=${s.pageCount} attachments=${s.attachmentCount} authors=${s.authorCount} terms=${s.termCount}`,
        `CPTs: ${JSON.stringify(s.cptCounts)}`,
        `shortcodes/item: ${s.shortcodeDensityPerItem}  top: ${s.topShortcodes.join(', ')}`,
    ].join('\n');
}
main(url).catch((e) => {
    console.error('Scan failed:', e);
    process.exit(1);
});
