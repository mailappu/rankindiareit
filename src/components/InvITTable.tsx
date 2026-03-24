import { useState, useMemo } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, Info, WifiOff, Radio, AlertTriangle } from 'lucide-react';
import type { InvITData, InvITScoreBreakdown } from '@/lib/invit-types';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { REITErrorBoundary } from '@/components/REITErrorBoundary';

type ScoredInvIT = InvITData & InvITScoreBreakdown;
type SortKey = keyof ScoredInvIT;

interface InvITTableProps {
  data: ScoredInvIT[];
  gsecYield: number;
  taxRate: number;
  preset?: string;
}

const SCORE_TOOLTIPS: Record<string, string> = {
  finalScore: 'Weighted composite of DivScore, SafetyScore & GrowthScore based on your selected strategy preset.',
  divScore: '(Post-Tax Yield / G-Sec Yield) × 100. Measures yield premium over the risk-free benchmark.',
  safetyScore: '(Availability × 40%) + (Contract Life/30 × 40%) + ((1−LTV) × 20%). Higher = more defensive.',
  growthScore: 'Weighted blend of 1Y (40%), 3Y (35%), 5Y (25%) price CAGR. Road/Toll gets 1.2× growth weight.',
};

const COLUMNS: { key: SortKey; label: string; format?: (v: any) => string }[] = [
  { key: 'name', label: 'InvIT' },
  { key: 'sector', label: 'Type' },
  { key: 'rank', label: '#' },
  { key: 'finalScore', label: 'Score', format: v => v.toFixed(1) },
  { key: 'cmp', label: 'CMP (₹)', format: v => v > 0 ? `₹${v.toFixed(2)}` : '—' },
  { key: 'divYield', label: 'Div Yield', format: v => v > 0 ? `${v.toFixed(2)}%` : '—' },
  { key: 'postTaxYield', label: 'Post-Tax Yield', format: v => v > 0 ? `${v.toFixed(2)}%` : '—' },
  { key: 'growth1Y', label: '1Y CAGR', format: v => v !== 0 ? `${v.toFixed(1)}%` : '—' },
  { key: 'safetyScore', label: 'Safety', format: v => v.toFixed(1) },
  { key: 'growthScore', label: 'Growth', format: v => v.toFixed(1) },
  { key: 'divScore', label: 'DivScore', format: v => v.toFixed(1) },
];

const STRATEGY_LABELS: Record<string, string> = {
  income: 'Income Focus',
  growth: 'Growth Focus',
  riskAverse: 'Risk Averse',
  custom: 'Custom',
};

