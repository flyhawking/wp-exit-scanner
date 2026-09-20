/**
 * Transactional email via Resend (plain fetch - Workers friendly, no SDK).
 *
 * The API key is a Worker secret (RESEND_API_KEY); locally you can put it in
 * `.dev.vars` or the shell env. When the key is absent we silently no-op:
 * a missing mail provider must never break a scan or a signup.
 */

import { getCfEnv } from './cf';

const RESEND_ENDPOINT = 'https://api.resend.com/emails';
const DEFAULT_FROM = 'WP Exit Scanner <hello@wpexit.dev>';
const DEFAULT_REPLY_TO = 'flyhawking@gmail.com';
const SITE_URL = 'https://wpexit.dev';

type EmailEnv = { RESEND_API_KEY?: string; RESEND_FROM?: string; RESEND_REPLY_TO?: string };

async function config(): Promise<{ key: string; from: string; replyTo: string } | null> {
  const env = ((await getCfEnv()) ?? {}) as EmailEnv;
  const key = env.RESEND_API_KEY || process.env.RESEND_API_KEY || '';
  if (!key) return null;
  return {
    key,
    from: env.RESEND_FROM || process.env.RESEND_FROM || DEFAULT_FROM,
    replyTo: env.RESEND_REPLY_TO || process.env.RESEND_REPLY_TO || DEFAULT_REPLY_TO,
  };
}

export interface WaitlistEmailInput {
  email: string;
  host: string;
  reportId: string;
  reportUrl: string;
  score: number;
  path: string;
  topFindings: string[];
}

export async function sendWaitlistEmail(input: WaitlistEmailInput): Promise<boolean> {
  const cfg = await config();
  if (!cfg) {
    console.log('[email] RESEND_API_KEY missing - skipping confirmation email');
    return false;
  }

  const { subject, heading, body, action, actionLabel } = copyFor(input);

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cfg.key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: cfg.from,
        to: [input.email],
        reply_to: cfg.replyTo,
        subject,
        html: renderHtml(input, { heading, body, action, actionLabel }),
        text: renderText(input, { heading, body, action, actionLabel }),
      }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      console.error('[email] resend rejected', res.status, detail.slice(0, 300));
      return false;
    }
    const data = (await res.json().catch(() => ({}))) as { id?: string };
    console.log('[email] sent', data.id ?? '(no id)', 'to', maskEmail(input.email));
    return true;
  } catch (err) {
    console.error('[email] send failed', err);
    return false;
  }
}

function copyFor(input: WaitlistEmailInput) {
  switch (input.path) {
    case 'v1-ready':
      return {
        subject: `Your site scored ${input.score}/100 — it can leave WordPress now`,
        heading: `${input.host} can migrate to static hosting`,
        body: `Your scan came back at ${input.score}/100 with zero URL changes required. That means every existing link keeps working after the move - no redirect table, no ranking loss.`,
        action: `Reply to this email with your site URL and we will send you the fixed-price migration plan: $99 for the first 20 sites, migrated by hand, done in one pass.`,
        actionLabel: 'Founding migration ($99, first 20 sites)',
      };
    case 'not-suitable':
      return {
        subject: `Your scan: ${input.host} should probably stay on WordPress`,
        heading: `${input.host} is not a migration candidate (yet)`,
        body: `Your scan came back at ${input.score}/100. Honest answer: the features we found are core to what your site does, and we will not sell you a migration that silently removes them.`,
        action: `If you also run simple marketing pages that do not need WordPress, reply and we will look at migrating just those separately.`,
        actionLabel: 'Migrate the simple parts only',
      };
    default:
      return {
        subject: `You are on the list — ${input.host} scored ${input.score}/100`,
        heading: `Thanks - you are on the list`,
        body: `${input.host} scored ${input.score}/100. A few of your findings are already handled by the migrator; the rest are queued for v1.5/v2, and you will hear from us the moment they land - no newsletter, just the one email that matters to you.`,
        action: `In the meantime your report link stays live for 7 days. Reply if you want us to look at your site by hand.`,
        actionLabel: 'Your migration report',
      };
  }
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function renderHtml(
  input: WaitlistEmailInput,
  c: { heading: string; body: string; action: string; actionLabel: string },
): string {
  const findings = input.topFindings
    .slice(0, 5)
    .map((f) => `<li style="margin:0 0 6px">${esc(f)}</li>`)
    .join('');
  return `<!doctype html><html><body style="margin:0;background:#f6f7f9;padding:24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#111827">
  <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:28px">
    <p style="margin:0 0 4px;font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#6b7280">WP Exit Scanner</p>
    <h1 style="margin:0 0 16px;font-size:21px;line-height:1.35">${esc(c.heading)}</h1>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6">${esc(c.body)}</p>
    ${
      findings
        ? `<p style="margin:0 0 8px;font-size:14px;font-weight:600">What we found</p>
    <ul style="margin:0 0 18px;padding-left:20px;font-size:14px;line-height:1.6;color:#374151">${findings}</ul>`
        : ''
    }
    <p style="margin:0 0 18px">
      <a href="${esc(input.reportUrl)}" style="display:inline-block;background:#111827;color:#fff;text-decoration:none;padding:11px 18px;border-radius:8px;font-size:14px;font-weight:600">${esc(c.actionLabel)}</a>
    </p>
    <p style="margin:0;font-size:14px;line-height:1.6;color:#374151">${esc(c.action)}</p>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:22px 0 14px">
    <p style="margin:0;font-size:12px;line-height:1.6;color:#9ca3af">
      You are getting this because you asked for it at <a href="${SITE_URL}" style="color:#9ca3af">${SITE_URL}</a>.
      Reply to this email and a human answers. Report ${esc(input.reportId)}.
    </p>
  </div>
</body></html>`;
}

function renderText(
  input: WaitlistEmailInput,
  c: { heading: string; body: string; action: string; actionLabel: string },
): string {
  const findings = input.topFindings.slice(0, 5).map((f) => `  - ${f}`).join('\n');
  return [
    c.heading,
    '',
    c.body,
    findings ? `\nWhat we found:\n${findings}` : '',
    '',
    `${c.actionLabel}: ${input.reportUrl}`,
    '',
    c.action,
    '',
    `-- `,
    `WP Exit Scanner - ${SITE_URL}`,
    `Report ${input.reportId}`,
  ]
    .filter(Boolean)
    .join('\n');
}

function maskEmail(email: string): string {
  const [user, domain] = email.split('@');
  if (!domain) return '***';
  return `${user.slice(0, 2)}***@${domain}`;
}
