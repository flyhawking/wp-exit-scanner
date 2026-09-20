/** URL structure classification from sampled permalinks - decides whether "Zero URL change" is directly supportable in v1. */
export type UrlStructure = 'postname' | 'date-based' | 'query' | 'unknown';
export interface UrlClassification {
    structure: UrlStructure;
    hasQueryPermalinks: boolean;
    samples: {
        postname: number;
        date: number;
        query: number;
        other: number;
    };
}
export declare function classifyPermalinks(hrefs: string[]): UrlClassification;
