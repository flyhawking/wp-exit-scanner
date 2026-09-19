import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { detectBuilders, extractPluginSlugs, categorizePlugins, detectTheme, detectAcf } from '../src/fingerprints.js';
import { classifyPermalinks } from '../src/url-classifier.js';
import { evaluate } from '../src/scoring.js';
import { parseWxr } from '../src/wxr-parser.js';
import { shortcodeDensity, extractHrefs, detectWordPress } from '../src/index.js';

const fixtures = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'fixtures');
const elementorHtml = readFileSync(join(fixtures, 'elementor-site.html'), 'utf8');
const wooHtml = readFileSync(join(fixtures, 'woo-site.html'), 'utf8');

test('detector: recognises WordPress from generator meta', () => {
  const ev = detectWordPress(elementorHtml);
  assert.ok(ev.some((e) => e.includes('generator')));
  assert.ok(detectWordPress('<html><body>plain site</body></html>').length === 0);
});

test('fingerprints: elementor + plugin slugs', () => {
  const slugs = extractPluginSlugs([elementorHtml]);
  assert.ok(slugs.includes('elementor'));
  assert.ok(slugs.includes('contact-form-7'));
  assert.deepEqual(detectBuilders([elementorHtml]), ['Elementor']);
  const cats = categorizePlugins(slugs);
  assert.ok(cats.forms?.includes('contact-form-7'));
});

test('fingerprints: block theme detection', () => {
  assert.equal(detectTheme([wooHtml]).type, 'block');
  assert.equal(detectTheme(['<div class="sidebar-widget">no wp here</div>']).type, 'unknown');
});

test('acf detection', () => {
  assert.equal(detectAcf([], ['advanced-custom-fields']), true);
  assert.equal(detectAcf(['<input name="acf-field-x">'], []), true);
  assert.equal(detectAcf([], ['woocommerce']), false);
});

test('url classifier: date-based vs postname vs query', () => {
  const date = classifyPermalinks(['https://a.com/2024/03/hello-world/', 'https://a.com/2023/11/other-post/']);
  assert.equal(date.structure, 'date-based');
  const postname = classifyPermalinks(['https://a.com/about/', 'https://a.com/my-first-post/', 'https://a.com/another-one/']);
  assert.equal(postname.structure, 'postname');
  const query = classifyPermalinks(['https://a.com/?p=123', 'https://a.com/?page_id=42']);
  assert.equal(query.structure, 'query');
  assert.equal(query.hasQueryPermalinks, true);
});

test('shortcode density ignores script contents and non-shortcode brackets', () => {
  const d = shortcodeDensity(['<p>a [gallery] b [contact-form-7 id="1"]</p><script>if (a[0]) {}</script>']);
  assert.ok(d > 1.5 && d < 2.5, `density=${d}`);
});

test('scoring: clean site stays green / v1-ready', () => {
  const r = evaluate({
    builders: [], plugins: ['wp-rocket'], theme: { type: 'block', slug: 'twentytwentyfour' },
    hasAcf: false, shortcodeDensity: 0, url: { structure: 'postname', hasQueryPermalinks: false },
    mediaCount: 300, contentCount: 120,
  });
  assert.equal(r.light, 'green');
  assert.equal(r.path, 'v1-ready');
  assert.equal(r.score, 100);
});

test('scoring: elementor site is red + v2-waitlist, not referralled away', () => {
  const r = evaluate({
    builders: ['Elementor'], plugins: [], theme: { type: 'classic', slug: 'hello-elementor' },
    hasAcf: false, shortcodeDensity: 0, url: { structure: 'postname', hasQueryPermalinks: false },
    mediaCount: null, contentCount: null,
  });
  assert.equal(r.light, 'red');
  assert.equal(r.path, 'v2-waitlist');
  assert.equal(r.score, 55);
});

test('scoring: woocommerce forces not-suitable referral', () => {
  const r = evaluate({
    builders: [], plugins: ['woocommerce', 'wp-rocket'], theme: { type: 'block', slug: null },
    hasAcf: false, shortcodeDensity: 0, url: { structure: 'postname', hasQueryPermalinks: false },
    mediaCount: null, contentCount: null,
  });
  assert.equal(r.light, 'red');
  assert.equal(r.path, 'not-suitable');
  assert.ok(r.findings.some((f) => f.id === 'BLOCKER_DYNAMIC'));
});

test('scoring: aggregate penalties (acf + shortcodes + query urls)', () => {
  const r = evaluate({
    builders: [], plugins: [], theme: { type: 'classic', slug: null },
    hasAcf: true, shortcodeDensity: 4, url: { structure: 'query', hasQueryPermalinks: true },
    mediaCount: 6000, contentCount: 1500,
  });
  // 100 -10 -20 -5 -10 -5 = 50
  assert.equal(r.score, 50);
  assert.equal(r.light, 'yellow');
  assert.equal(r.path, 'v2-waitlist');
});

test('wxr parser: counts, authors, shortcodes', () => {
  const xml = readFileSync(join(fixtures, 'sample.wxr.xml'), 'utf8');
  const s = parseWxr(xml);
  assert.equal(s.valid, true);
  assert.equal(s.postCount, 1);
  assert.equal(s.pageCount, 1);
  assert.equal(s.attachmentCount, 1);
  assert.deepEqual(s.cptCounts, { book: 1 });
  assert.equal(s.authorCount, 2);
  assert.equal(s.siteUrl, 'https://myblog.example.com');
  assert.equal(s.shortcodeDensityPerItem, 1);
  assert.ok(s.topShortcodes.includes('gallery'));
});

test('href extraction keeps same-origin, drops external', () => {
  const hrefs = extractHrefs('<a href="/about/">a</a><a href="https://ext.com/x">b</a>', 'https://a.com');
  assert.deepEqual(hrefs, ['https://a.com/about/']);
});

test('extractHrefs output feeds classifier', () => {
  const hrefs = extractHrefs(wooHtml, 'https://example.com');
  const c = classifyPermalinks(hrefs);
  assert.equal(c.hasQueryPermalinks, true);
});