function InvITRow({ invit, gsecYield, taxRate }: { invit: ScoredInvIT; gsecYield: number; taxRate: number }) {
  const isLivePrice = invit.isLiveCMP;
  const isMissingData = !invit.cmp || invit.cmp === 0;

  return (
    <tr className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
      {COLUMNS.map(col => {
        const val = invit[col.key];

        if (col.key === 'name') {
          return (
            <td key={col.key} className="px-3 py-2.5 sticky left-0 z-10 bg-card">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-foreground text-xs">{invit.ticker}</span>
                  {invit.reviewRequired && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <AlertTriangle className="h-3 w-3 text-terminal-amber" />
                      </TooltipTrigger>
                      <TooltipContent className="text-[10px] font-mono max-w-[200px]">
                        <p>XBRL tags not matched — metrics need manual review</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
                <div className="text-[10px] text-muted-foreground">{invit.name}</div>
                <div className="flex items-center gap-1 mt-0.5">
                  {invit.availability > 0 && (
                    <span className="text-[8px] px-1 py-0 rounded bg-teal-500/15 text-teal-400 font-mono">
                      {invit.availability.toFixed(0)}% Avail
                    </span>
                  )}
                  {invit.concessionLife > 0 && (
                    <span className="text-[8px] px-1 py-0 rounded bg-terminal-cyan/15 text-terminal-cyan font-mono">
                      {invit.concessionLife.toFixed(0)}Y Life
                    </span>
                  )}
                  <span className="text-[8px] px-1 py-0 rounded bg-muted text-foreground font-mono">
                    {invit.ltv.toFixed(0)}% LTV
                  </span>
                  <span className={`text-[8px] px-1 py-0 rounded font-mono ${
                    invit.safetyScore >= 80
                      ? 'bg-terminal-green/15 text-terminal-green'
                      : invit.safetyScore >= 60
                      ? 'bg-terminal-amber/15 text-terminal-amber'
                      : 'bg-terminal-red/15 text-terminal-red'
                  }`}>
                    {invit.safetyScore >= 80 ? '● Stable' : invit.safetyScore >= 60 ? '● Monitor' : '● Risk'}
                  </span>
                </div>
                {invit.lastXbrlSync && (
                  <div className="text-[8px] text-muted-foreground/60 mt-0.5">
                    Source: BSE XBRL · {new Date(invit.lastXbrlSync).toLocaleDateString('en-IN')}
                  </div>
                )}
              </div>
            </td>
          );
        }

        if (col.key === 'sector') {
          return (
            <td key={col.key} className="px-3 py-2.5">
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-teal-500/15 text-teal-400">
                {invit.sector}
              </span>
            </td>
          );
        }

        if (col.key === 'rank') {
          return (
            <td key={col.key} className="px-3 py-2.5">
              {isMissingData ? (
                <span className="text-muted-foreground font-mono">--</span>
              ) : (
                <span className={`font-bold text-sm ${getRankColor(invit.rank)}`}>
                  {invit.rank}
                </span>
              )}
            </td>
          );
        }

        if (col.key === 'finalScore') {
          return (
            <td key={col.key} className="px-3 py-2.5 font-bold text-sm text-foreground">
              {isMissingData ? '--' : (
                <div className="flex items-center gap-1">
                  {invit.finalScore.toFixed(1)}
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="text-muted-foreground hover:text-terminal-amber transition-colors">
                        <Info className="h-3 w-3" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-72 bg-card border-border text-xs font-mono p-3 space-y-2" side="left">
                      <div className="text-[11px] font-semibold text-foreground border-b border-border pb-1 mb-2">
                        {invit.ticker} — Why this Rank?
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        {invit.name} offers a <span className="text-primary font-semibold">{(invit.postTaxYield - gsecYield).toFixed(2)}%</span> post-tax premium over the 10Y Government Bond.
                      </p>
                      <div className="space-y-1.5">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">DivScore</span>
                          <span className="text-terminal-green font-semibold">{invit.divScore}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">SafetyScore</span>
                          <span className="text-terminal-blue font-semibold">{invit.safetyScore}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">GrowthScore</span>
                          <span className="text-terminal-cyan font-semibold">{invit.growthScore}</span>
                        </div>
                        {invit.sector === 'Road/Toll' && (
                          <p className="text-[9px] text-terminal-amber pt-1 border-t border-border">
                            ⚡ Road/Toll: Growth weighted 1.2× (WPI-linked toll hikes)
                          </p>
                        )}
                        {invit.sector === 'Transmission' && (
                          <p className="text-[9px] text-muted-foreground pt-1 border-t border-border">
                            Fixed annuity model: Growth weighted 0.8×
                          </p>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              )}
            </td>
          );
        }

        if (col.key === 'cmp') {
          return (
            <td key={col.key} className="px-3 py-2.5">
              <div className="flex items-center gap-1">
                <span className={!isLivePrice ? 'text-terminal-amber' : 'text-foreground'}>
                  {invit.cmp > 0 ? `₹${invit.cmp.toFixed(2)}` : '—'}
                </span>
                {invit.cmp > 0 && (
                  isLivePrice ? (
                    <span className="flex items-center gap-0.5">
                      <Radio className="h-2.5 w-2.5 text-terminal-green animate-pulse" />
                      <span className="text-[7px] px-1 py-0 rounded bg-terminal-green/15 text-terminal-green font-mono font-semibold">LIVE</span>
                    </span>
                  ) : (
                    <WifiOff className="h-3 w-3 text-terminal-amber shrink-0" />
                  )
                )}
              </div>
            </td>
          );
        }



        if (col.key === 'postTaxYield') {
          const yieldColor = invit.postTaxYield > gsecYield ? 'text-terminal-green' : 'text-foreground';
          return (
            <td key={col.key} className="px-3 py-2.5">
              <span className={`font-bold ${invit.postTaxYield > 0 ? yieldColor : 'text-muted-foreground'}`}>
                {invit.postTaxYield > 0 ? `${invit.postTaxYield.toFixed(2)}%` : '—'}
              </span>
            </td>
          );
        }

        return (
          <td key={col.key} className={`px-3 py-2.5 text-foreground ${val === null || val === 0 ? 'text-muted-foreground italic' : ''}`}>
            {col.format ? col.format(val) : String(val ?? '—')}
          </td>
        );
      })}
    </tr>
  );
}

function getRankColor(rank: number) {
  const colors = ['text-terminal-green', 'text-terminal-amber', 'text-terminal-blue', 'text-muted-foreground', 'text-muted-foreground'];
  return colors[rank - 1] || colors[4];
}

function ErrorRow({ colCount }: { colCount: number }) {
  return (
    <tr className="border-b border-border/50">
      <td colSpan={colCount} className="px-3 py-2.5 text-center text-terminal-red text-xs font-mono">
        ⚠ Data error — this row could not be rendered.
      </td>
    </tr>
  );
}

export function InvITTable({ data, gsecYield, taxRate, preset }: InvITTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('rank');
  const [sortAsc, setSortAsc] = useState(true);

  const sorted = useMemo(() => {
    const copy = [...data];
    copy.sort((a, b) => {
      const aMissing = !a.cmp;
      const bMissing = !b.cmp;
      if (aMissing && !bMissing) return 1;
      if (!aMissing && bMissing) return -1;

      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (aVal === null) return 1;
      if (bVal === null) return -1;
      if (typeof aVal === 'string') return sortAsc ? aVal.localeCompare(bVal as string) : (bVal as string).localeCompare(aVal);
      return sortAsc ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });
    return copy;
  }, [data, sortKey, sortAsc]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(key === 'rank'); }
  };

  return (
    <TooltipProvider>
      <div className="card-terminal overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="border-b border-border">
                {COLUMNS.map(col => (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key)}
                    className={`px-3 py-2.5 text-left text-[10px] text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors whitespace-nowrap select-none ${
                      col.key === 'name' ? 'sticky left-0 z-20 bg-card' : ''
                    }`}
                  >
                    <div className="flex items-center gap-1">
                      {col.label}
                      {SCORE_TOOLTIPS[col.key] && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-terminal-amber cursor-help"><Info className="h-2.5 w-2.5" /></span>
                          </TooltipTrigger>
                          <TooltipContent className="text-[10px] font-mono max-w-[260px]">
                            {SCORE_TOOLTIPS[col.key]}
                          </TooltipContent>
                        </Tooltip>
                      )}
                      {col.key === 'finalScore' && preset && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-primary cursor-help text-[8px]">({STRATEGY_LABELS[preset] || preset})</span>
                          </TooltipTrigger>
                          <TooltipContent className="text-xs font-mono">
                            Ranking weighted for {STRATEGY_LABELS[preset] || preset} strategy
                          </TooltipContent>
                        </Tooltip>
                      )}
                      {sortKey === col.key ? (
                        sortAsc ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                      ) : (
                        <ArrowUpDown className="h-3 w-3 opacity-30" />
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((invit) => (
                <REITErrorBoundary key={invit.id} fallback={<ErrorRow colCount={COLUMNS.length} />}>
                  <InvITRow invit={invit} gsecYield={gsecYield} taxRate={taxRate} />
                </REITErrorBoundary>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </TooltipProvider>
  );
}
