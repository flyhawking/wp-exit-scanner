#!/usr/bin/env tsx
/** CLI harness: scan a site and print the report. Usage: tsx src/cli.ts <url> [--json] [--fast] [--pages N] */
import { scanSite } from './index.js';
import { parseWxr } from './wxr-parser.js';
import { readFileSync } from 'node:fs';

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

async function main() {
  if (url.endsWith('.xml') || url.endsWith('.wxr')) {
    const xml = readFileSync(url, 'utf8');
    const summary = parseWxr(xml);
    console.log(json ? JSON.stringify(summary, null, 2) : formatWxr(summary));
    return;
  }
  const report = await scanSite(url, {
    maxPages,
    delayMs: fast ? 250 : 1000,
    concurrency: fast ? 8 : 5,
  });
  console.log(json ? JSON.stringify(report, null, 2) : pretty(report));
}

function pretty(r: Awaited<ReturnType<typeof scanSite>>): string {
  if (!r.isWordPress) return `NOT WORDPRESS (${r.durationMs}ms)\n${r.summary}`;
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

function formatWxr(s: ReturnType<typeof parseWxr>): string {
  if (!s.valid) return 'INVALID WXR FILE';
  return [
    `WXR: ${s.siteUrl ?? '?'}`,
    `posts=${s.postCount} pages=${s.pageCount} attachments=${s.attachmentCount} authors=${s.authorCount} terms=${s.termCount}`,
    `CPTs: ${JSON.stringify(s.cptCounts)}`,
    `shortcodes/item: ${s.shortcodeDensityPerItem}  top: ${s.topShortcodes.join(', ')}`,
  ].join('\n');
}

main().catch((e) => {
  console.error('Scan failed:', e);
  process.exit(1);
});
