import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { reportStore } from '../../../lib/store';
import { ScoreCard, Findings, CtaCard } from '../../../components/ReportView';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const report = await reportStore.get(id);
  if (!report) return { title: 'Report not found' };
  const host = new URL(report.input.url).hostname;
  const title = `${host} — migration score ${report.score}/100`;
  const description = report.summary.slice(0, 150);
  return {
    title,
    description,
    openGraph: { title, description, type: 'article', images: ['/og.png'] },
    twitter: { card: 'summary_large_image', title, description, images: ['/og.png'] },
  };
}

export default async function ReportPage({ params }: Props) {
  const { id } = await params;
  const report = await reportStore.get(id);
  if (!report) notFound();
  return (
    <div className="wrap">
      <p className="path-line" style={{ textAlign: 'center' }}>
        Migration report for <strong>{new URL(report.input.url).hostname}</strong> · scanned{' '}
        {new Date(report.input.scannedAt).toUTCString()}
      </p>
      <ScoreCard report={report} />
      <Findings report={report} />
      <CtaCard report={report} reportId={id} />
      <p className="share-line">
        <Link href="/">Scan another site</Link> · <Link href="/stats">See all scans</Link>
      </p>
      <footer className="footer">
        Read-only scan · public pages only · report expires 7 days after scan · open source (MIT)
      </footer>
    </div>
  );
}
