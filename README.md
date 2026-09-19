# wp-exit-scanner

**"Find out if you can leave WordPress in 30 seconds — without losing a single URL."**

A free, open-source migration feasibility scanner for WordPress sites. Enter a URL, get a report:
can you migrate to static hosting with **zero URL changes**, and what will break?

> Built 20 years after [CMSware](https://github.com/flyhawking/cmsware), a top-3 Chinese CMS from 2004.
> This scanner is the first half of a full WordPress migrator — every line of it gets reused.

## Status

Week 1 build: `packages/scanner-core` — URL mode + WXR mode, rule-based scoring, CLI harness. Web UI next.

## Usage (CLI)

```bash
npm install
npm run cli -- https://some-wordpress-site.com --fast --pages=8
npm run cli -- ./export.wxr.xml          # WXR mode (precise)
npm test
```

## What it detects (public scoring rules)

| Check | Method | Penalty |
|---|---|---|
| Page builders (Elementor/Divi/WPBakery/Beaver/Bricks/Oxygen) | DOM class fingerprints | −45, red |
| E-commerce / membership (WooCommerce, MemberPress, LMS…) | plugin fingerprints | red flag → honest referral |
| Plugin count & risk categories | `/wp-content/plugins/` asset paths | 0–12 |
| Custom post types | `/wp-json/wp/v2/types` | −5 each beyond 2 (max −15) |
| ACF | asset fingerprints | −10 |
| Shortcode density | content sampling | −10 / −20 |
| Permalink structure (postname / date / `?p=`) | link classification | 0–15 |
| Media library & content scale | `X-WP-Total` headers | 0–15 |

Score 0–100: **≥80 green (v1-ready) / 50–79 yellow (v2-waitlist) / <50 red**.
E-commerce/membership sites get an honest "stay on WordPress" referral, not a sales pitch.

## Ethics

Polite crawler: robots.txt respected, custom UA, ≤50 pages/site, ≥1s delay, 2MB/page cap.
No content is stored — only aggregate metrics. Reports expire in 7 days.

## License

MIT
