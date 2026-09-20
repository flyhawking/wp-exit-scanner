import { Fetcher } from './fetcher';
/** Probe public WP REST API endpoints. Read-only, per_page=1, count via X-WP-Total headers. */
export interface RestProbeResult {
    restAvailable: boolean;
    cptTypes: string[];
    mediaCount: number | null;
    pageCount: number | null;
    postCount: number | null;
}
declare function total(fetcher: Fetcher, url: string): Promise<number | null>;
export declare function probeRest(fetcher: Fetcher, origin: string): Promise<RestProbeResult>;
export { total };
