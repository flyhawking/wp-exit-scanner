/** Client-safe mirror of scanner-core's ScanReport type (avoids pulling the server package into client bundles). */
export type Light = 'green' | 'yellow' | 'red';
export type MigrationPath = 'v1-ready' | 'v2-waitlist' | 'not-suitable';

export interface Finding {
  id: string;
  title: string;
  detail: string;
  penalty: number;
  severity: 'info' | 'warn' | 'blocker';
}

export interface ScanStats {
  pagesSampled: number;
  plugins: string[];
  builders: string[];
  themeType: 'block' | 'classic' | 'unknown';
  themeSlug: string | null;
  cptCount: number;
  cptTypes: string[];
  hasAcf: boolean;
  shortcodeDensityPerPost: number;
  urlStructure: 'postname' | 'date-based' | 'query' | 'unknown';
  mediaCount: number | null;
  pageCount: number | null;
}

export interface ScanReport {
  input: { url: string; mode: 'url' | 'wxr'; scannedAt: string };
  isWordPress: boolean;
  evidence: string[];
  score: number;
  light: Light;
  flags: string[];
  findings: Finding[];
  path: MigrationPath;
  summary: string;
  stats: ScanStats;
  durationMs: number;
  sampleUrls?: string[];
}
