import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { reportStore } from '../../../lib/store';
import { ScoreCard, Findings, CtaCard } from '../../../components/ReportView';

export const dynamic = 'force-dynamic';

interface Props {
  params: { id: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const report = await reportStore.get(params.id);
  if (!report) return { title: 'Report not found' };
  return {
    title: `Migration report: ${new URL(report.input.url).hostname} — ${report.score}/100`,
    description: report.summary.slice(0, 150),
  };
}

export default async function ReportPage({ params }: Props) {
  const report = await reportStore.get(params.id);
  if (!report) notFound();
  return (
    <div className="wrap">
      <p className="path-line" style={{ textAlign: 'center' }}>
        Migration report for <strong>{new URL(report.input.url).hostname}</strong> · scanned {new Date(report.input.scannedAt).toUTCString()}
      </p>
      <ScoreCard report={report} />
      <Findings report={report} />
      <CtaCard report={report} reportId={params.id} />
      <p className="share-line"><Link href="/">Scan another site</Link></p>
      <footer className="footer">
        Read-only scan · public pages only · report expires 7 days after scan · open source (MIT)
      </footer>
    </div>
  );
}
