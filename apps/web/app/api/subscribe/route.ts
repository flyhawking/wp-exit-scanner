import { NextRequest, NextResponse } from 'next/server';
import { emailStore, reportStore } from '../../../lib/store';
import { sendWaitlistEmail } from '../../../lib/email';

export const runtime = 'nodejs';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://wpexit.dev';

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

  const reportId = body.reportId ?? 'unknown';
  let score = body.score ?? -1;
  let path = body.path ?? 'unknown';

  try {
    await emailStore.add(email, { reportId, score, path });
  } catch {
    return NextResponse.json({ error: 'Could not save your email. Please try again.' }, { status: 500 });
  }

  // The confirmation email is best-effort: the signup is already stored, so a
  // mail failure must not turn into a user-visible error.
  let emailed = false;
  try {
    const report = reportId !== 'unknown' ? await reportStore.get(reportId) : null;
    if (report) {
      score = report.score;
      path = report.path;
      emailed = await sendWaitlistEmail({
        email,
        host: hostOf(report.input.url),
        reportId,
        reportUrl: `${SITE_URL}/report/${reportId}`,
        score: report.score,
        path: report.path,
        topFindings: report.findings.slice(0, 5).map((f) => f.title),
      });
    }
  } catch (err) {
    console.error('[subscribe] confirmation email failed', err);
  }

  return NextResponse.json({ ok: true, emailed });
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return 'your site';
  }
}
