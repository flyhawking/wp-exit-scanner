"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluate = evaluate;
const fingerprints_1 = require("./fingerprints");
const SUPPORTED_STRUCTURES = new Set(['postname', 'date-based']);
function evaluate(ctx) {
    const findings = [];
    const flags = [];
    let score = 100;
    const penalize = (penalty) => {
        score -= penalty;
    };
    const add = (f) => findings.push(f);
    // 1. Page builders (v1 supports clean sites only)
    if (ctx.builders.length > 0) {
        flags.push('PAGB');
        penalize(45);
        add({
            id: 'PAGB', severity: 'blocker', penalty: 45,
            title: `Page builder detected: ${ctx.builders.join(', ')}`,
            detail: 'Page-builder layouts are stored as shortcodes/DOM blobs and cannot be faithfully converted to clean templates in v1. ' +
                'Your content survives, the design does not. Join the waitlist - builder-to-template conversion is on the v2 roadmap.',
        });
    }
    // 2. E-commerce / membership = hard blockers (honest referral)
    const cats = (0, fingerprints_1.categorizePlugins)(ctx.plugins);
    const blockers = [];
    if (cats.ecommerce?.length) {
        flags.push('ECOMMERCE');
        blockers.push(`e-commerce (${cats.ecommerce.join(', ')})`);
    }
    if (cats.membership?.length) {
        flags.push('MEMBERSHIP');
        blockers.push(`membership/LMS (${cats.membership.join(', ')})`);
    }
    if (blockers.length) {
        add({
            id: 'BLOCKER_DYNAMIC', severity: 'blocker', penalty: 0,
            title: 'Dynamic functionality that static sites cannot replace',
            detail: `We detected ${blockers.join(' and ')}. Static publishing would remove the core features your site runs on. ` +
                'Honest advice: stay on WordPress for this site, or split the marketing pages onto a static site. We will not pretend otherwise.',
        });
    }
    // 3. Multilingual
    if (cats.multilingual?.length) {
        flags.push('MULTILINGUAL');
        penalize(10);
        add({
            id: 'MULTILINGUAL', severity: 'warn', penalty: 10,
            title: `Multilingual plugin detected (${cats.multilingual.join(', ')})`,
            detail: 'Multi-language sites can be migrated but need per-locale publishing. Supported after v1.',
        });
    }
    // 4. Plugin count
    const n = ctx.plugins.length;
    if (n > 20) {
        penalize(12);
        add({ id: 'PLUGINS', severity: 'warn', penalty: 12, title: `${n} plugins detected`, detail: 'A high plugin count usually means more bespoke behaviour to recreate as static equivalents.' });
    }
    else if (n > 10) {
        penalize(5);
        add({ id: 'PLUGINS', severity: 'info', penalty: 5, title: `${n} plugins detected`, detail: 'Moderate plugin count. Most cache/SEO plugins become unnecessary on static hosting.' });
    }
    // 5. CPTs
    const extraCpt = Math.max(0, ctx.cptCount - 2);
    if (extraCpt > 0) {
        const p = Math.min(15, extraCpt * 5);
        penalize(p);
        add({ id: 'CPT', severity: 'info', penalty: p, title: `${ctx.cptCount} custom post types`, detail: 'Custom content types map to our content models; each additional type adds migration work.' });
    }
    // 6. ACF
    if (ctx.hasAcf) {
        flags.push('ACF');
        penalize(10);
        add({ id: 'ACF', severity: 'warn', penalty: 10, title: 'Advanced Custom Fields detected', detail: 'ACF field groups map to native content-model fields - supported in v1.5, waitlist today.' });
    }
    // 7. Shortcode density
    if (ctx.shortcodeDensity > 3) {
        penalize(20);
        add({ id: 'SHORTCODE', severity: 'warn', penalty: 20, title: `Heavy shortcode usage (~${ctx.shortcodeDensity} per post)`, detail: 'Dense shortcodes usually mean builder or plugin markup inside content. Each one needs a conversion rule.' });
    }
    else if (ctx.shortcodeDensity > 0) {
        penalize(10);
        add({ id: 'SHORTCODE', severity: 'info', penalty: 10, title: `Some shortcodes in content (~${ctx.shortcodeDensity} per post)`, detail: 'A small number of shortcodes - each gets an explicit conversion rule.' });
    }
    // 8. URL structure
    if (ctx.url.structure === 'query' || ctx.url.hasQueryPermalinks) {
        flags.push('URL_QUERY');
        penalize(5);
        add({ id: 'URL_QUERY', severity: 'warn', penalty: 5, title: 'Legacy ?p=123 style URLs detected', detail: 'Old query-string URLs are enumerated and 301-redirected - handled in v2, zero-URL-change still holds.' });
    }
    else if (!SUPPORTED_STRUCTURES.has(ctx.url.structure)) {
        penalize(15);
        flags.push('URL_UNKNOWN');
        add({ id: 'URL_UNKNOWN', severity: 'warn', penalty: 15, title: 'Unrecognised permalink structure', detail: 'We could not confidently classify your URL pattern from public pages. A WXR upload gives us exact permalinks.' });
    }
    // 9. Media volume
    if (ctx.mediaCount !== null) {
        if (ctx.mediaCount > 5000) {
            penalize(10);
            add({ id: 'MEDIA', severity: 'info', penalty: 10, title: `Large media library (~${ctx.mediaCount} items)`, detail: 'Media migrates fine, just takes longer to upload to your new host.' });
        }
        else if (ctx.mediaCount > 500) {
            penalize(5);
            add({ id: 'MEDIA', severity: 'info', penalty: 5, title: `Media library (~${ctx.mediaCount} items)`, detail: 'Media migrates automatically.' });
        }
    }
    // 10. Content scale (informational)
    if (ctx.contentCount !== null && ctx.contentCount > 1000) {
        penalize(5);
        add({ id: 'SCALE', severity: 'info', penalty: 5, title: `Large site (~${ctx.contentCount} content items)`, detail: 'Bigger sites take longer to verify link integrity after migration.' });
    }
    // Forms / cache / SEO are informational, zero penalty
    if (cats.forms?.length) {
        add({ id: 'FORMS', severity: 'info', penalty: 0, title: `Forms handled by plugins (${cats.forms.join(', ')})`, detail: 'Forms are re-created as serverless endpoints on the static host - no functionality lost.' });
    }
    score = Math.max(0, Math.min(100, score));
    const hardBlocked = flags.includes('ECOMMERCE') || flags.includes('MEMBERSHIP') || flags.includes('PAGB');
    const light = hardBlocked || score < 50 ? 'red' : score < 80 ? 'yellow' : 'green';
    const path = flags.includes('ECOMMERCE') || flags.includes('MEMBERSHIP')
        ? 'not-suitable'
        : light === 'green' && !flags.includes('PAGB') && SUPPORTED_STRUCTURES.has(ctx.url.structure)
            ? 'v1-ready'
            : 'v2-waitlist';
    return { score, light, flags, findings, path, summary: summarize(light, path, ctx) };
}
function summarize(light, path, ctx) {
    if (path === 'not-suitable') {
        return 'Your site depends on dynamic functionality (e-commerce or membership) that static publishing cannot replace. Honest advice: stay on WordPress, or split marketing pages onto a static site.';
    }
    if (path === 'v1-ready') {
        return 'Good news: this looks like a clean site that can migrate to static hosting with zero URL changes - realistically in minutes, not weeks.';
    }
    if (light === 'red') {
        return 'A significant redesign dependency was found (likely a page builder). Migration is possible but not with a clean v1 - join the waitlist for builder-aware migration.';
    }
    return 'Migratable with some extra work (see findings). A few items are handled in v1.5/v2 - leave your email to get notified when your site is covered.';
}
