import type { Finding, Light, MigrationPath } from './types';
/** Rule-table scoring engine. Base 100, penalties per the public rule sheet. Red-flag categories force a red light. */
export interface RuleContext {
    builders: string[];
    plugins: string[];
    theme: {
        type: 'block' | 'classic' | 'unknown';
        slug: string | null;
    };
    hasAcf: boolean;
    shortcodeDensity: number;
    url: {
        structure: string;
        hasQueryPermalinks: boolean;
    };
    mediaCount: number | null;
    contentCount: number | null;
    cptCount: number;
}
export interface ScoreResult {
    score: number;
    light: Light;
    flags: string[];
    findings: Finding[];
    path: MigrationPath;
    summary: string;
}
export declare function evaluate(ctx: RuleContext): ScoreResult;
