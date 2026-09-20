import { NextRequest, NextResponse } from 'next/server';
import { scanSite } from '@wp-exit-scanner/scanner-core';
import { reportStore } from '../../../lib/store';

export const runtime = 'nodejs';
export const maxDuration = 120;

const PRIVATE_HOST = /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|\[?::1)/i;

export async function POST(req: NextRequest) {
  let body: { url?: string; pages?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const raw = (body.url || '').trim();
  if (!raw) return NextResponse.json({ error: 'Please enter a site URL.' }, { status: 400 });

  let target: URL;
  try {
    target = new URL(raw.startsWith('http') ? raw : `https://${raw}`);
  } catch {
    return NextResponse.json({ error: 'That does not look like a valid URL.' }, { status: 400 });
  }
  if (!/^https?:$/.test(target.protocol)) {
    return NextResponse.json({ error: 'Only http(s) URLs are supported.' }, { status: 400 });
  }
  if (PRIVATE_HOST.test(target.hostname)) {
    return NextResponse.json({ error: 'Private and local addresses cannot be scanned.' }, { status: 400 });
  }

  const maxPages = Math.min(Math.max(body.pages ?? 8, 3), 20);
  try {
    const report = await scanSite(target.toString(), { maxPages, delayMs: 500, concurrency: 5 });
    const id = crypto.randomUUID().slice(0, 8);
    await reportStore.put(id, report);
    return NextResponse.json({ id, report });
  } catch (err) {
    console.error('[scan] failed', err);
    const detail = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Scan failed: ${detail}` },
      { status: 500 },
    );
  }
}
