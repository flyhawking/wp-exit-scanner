import type { FetcherOptions, FetchedPage } from './types';
/** Polite fetcher: robots.txt aware, size-capped, rate-limited, custom UA. */
export declare class Fetcher {
    private opts;
    private robotsCache;
    private lastStart;
    constructor(opts?: FetcherOptions);
    fetchPage(url: string): Promise<FetchedPage>;
    /** Naive robots.txt check: only the `User-agent: *` group, prefix matching. */
    isAllowed(url: string): Promise<boolean>;
    /** Rate-limit gate. Sleeps via a plain promise — Atomics.wait is forbidden on the Workers main thread. */
    private throttle;
}
/** Crawl a bounded set of pages politely (concurrency + robots). */
export declare function crawlPages(fetcher: Fetcher, urls: string[], opts: {
    maxPages: number;
    concurrency: number;
}): Promise<FetchedPage[]>;
