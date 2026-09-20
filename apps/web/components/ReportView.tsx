'use client';

import { useState } from 'react';
import type { ScanReport } from './scan-types';

/** Shared report renderer - used inline on the landing page (client) and on /report/[id] (server). */

const CTA_BY_PATH: Record<string, { title: string; body: string }> = {
  'v1-ready': {
    title: 'Your site can migrate now — zero URL changes',
    body: 'Founding migration: we migrate your site to static on Cloudflare Pages, done by us, $99 (first 20 sites). Leave your email and we will reply within 48 hours.',
  },
  'v2-waitlist': {
    title: 'Get notified when your site is supported',
    body: 'Some of your findings are handled in v1.5/v2. Leave your email and you will be first in line when the migrator covers them.',
  },
  'not-suitable': {
    title: 'Honest advice: this site should stay on WordPress',
    body: 'We will not sell you a migration that removes your core features. If you also run simple marketing pages, we can migrate just those - leave your email to discuss.',
  },
};

export function ScoreCard({ report }: { report: ScanReport }) {
  if (!report.isWordPress) {
    return (
      <div className="card score-card">
        <p className="badge red">not WordPress</p>
        <p className="summary">{report.summary}</p>
      </div>
    );
  }
  return (
    <div className="card score-card">
      <p className="score-num">{report.score}<span style={{ fontSize: 18, color: 'var(--muted)' }}>/100</span></p>
      <p className={`badge ${report.light}`}>{report.light} light</p>
      <p className="path-line">
        migration path: <strong>{report.path}</strong>
        {' '}· {report.stats.pagesSampled} pages sampled · {report.stats.plugins.length} plugins · theme: {report.stats.themeType}
      </p>
      <p className="summary">{report.summary}</p>
    </div>
  );
}

export function Findings({ report }: { report: ScanReport }) {
  if (!report.isWordPress || report.findings.length === 0) return null;
  return (
    <div className="card findings">
      <h3>What we found ({report.findings.length})</h3>
      {report.findings.map((f) => (
        <div key={f.id} className={`finding ${f.severity}`}>
          <div className="f-title">
            {f.title}
            {f.penalty > 0 ? <span className="f-pen">-{f.penalty}</span> : null}
          </div>
          <div className="f-detail">{f.detail}</div>
        </div>
      ))}
    </div>
  );
}

export function CtaCard({ report, reportId }: { report: ScanReport; reportId: string }) {
  const cta = CTA_BY_PATH[report.path] ?? CTA_BY_PATH['v2-waitlist'];
  return <CtaInner title={cta.title} body={cta.body} reportId={reportId} score={report.score} path={report.path} />;
}

function CtaInner({ title, body, reportId, score, path }: { title: string; body: string; reportId: string; score: number; path: string }) {
  return (
    <div className="card cta-card">
      <h3>{title}</h3>
      <p style={{ color: 'var(--muted)', fontSize: 14, margin: 0 }}>{body}</p>
      <EmailForm reportId={reportId} score={score} path={path} />
    </div>
  );
}

export function EmailForm({ reportId, score, path }: { reportId: string; score: number; path: string }) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState('sending');
    const res = await fetch('/api/subscribe', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, reportId, score, path }),
    });
    setState(res.ok ? 'done' : 'error');
  }

  if (state === 'done') return <p className="cta-ok">You are on the list. Watch your inbox.</p>;

  return (
    <form onSubmit={submit}>
      <input
        type="email"
        required
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <button type="submit" disabled={state === 'sending'}>
        {state === 'sending' ? 'Sending…' : 'Notify me'}
      </button>
      {state === 'error' ? <p style={{ color: 'var(--red)', fontSize: 13, margin: '8px 0 0' }}>Something went wrong - please try again.</p> : null}
    </form>
  );
}
