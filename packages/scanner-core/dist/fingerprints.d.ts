/** Static fingerprints: page builders, plugin slugs & risk categories, theme type. Pure regex - no DOM parsing (Workers CPU budget). */
export interface BuilderRule {
    id: string;
    name: string;
    pattern: RegExp;
}
export declare const BUILDERS: BuilderRule[];
export interface PluginCategory {
    id: string;
    name: string;
    slugs: string[];
}
export declare const PLUGIN_CATEGORIES: PluginCategory[];
/** Extract unique plugin slugs from asset paths like /wp-content/plugins/<slug>/. */
export declare function extractPluginSlugs(htmls: string[]): string[];
export declare function categorizePlugins(slugs: string[]): Record<string, string[]>;
export declare function detectBuilders(htmls: string[]): string[];
export interface ThemeInfo {
    type: 'block' | 'classic' | 'unknown';
    slug: string | null;
}
export declare function detectTheme(htmls: string[]): ThemeInfo;
export declare function detectAcf(htmls: string[], pluginSlugs: string[]): boolean;
