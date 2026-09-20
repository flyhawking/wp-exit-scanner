"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Fetcher = void 0;
exports.crawlPages = crawlPages;
const DEFAULTS = {
    timeoutMs: 10_000,
    maxBytes: 2_000_000,
    delayMs: 1_000,
    concurrency: 5,
    userAgent: 'wp-exit-scanner/0.1 (+https://github.com/flyhawking/wp-exit-scanner; polite feasibility scanner)',
};
/** Polite fetcher: robots.txt aware, size-capped, rate-limited, custom UA. */
class Fetcher {
    opts;
    robotsCache = new Map();
    lastStart = 0;
    constructor(opts = {}) {
        this.opts = { ...DEFAULTS, ...opts };
    }
    async fetchPage(url) {
        await this.throttle();
        try {
            const ctrl = new AbortController();
            const timer = setTimeout(() => ctrl.abort(), this.opts.timeoutMs);
            const res = await fetch(url, {
                redirect: 'follow',
                signal: ctrl.signal,
                headers: { 'user-agent': this.opts.userAgent, accept: 'text/html,application/json;q=0.9,*/*;q=0.8' },
            });
            clearTimeout(timer);
            const cap = this.opts.maxBytes;
            let text = '';
            if (res.body) {
                const reader = res.body.getReader();
                const decoder = new TextDecoder();
                let total = 0;
                for (;;) {
                    const { done, value } = await reader.read();
                    if (done)
                        break;
                    total += value.byteLength;
                    text += decoder.decode(value, { stream: true });
                    if (total > cap) {
                        await reader.cancel().catch(() => { });
                        break;
                    }
                }
                text += decoder.decode();
            }
            return { url, status: res.status, ok: res.ok, html: text };
        }
        catch (err) {
            return { url, status: 0, ok: false, html: '', error: err instanceof Error ? err.message : String(err) };
        }
    }
    /** Naive robots.txt check: only the `User-agent: *` group, prefix matching. */
    async isAllowed(url) {
        const origin = new URL(url).origin;
        let rules = this.robotsCache.get(origin);
        if (!rules) {
            const res = await this.fetchPage(`${origin}/robots.txt`);
            rules = [];
            if (res.ok) {
                let inStar = false;
                for (const line of res.html.split(/\r?\n/)) {
                    const clean = line.split('#')[0].trim();
                    if (/^user-agent:/i.test(clean))
                        inStar = clean.split(':')[1].trim() === '*';
                    else if (inStar && /^disallow:/i.test(clean)) {
                        const p = clean.slice(clean.indexOf(':') + 1).trim();
                        if (p)
                            rules.push(p);
                    }
                }
            }
            this.robotsCache.set(origin, rules);
        }
        const path = new URL(url).pathname;
        return !rules.some((prefix) => path.startsWith(prefix));
    }
    /** Rate-limit gate. Sleeps via a plain promise — Atomics.wait is forbidden on the Workers main thread. */
    async throttle() {
        const now = Date.now();
        const wait = this.lastStart + this.opts.delayMs - now;
        this.lastStart = Math.max(now, this.lastStart + this.opts.delayMs);
        if (wait > 0)
            await new Promise((resolve) => setTimeout(resolve, wait));
    }
}
exports.Fetcher = Fetcher;
/** Crawl a bounded set of pages politely (concurrency + robots). */
async function crawlPages(fetcher, urls, opts) {
    const allowed = await Promise.all(urls.slice(0, opts.maxPages).map((u) => fetcher.isAllowed(u)));
    const queue = urls.slice(0, opts.maxPages).filter((_, i) => allowed[i]);
    const results = [];
    let cursor = 0;
    async function worker() {
        while (cursor < queue.length) {
            const next = queue[cursor++];
            results.push(await fetcher.fetchPage(next));
        }
    }
    await Promise.all(Array.from({ length: Math.min(opts.concurrency, queue.length) }, worker));
    return results;
}
