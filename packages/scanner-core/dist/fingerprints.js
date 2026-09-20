"use strict";
/** Static fingerprints: page builders, plugin slugs & risk categories, theme type. Pure regex - no DOM parsing (Workers CPU budget). */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PLUGIN_CATEGORIES = exports.BUILDERS = void 0;
exports.extractPluginSlugs = extractPluginSlugs;
exports.categorizePlugins = categorizePlugins;
exports.detectBuilders = detectBuilders;
exports.detectTheme = detectTheme;
exports.detectAcf = detectAcf;
exports.BUILDERS = [
    { id: 'elementor', name: 'Elementor', pattern: /data-elementor-type=|elementor-widget|elementor-section|e-con-full/ },
    { id: 'divi', name: 'Divi', pattern: /et_pb_(section|row|column|text|blurb|builder)/ },
    { id: 'wpbakery', name: 'WPBakery', pattern: /vc_row|vc_column|wpb_wrapper/ },
    { id: 'beaver', name: 'Beaver Builder', pattern: /fl-builder-content|fl-node-/ },
    { id: 'bricks', name: 'Bricks', pattern: /brxe-/ },
    { id: 'oxygen', name: 'Oxygen', pattern: /oxy-|ct-div-block/ },
];
exports.PLUGIN_CATEGORIES = [
    {
        id: 'ecommerce',
        name: 'E-commerce',
        slugs: ['woocommerce', 'surecart', 'easy-digital-downloads', 'wp-easycart', 'ecwid-shopping-cart', 'cartflows'],
    },
    {
        id: 'membership',
        name: 'Membership / LMS',
        slugs: [
            'memberpress', 'paid-memberships-pro', 'restrict-content', 'restrict-user-access', 's2member',
            'wishlist-member', 'learnpress', 'lifterlms', 'tutor', 'sensei-lms', 'pmpro',
        ],
    },
    {
        id: 'multilingual',
        name: 'Multilingual',
        slugs: ['sitepress-multilingual-cms', 'polylang', 'translatepress-multilingual', 'qtranslate-xt'],
    },
    {
        id: 'forms',
        name: 'Forms',
        slugs: ['contact-form-7', 'wpforms-lite', 'gravityforms', 'ninja-forms', 'fluentform', 'everest-forms'],
    },
    {
        id: 'cache-seo',
        name: 'Cache / SEO',
        slugs: ['wp-rocket', 'w3-total-cache', 'litespeed-cache', 'wp-super-cache', 'seo-by-rank-math', 'wordpress-seo', 'all-in-one-seo-pack'],
    },
];
/** Extract unique plugin slugs from asset paths like /wp-content/plugins/<slug>/. */
function extractPluginSlugs(htmls) {
    const slugs = new Set();
    const re = /\/wp-content\/plugins\/([a-z0-9_.\-]+)/gi;
    for (const html of htmls) {
        let m;
        while ((m = re.exec(html)) !== null) {
            const slug = m[1].replace(/\.(js|css)$/, '').toLowerCase();
            if (slug && slug.length > 2)
                slugs.add(slug);
        }
    }
    return [...slugs].sort();
}
function categorizePlugins(slugs) {
    const out = {};
    for (const cat of exports.PLUGIN_CATEGORIES) {
        const hits = slugs.filter((s) => cat.slugs.some((known) => s === known || s.startsWith(known)));
        if (hits.length)
            out[cat.id] = hits;
    }
    return out;
}
function detectBuilders(htmls) {
    return exports.BUILDERS.filter((b) => htmls.some((h) => b.pattern.test(h))).map((b) => b.name);
}
function detectTheme(htmls) {
    let slug = null;
    const re = /\/wp-content\/themes\/([a-z0-9_.\-]+)/i;
    for (const html of htmls) {
        const m = re.exec(html);
        if (m) {
            slug = m[1].replace(/\.(css|js|php)$/, '');
            break;
        }
    }
    const joined = htmls.join('\n').slice(0, 400_000);
    const blockMarkers = (joined.match(/wp-block-[a-z-]+/g) || []).length;
    const fse = /wp-template-part|wp-block-template-part|theme\.json/i.test(joined);
    if (blockMarkers >= 3 || fse)
        return { type: 'block', slug };
    if (slug)
        return { type: 'classic', slug };
    return { type: 'unknown', slug };
}
function detectAcf(htmls, pluginSlugs) {
    return pluginSlugs.some((s) => s === 'advanced-custom-fields' || s.startsWith('advanced-custom-fields') || s.startsWith('acf-')) ||
        htmls.some((h) => /acf-field|advanced-custom-fields/i.test(h));
}
