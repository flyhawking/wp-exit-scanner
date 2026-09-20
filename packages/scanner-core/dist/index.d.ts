import type { FetcherOptions, ScanReport } from './types';
export type { ScanReport, ScanStats, Finding, Light, MigrationPath } from './types';
/** Orchestrator: URL mode scan. Everything public, read-only, rate-limited. */
export interface ScanSiteOptions extends FetcherOptions {
    maxPages?: number;
}
export declare function scanSite(rawUrl: string, opts?: ScanSiteOptions): Promise<ScanReport>;
export declare function detectWordPress(html: string): string[];
export declare function extractHrefs(html: string, origin: string): string[];
export declare function shortcodeDensity(htmls: string[]): number;
