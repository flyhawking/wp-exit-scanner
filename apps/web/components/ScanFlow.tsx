'use client';

import { useEffect, useState } from 'react';
import type { ScanReport } from './scan-types';
import { ScoreCard, Findings, CtaCard } from './ReportView';
import { track, hostOf } from '../lib/track';

const STEPS = [
  'Fetching public pages…',
  'Verifying WordPress…',
  'Checking page builders…',
  'Inspecting plugins…',
  'Probing the REST API…',
  'Classifying your URLs…',
  'Scoring your migration…',
];

export function ScanFlow() {
  const [url, setUrl] = useState('');
  const [phase, setPhase] = useState<'idle' | 'scanning' | 'done' | 'error'>('idle');
  const [step, setStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ id: string; report: ScanReport } | null>(null);

  useEffect(() => {
    if (phase !== 'scanning') return;
    const timer = setInterval(() => {
      setStep((s) => Math.min(s + 1, STEPS.length - 1));
      setProgress((p) => Math.min(p + 12, 92));
    }, 2200);
    return () => clearInterval(timer);
  }, [phase]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPhase('scanning');
    setStep(0);
    setProgress(6);
    setError('');
    setResult(null);
    const started = Date.now();
    track('scan_started', { host: hostOf(url) });
    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Scan failed');
      setProgress(100);
      setResult(body);
      setPhase('done');
      track('scan_succeeded', {
        host: hostOf(url),
        light: body.report.light,
        path: body.report.path,
        score: body.report.score,
        is_wordpress: body.report.isWordPress,
        duration_ms: Date.now() - started,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Scan failed';
      setError(message);
      setPhase('error');
      track('scan_failed', { host: hostOf(url), message });
    }
  }

  return (
    <>
      <form className="scan-form" onSubmit={submit}>
        <input
          type="text"
          required
          placeholder="your-wordpress-site.com"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={phase === 'scanning'}
        />
        <button type="submit" disabled={phase === 'scanning'}>
          {phase === 'scanning' ? 'Scanning…' : 'Scan my site'}
        </button>
      </form>
      <p className="form-note">Free · no signup · read-only public scan · nothing is stored but aggregate metrics</p>

      {phase === 'scanning' ? (
        <div className="progress">
          <div className="bar"><i style={{ width: `${progress}%` }} /></div>
          <div className="step">{STEPS[step]}</div>
        </div>
      ) : null}

      {phase === 'error' ? <div className="error-box">{error}</div> : null}

      {result ? (
        <>
          <ScoreCard report={result.report} />
          <Findings report={result.report} />
          <CtaCard report={result.report} reportId={result.id} />
          <p className="share-line">
            Share this report: <a href={`/report/${result.id}`}>/report/{result.id}</a> (expires in 7 days)
          </p>
        </>
      ) : null}
    </>
  );
}
