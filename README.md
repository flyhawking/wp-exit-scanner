# wp-exit-scanner

**"Find out if you can leave WordPress in 30 seconds — without losing a single URL."**

[![Live demo: wpexit.dev](https://img.shields.io/badge/▶_live_demo-wpexit.dev-22c55e?style=for-the-badge)](https://wpexit.dev)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue?style=for-the-badge)](LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/flyhawking/wp-exit-scanner?style=for-the-badge&color=yellow)](https://github.com/flyhawking/wp-exit-scanner/stargazers)

> ### 👉 Try it now: **[wpexit.dev](https://wpexit.dev)** — paste a URL, get a score in 30 seconds. Free, no signup.

A free, open-source migration feasibility scanner for WordPress sites. Enter a URL, get a report:
can you migrate to static hosting with **zero URL changes**, and what will break?

> Built 20 years after [CMSware](https://github.com/flyhawking/cmsware), a top-3 Chinese CMS from 2004.
> This scanner is the first half of a full WordPress migrator — every line of it gets reused.

## Status

**Live and usable today → [wpexit.dev](https://wpexit.dev)** (scan, report page, waitlist, public stats).

- `packages/scanner-core` — URL mode + WXR mode, rule-based scoring ✅
- `apps/web` — Next.js 15 + Cloudflare Workers (OpenNext), KV report storage + D1 waitlist ✅
- You do **not** need to build or run anything to use it — just open the site.
  Build locally only if you want to run the scanner against your own machine.

## Try it without installing anything

Open **[wpexit.dev](https://wpexit.dev)** and paste your site URL. You get a shareable report link,
a 0–100 score, and a concrete list of what breaks under "zero URL change" migration.

Want it on your own machine? See **Usage (CLI)** below — no Cloudflare account required.

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

## Hosted version

The scanner at **[wpexit.dev](https://wpexit.dev)** is the same code in this repo, running on
Cloudflare Workers (KV for reports, D1 for the waitlist). The hosted version exists so you don't
have to deploy anything to get an answer; the core scanning logic is MIT and fully in
[`packages/scanner-core`](packages/scanner-core).

## License

MIT

---

Not affiliated with, or endorsed by, the WordPress Foundation or Automattic. "WordPress" is a
registered trademark of the WordPress Foundation and is used here only to describe what this tool
scans. Built by [@flyhawking](https://github.com/flyhawking).
