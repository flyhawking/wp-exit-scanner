import { defineCloudflareConfig } from '@opennextjs/cloudflare';

/**
 * Every route in this app is dynamic (scan API, report pages, home counters),
 * so no ISR / incremental cache backend is configured — nothing to cache.
 * If we later add cached marketing pages, wire kvIncrementalCache here.
 */
export default defineCloudflareConfig({});
