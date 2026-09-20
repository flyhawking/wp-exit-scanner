import Link from 'next/link';
import { ScanFlow } from '../components/ScanFlow';
import { reportStore } from '../lib/store';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const { scans, canMigrate } = await reportStore.stats();
  const pct = scans > 0 ? Math.round((canMigrate / scans) * 100) : 0;
  return (
    <div className="wrap">
      <section className="hero">
        <h1>Find out if you can leave WordPress in 30 seconds — without losing a single URL.</h1>
        <p>
          Free migration feasibility scan. We check page builders, plugins, shortcodes and your permalink
          structure, then tell you honestly: migrate now, wait, or stay on WordPress.
        </p>
      </section>

      <div className="story">
        <em>Why trust this tool?</em> Twenty years ago I built CMSware, a top-3 CMS in China.
        Twenty years later, the AI era changed what a content platform should be — and I came back for the
        people WordPress is wearing out. This scanner is step one of that rebuild, open source, forever.
      </div>

      <ScanFlow />

      {scans > 0 ? (
        <p className="stats-line">
          {scans.toLocaleString('en-US')} sites scanned · {pct}% can migrate to static today ·{' '}
          <Link href="/stats">see the data</Link>
        </p>
      ) : null}

      <footer className="footer">
        Read-only scan of public pages only · robots.txt respected · reports expire in 7 days ·
        Is this your site and you want it removed? <a href="mailto:hello@wpexit.dev">Contact us</a> ·
        <a href="https://github.com/flyhawking/wp-exit-scanner"> open source (MIT)</a>
      </footer>
    </div>
  );
}
