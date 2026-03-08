import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Code, ChevronDown, ChevronUp, CheckCircle, AlertTriangle, MinusCircle } from 'lucide-react';

interface DetectionSnapshotViewProps {
  snapshot: Record<string, any> | null;
}

const SectionHeader = ({ children }: { children: React.ReactNode }) => (
  <h4 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2 mt-4 first:mt-0">
    {children}
  </h4>
);

const EvidencePill = ({ label, variant }: { label: string; variant: 'lure' | 'link' | 'gift' | 'default' }) => {
  const colors: Record<string, string> = {
    lure: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    link: 'bg-red-500/20 text-red-300 border-red-500/30',
    gift: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    default: 'bg-muted text-muted-foreground border-border',
  };
  return (
    <span className={`inline-block text-xs px-2 py-0.5 rounded-full border ${colors[variant]}`}>
      {label}
    </span>
  );
};

const SourceIcon = ({ status }: { status: string }) => {
  if (status === 'success') return <CheckCircle className="w-3.5 h-3.5 text-emerald-400 inline" />;
  if (status === 'failed') return <AlertTriangle className="w-3.5 h-3.5 text-red-400 inline" />;
  return <MinusCircle className="w-3.5 h-3.5 text-muted-foreground inline" />;
};

const verdictColor = (verdict: string) => {
  if (verdict === 'DOWNGRADED') return 'text-emerald-400';
  if (['CONFIRMED', 'ESCALATED'].includes(verdict)) return 'text-red-400';
  return 'text-muted-foreground';
};

const DetectionSnapshotView = ({ snapshot }: DetectionSnapshotViewProps) => {
  const [showRaw, setShowRaw] = useState(false);

  if (!snapshot) {
    return (
      <p className="text-sm italic text-muted-foreground py-2">
        No detection data available for this submission.
      </p>
    );
  }

  const flagged = snapshot.flaggedCheck;
  const scan = snapshot.scanSnapshot;
  const email = snapshot.emailContext;
  const ai = scan?.aiVerification;
  const evidence = flagged?.evidence;

  return (
    <div className="space-y-1 text-sm">
      {/* WHAT WAS FLAGGED */}
      {flagged && (
        <>
          <SectionHeader>What Was Flagged</SectionHeader>
          <div className="rounded-md border border-border bg-muted/30 p-3 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-medium">{flagged.title?.replace(/_/g, ' ')?.replace(/\b\w/g, (c: string) => c.toUpperCase())}</span>
              <div className="flex items-center gap-2">
                <Badge variant="destructive" className="text-[10px]">{flagged.severity}</Badge>
                {flagged.score != null && (
                  <span className="text-xs text-muted-foreground">Score: {flagged.score}</span>
                )}
              </div>
            </div>
            {flagged.details && (
              <p className="text-xs text-muted-foreground">{flagged.details}</p>
            )}
          </div>
        </>
      )}

      {/* EVIDENCE COLLECTED */}
      {evidence && (
        <>
          <SectionHeader>Evidence Collected</SectionHeader>
          <div className="space-y-2">
            {evidence.lureKeywords?.length > 0 && (
              <div className="flex flex-wrap gap-1 items-center">
                <span className="text-xs text-muted-foreground mr-1">Lure Keywords:</span>
                {evidence.lureKeywords.map((kw: string, i: number) => (
                  <EvidencePill key={i} label={kw} variant="lure" />
                ))}
              </div>
            )}
            {evidence.externalLinks?.length > 0 && (
              <div className="space-y-0.5">
                <span className="text-xs text-muted-foreground">External Links:</span>
                {evidence.externalLinks.map((link: string, i: number) => (
                  <EvidencePill key={i} label={link} variant="link" />
                ))}
              </div>
            )}
            {evidence.giftCardKeywordsFound?.length > 0 && (
              <div className="flex flex-wrap gap-1 items-center">
                <span className="text-xs text-muted-foreground mr-1">Gift Card Signals:</span>
                {evidence.giftCardKeywordsFound.map((kw: string, i: number) => (
                  <EvidencePill key={i} label={kw} variant="gift" />
                ))}
              </div>
            )}
            {evidence.senderMismatch && (
              <div className="text-xs">
                <span className="text-muted-foreground">Sender Mismatch:</span>{' '}
                <span className="text-red-400">{String(evidence.senderMismatch)}</span>
              </div>
            )}
            {!evidence.senderMismatch && !evidence.lureKeywords?.length && !evidence.externalLinks?.length && !evidence.giftCardKeywordsFound?.length && (
              <p className="text-xs text-muted-foreground italic">No evidence items found.</p>
            )}
          </div>
        </>
      )}

      {/* AI SECOND OPINION */}
      {ai && (
        <>
          <SectionHeader>AI Second Opinion</SectionHeader>
          <div className="rounded-md border border-border bg-muted/30 p-3 space-y-1">
            <div className="flex items-center gap-3">
              <span className={`font-semibold ${verdictColor(ai.verdict)}`}>{ai.verdict}</span>
              {ai.confidence != null && (
                <span className="text-xs text-muted-foreground">Confidence: {ai.confidence}%</span>
              )}
            </div>
            {ai.reason && <p className="text-xs text-muted-foreground">{ai.reason}</p>}
          </div>
        </>
      )}

      {/* SCAN CONTEXT */}
      {scan && (
        <>
          <SectionHeader>Scan Context</SectionHeader>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            <div><span className="text-muted-foreground">Overall:</span> {scan.overallSeverity}</div>
            <div><span className="text-muted-foreground">Action:</span> {scan.action}</div>
            <div><span className="text-muted-foreground">Hard Signals:</span> {scan.hardSignals?.length ?? 0}</div>
            <div><span className="text-muted-foreground">Soft Signals:</span> {scan.softSignals?.length ?? 0}</div>
            <div><span className="text-muted-foreground">Checks Run:</span> {scan.checksRun?.length ?? 0}</div>
            <div><span className="text-muted-foreground">Checks Flagged:</span> {scan.checksFlagged?.length ?? 0}</div>
          </div>
          {scan.sources?.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {scan.sources.map((s: any, i: number) => (
                <span key={i} className="inline-flex items-center gap-1 text-xs">
                  <SourceIcon status={s.status} />
                  <span>{s.id}</span>
                  {s.reason && <span className="text-muted-foreground">({s.reason.replace(/_/g, ' ')})</span>}
                </span>
              ))}
            </div>
          )}
        </>
      )}

      {/* EMAIL CONTEXT */}
      {email && (
        <>
          <SectionHeader>Email</SectionHeader>
          <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs">
            <span className="text-muted-foreground">From:</span>
            <span className="font-mono break-all">{email.sender}</span>
            <span className="text-muted-foreground">Subject:</span>
            <span>{email.subject}</span>
            <span className="text-muted-foreground">Context:</span>
            <span>{email.hostname}</span>
          </div>
        </>
      )}

      {/* RAW JSON TOGGLE */}
      <Collapsible open={showRaw} onOpenChange={setShowRaw}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 mt-3">
            <Code className="w-3.5 h-3.5" />
            {showRaw ? 'Hide' : 'View'} Raw JSON
            {showRaw ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <pre className="mt-2 p-3 bg-muted rounded text-[11px] font-mono overflow-auto max-h-[400px] leading-relaxed">
            {JSON.stringify(snapshot, null, 2)}
          </pre>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

export default DetectionSnapshotView;
