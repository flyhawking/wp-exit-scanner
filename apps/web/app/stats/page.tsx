import type { Metadata } from 'next';
import Link from 'next/link';
import { reportStore } from '../../lib/store';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Aggregate scan data — WP Exit Scanner',
  description:
    'Live aggregate results from every WordPress migration feasibility scan: how many sites can move to static today, and which page builders block migration most often.',
};

export default async function StatsPage() {
  const { scans, canMigrate, waitlist, topBlockers } = await reportStore.stats();
  const pct = scans > 0 ? Math.round((canMigrate / scans) * 100) : 0;
  const maxCount = topBlockers[0]?.count ?? 0;

  return (
    <div className="wrap">
      <section className="hero">
        <h1>What the scans say</h1>
        <p>
          Every scan is aggregated here anonymously — no URLs, no content, just the numbers. This is the
          honest picture of how locked-in the WordPress web actually is.
        </p>
      </section>

      <div className="score-grid">
        <div className="stat-card">
          <div className="stat-num">{scans.toLocaleString('en-US')}</div>
          <div className="stat-label">sites scanned</div>
        </div>
        <div className="stat-card">
          <div className="stat-num">{pct}%</div>
          <div className="stat-label">can migrate to static today</div>
        </div>
        <div className="stat-card">
          <div className="stat-num">{waitlist.toLocaleString('en-US')}</div>
          <div className="stat-label">people on the waitlist</div>
        </div>
      </div>

      <section className="findings">
        <h2>Top migration blockers</h2>
        {topBlockers.length === 0 ? (
          <p className="muted">No data yet — scan a site to be the first data point.</p>
        ) : (
          <ul className="blocker-list">
            {topBlockers.map((b) => (
              <li key={b.name}>
                <span className="blocker-name">{b.name}</span>
                <span className="blocker-bar">
                  <span style={{ width: `${maxCount ? (b.count / maxCount) * 100 : 0}%` }} />
                </span>
                <span className="blocker-count">{b.count}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="muted">
          A page builder in this list means the site&apos;s layouts are locked inside a visual builder — the
          single biggest reason a WordPress site cannot be moved to static hosting without a rebuild.
        </p>
      </section>

      <p className="share-line">
        <Link href="/">Scan your site →</Link>
      </p>

      <footer className="footer">
        Anonymous aggregate data · no URLs or content stored · open source (MIT)
      </footer>
    </div>
  );
}
