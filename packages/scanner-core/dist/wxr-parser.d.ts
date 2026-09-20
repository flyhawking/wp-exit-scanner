/** WXR (WordPress eXtended RSS) parser - the precise mode of the scanner, and the heart of the future migrator. */
export interface WxrSummary {
    valid: boolean;
    postCount: number;
    pageCount: number;
    attachmentCount: number;
    cptCounts: Record<string, number>;
    authorCount: number;
    termCount: number;
    shortcodeDensityPerItem: number;
    topShortcodes: string[];
    siteUrl: string | null;
}
export declare function parseWxr(xml: string): WxrSummary;
