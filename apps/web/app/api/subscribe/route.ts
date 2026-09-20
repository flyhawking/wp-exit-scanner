import { NextRequest, NextResponse } from 'next/server';
import { emailStore } from '../../../lib/store';

export const runtime = 'nodejs';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  let body: { email?: string; reportId?: string; score?: number; path?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const email = (body.email || '').trim();
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
  }
  await emailStore.add(email, {
    reportId: body.reportId ?? 'unknown',
    score: body.score ?? -1,
    path: body.path ?? 'unknown',
  });
  return NextResponse.json({ ok: true });
}
