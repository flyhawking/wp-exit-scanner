import type { ScanReport } from '@wp-exit-scanner/scanner-core';

/**
 * Pluggable storage. Dev = in-memory with 7-day TTL.
 * Production wiring (Cloudflare Pages + KV/D1) is a deployment-time task -
 * the interface is already shaped for async KV-style backends.
 */

export interface StoredReport {
  report: ScanReport;
  expiresAt: number;
}

const TTL_MS = 7 * 24 * 60 * 60 * 1000;

const reports = new Map<string, StoredReport>();
const emails = new Set<string>();
let scanCounter = 0;

export const reportStore = {
  async put(id: string, report: ScanReport): Promise<void> {
    reports.set(id, { report, expiresAt: Date.now() + TTL_MS });
    scanCounter++;
  },
  async get(id: string): Promise<ScanReport | null> {
    const hit = reports.get(id);
    if (!hit) return null;
    if (Date.now() > hit.expiresAt) {
      reports.delete(id);
      return null;
    }
    return hit.report;
  },
  async stats(): Promise<{ scans: number }> {
    return { scans: scanCounter };
  },
};

export const emailStore = {
  async add(email: string, meta: { reportId: string; score: number; path: string }): Promise<void> {
    emails.add(email.toLowerCase());
    // Production: forward to D1 / Resend audience. MVP keeps it local + logged.
    console.log(`[waitlist] ${email} <- report=${meta.reportId} score=${meta.score} path=${meta.path}`);
  },
  async has(email: string): Promise<boolean> {
    return emails.has(email.toLowerCase());
  },
};
