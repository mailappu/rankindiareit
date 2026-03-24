import { useState, useMemo } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, ExternalLink, FileText, Info, WifiOff, Radio } from 'lucide-react';
import { REITData, ScoreBreakdown, QUARTERLY_DISTRIBUTIONS } from '@/lib/reit-types';
import { getHeatmapClass } from '@/lib/reit-scoring';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { REITErrorBoundary } from '@/components/REITErrorBoundary';
import type { DiscoveredUrl, LivePrice } from '@/lib/sync-engine';

type ScoredREIT = REITData & ScoreBreakdown;
type SortKey = keyof ScoredREIT;

interface REITTableProps {
  data: ScoredREIT[];
  gsecYield: number;
  taxRate: number;
  preset?: string;
  sourceStatus?: Record<string, 'ok' | 'error'>;
  discoveredUrls?: Record<string, DiscoveredUrl>;
  livePrices?: Record<string, LivePrice>;
}

const COLUMNS: { key: SortKey; label: string; format?: (v: any) => string; heatmap?: string }[] = [
  { key: 'name', label: 'REIT' },
  { key: 'sector', label: 'Sector' },
  { key: 'rank', label: '#' },
  { key: 'finalScore', label: 'Score', format: v => v.toFixed(1), heatmap: 'finalScore' },
  { key: 'cmp', label: 'CMP (₹)', format: v => `₹${v.toFixed(2)}` },
  { key: 'nav', label: 'NAV (₹)', format: v => `₹${v}` },
  { key: 'divYield', label: 'Div Yield', format: v => `${v.toFixed(2)}%`, heatmap: 'divYield' },
  { key: 'postTaxYield', label: 'Post-Tax Yield', format: v => `${v.toFixed(2)}%`, heatmap: 'divYield' },
  { key: 'growth1Y', label: '1Y CAGR', format: v => `${v.toFixed(1)}%`, heatmap: 'growth' },
  { key: 'growth3Y', label: '3Y CAGR', format: v => v !== null ? `${v.toFixed(1)}%` : '—' },
  { key: 'growth5Y', label: '5Y CAGR', format: v => v !== null ? `${v.toFixed(1)}%` : '—' },
  { key: 'sinceListing', label: 'Since IPO', format: v => `${v.toFixed(1)}%`, heatmap: 'growth' },
  { key: 'divScore', label: 'DivScore', format: v => v.toFixed(1) },
  { key: 'valueScore', label: 'Value%', format: v => `${v.toFixed(1)}%`, heatmap: 'valueScore' },
  { key: 'safetyScore', label: 'Safety', format: v => v.toFixed(1) },
  { key: 'growthScore', label: 'Growth', format: v => v.toFixed(1) },
  { key: 'occupancy', label: 'Occup.', format: v => `${v}%`, heatmap: 'occupancy' },
  { key: 'wale', label: 'WALE', format: v => `${v}Y` },
  { key: 'ltv', label: 'LTV', format: v => `${v}%`, heatmap: 'ltv' },
  { key: 'pipeline', label: 'Pipeline', format: v => `${v}M sqft` },
  { key: 'irUrl', label: 'Source' },
];

function ScoreInfoPopover({ reit, gsecYield }: { reit: ScoredREIT; gsecYield: number }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="ml-1 text-muted-foreground hover:text-terminal-amber transition-colors">
          <Info className="h-3 w-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 bg-card border-border text-xs font-mono p-3 space-y-2" side="left">
        <div className="text-[11px] font-semibold text-foreground border-b border-border pb-1 mb-2">
          {reit.ticker} — Score Breakdown
        </div>
        <div className="space-y-1.5">
          <div className="flex justify-between">
            <span className="text-muted-foreground">DivScore</span>
            <span className="text-terminal-green">
              ({reit.divYield.toFixed(2)}% / {gsecYield}%) × 100 = <span className="font-semibold">{reit.divScore}</span>
            </span>
          </div>
          <div className="flex justify-between text-[9px] text-muted-foreground">
            <span>Yield</span>
            <span>₹{reit.ttmDistribution} TTM / ₹{reit.cmp.toFixed(2)} CMP × 100</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">ValueScore</span>
            <span className={reit.valueScore >= 0 ? 'text-terminal-green' : 'text-terminal-red'}>
              (({reit.nav} - {reit.cmp.toFixed(0)}) / {reit.nav}) × 100 = <span className="font-semibold">{reit.valueScore}%</span>
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">SafetyScore</span>
            <span className="text-terminal-blue">
              ({reit.occupancy} + {100 - reit.ltv} + {(reit.wale * 10).toFixed(0)}) / 3 = <span className="font-semibold">{reit.safetyScore}</span>
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">GrowthScore</span>
            <span className="text-terminal-cyan">
              <span className="font-semibold">{reit.growthScore}</span>
            </span>
          </div>
          <div className="border-t border-border pt-1.5 flex justify-between font-semibold">
            <span className="text-foreground">Final Score</span>
            <span className="text-terminal-amber">{reit.finalScore}</span>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function REITRow({
  reit,
  gsecYield,
  taxRate,
  sourceStatus,
  discoveredUrls,
  livePrices,
}: {
  reit: ScoredREIT;
  gsecYield: number;
  taxRate: number;
  sourceStatus?: Record<string, 'ok' | 'error'>;
  discoveredUrls?: Record<string, DiscoveredUrl>;
  livePrices?: Record<string, LivePrice>;
}) {
  const priceInfo = livePrices?.[reit.id];
  const isLivePrice = priceInfo?.isLive ?? reit.isLiveCMP;
  const isOfflinePrice = priceInfo ? !priceInfo.isLive : !reit.isLiveCMP;
  const isMissingData = !reit.cmp || !reit.divYield;

  return (
    <tr className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
      {COLUMNS.map(col => {
        const val = reit[col.key];
        const heatClass = col.heatmap && val !== null ? getHeatmapClass(val as number, col.heatmap) : '';

        if (col.key === 'rank') {
          return (
            <td key={col.key} className="px-3 py-2.5">
              {isMissingData ? (
                <span className="text-muted-foreground font-mono">--</span>
              ) : (
                <span className={`font-bold text-sm ${getRankBadge(reit.rank)}`}>
                  {reit.rank}
                </span>
              )}
            </td>
          );
        }

        if (col.key === 'finalScore') {
          return (
            <td key={col.key} className={`px-3 py-2.5 font-bold text-sm text-foreground ${heatClass}`}>
              {isMissingData ? (
                <span className="text-muted-foreground font-mono">--</span>
              ) : (
                <div className="flex items-center">
                  {reit.finalScore.toFixed(1)}
                  <ScoreInfoPopover reit={reit} gsecYield={gsecYield} />
                </div>
              )}
            </td>
          );
        }

        if (col.key === 'cmp') {
          return (
            <td key={col.key} className="px-3 py-2.5">
              <div className="flex items-center gap-1">
                <span className={isOfflinePrice ? 'text-terminal-amber' : 'text-foreground'}>
                  ₹{reit.cmp.toFixed(2)}
                </span>
                {isLivePrice ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="flex items-center gap-0.5">
                        <Radio className="h-2.5 w-2.5 text-terminal-green animate-pulse" />
                        <span className="text-[7px] px-1 py-0 rounded bg-terminal-green/15 text-terminal-green font-mono font-semibold">
                          LIVE
                        </span>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-[10px] font-mono">
                      <p>Live market price · {priceInfo?.fetchedAt ? new Date(priceInfo.fetchedAt).toLocaleTimeString('en-IN') : 'Just now'}</p>
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <WifiOff className="h-3 w-3 text-terminal-amber shrink-0" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-[10px] font-mono max-w-[220px]">
                      <p>API unavailable. Showing price from {priceInfo?.fetchedAt ? new Date(priceInfo.fetchedAt).toLocaleTimeString('en-IN') : 'Mar 21 close'}.</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            </td>
          );
        }

        if (col.key === 'nav') {
          return (
            <td key={col.key} className="px-3 py-2.5">
              <div className="flex items-center gap-1">
                <span className="text-foreground">₹{reit.nav}</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-[8px] px-1 py-0.5 rounded bg-terminal-green/15 text-terminal-green font-mono">
                      VERIFIED
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-[10px] font-mono">
                    <p>Source: Q3 FY26 Official Filings</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </td>
          );
        }

        if (col.key === 'divYield') {
          const quarters = QUARTERLY_DISTRIBUTIONS[reit.id] || [];
          return (
            <td key={col.key} className={`px-3 py-2.5 ${heatClass}`}>
              <div className="flex items-center gap-1">
                <span className="text-foreground">{reit.divYield.toFixed(2)}%</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="text-muted-foreground hover:text-terminal-amber transition-colors">
                      <Info className="h-2.5 w-2.5" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 bg-card border-border text-xs font-mono p-3 space-y-1.5" side="top">
                    <div className="text-[11px] font-semibold text-foreground border-b border-border pb-1 mb-1">
                      Yield Breakdown
                    </div>
                    {quarters.length > 0 && (
                      <div className="space-y-0.5 pb-1 border-b border-border mb-1">
                        <div className="text-[9px] text-muted-foreground uppercase tracking-wider mb-1">Quarterly Distributions</div>
                        {quarters.map((q) => (
                          <div key={q.quarter} className="flex justify-between">
                            <span className="text-muted-foreground">{q.quarter}</span>
                            <span className="text-foreground">₹{q.amount.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex justify-between font-semibold">
                      <span className="text-muted-foreground">TTM DPU</span>
                      <span className="text-foreground">₹{reit.ttmDistribution}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">CMP</span>
                      <span className="text-foreground">₹{reit.cmp.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between border-t border-border pt-1">
                      <span className="text-muted-foreground">Yield</span>
                      <span className="text-terminal-green font-semibold">{reit.divYield.toFixed(2)}%</span>
                    </div>
                    <p className="text-[9px] text-muted-foreground pt-1">Source: Q3 FY26 distributions</p>
                  </PopoverContent>
                </Popover>
              </div>
            </td>
          );
        }

        if (col.key === 'name') {
          const status = sourceStatus?.[reit.id];
          const discovered = discoveredUrls?.[reit.id];
          const pdfUrl = (discovered?.discoveredFrom === 'scrape' ? discovered.pdfUrl : null) || reit.latestPdfUrl;

          return (
            <td key={col.key} className="px-3 py-2.5 sticky left-0 z-10 bg-card">
              <div className="flex items-center gap-2">
                {status && (
                  <span
                    className={`inline-block h-1.5 w-1.5 rounded-full shrink-0 ${
                      status === 'ok' ? 'bg-terminal-green' : 'bg-terminal-red'
                    }`}
                    title={status === 'ok' ? 'Source verified' : 'Source unreachable'}
                  />
                )}
                <div>
                  <div className="font-semibold text-foreground text-xs">{reit.ticker}</div>
                  <div className="text-[10px] text-muted-foreground">{reit.name}</div>
                </div>
                <div className="flex items-center gap-1">
                  {pdfUrl && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <a
                          href={pdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-terminal-green hover:text-terminal-green/80 transition-colors"
                        >
                          <FileText className="h-3 w-3" />
                        </a>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-[10px] font-mono max-w-[200px]">
                        <p className="font-semibold">View Latest Presentation</p>
                        {discovered?.label && (
                          <p className="text-muted-foreground truncate">{discovered.label}</p>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  )}
                  <a href={reit.irUrl} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-terminal-blue transition-colors">
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            </td>
          );
        }

        if (col.key === 'sector') {
          return (
            <td key={col.key} className="px-3 py-2.5">
              <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                reit.sector === 'Retail' ? 'bg-terminal-amber/15 text-terminal-amber' : 'bg-terminal-blue/15 text-terminal-blue'
              }`}>
                {reit.sector}
              </span>
            </td>
          );
        }

        if (col.key === 'postTaxYield') {
          const tb = reit.taxBreakdown;
          const ttm = reit.ttmDistribution;
          const rate = taxRate / 100;
          const interestAmt = ttm * tb.interest;
          const exemptAmt = ttm * tb.divExempt;
          const taxableAmt = ttm * tb.divTaxable;
          const amortAmt = ttm * tb.amortization;
          const postTaxDist = interestAmt * (1 - rate) + exemptAmt + taxableAmt * (1 - rate) + amortAmt;

          return (
            <td key={col.key} className={`px-3 py-2.5 ${heatClass}`}>
              <div className="flex items-center gap-1">
                <span className="text-foreground">{reit.postTaxYield.toFixed(2)}%</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="text-muted-foreground hover:text-terminal-amber transition-colors">
                      <Info className="h-2.5 w-2.5" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 bg-card border-border text-xs font-mono p-3 space-y-1.5" side="top">
                    <div className="text-[11px] font-semibold text-foreground border-b border-border pb-1 mb-1">
                      {reit.ticker} — Post-Tax Yield @ {taxRate}%
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Interest ({(tb.interest * 100).toFixed(0)}%)</span>
                        <span className="text-terminal-red">₹{interestAmt.toFixed(2)} × {(1 - rate).toFixed(2)} = ₹{(interestAmt * (1 - rate)).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Exempt ({(tb.divExempt * 100).toFixed(0)}%)</span>
                        <span className="text-terminal-green">₹{exemptAmt.toFixed(2)} × 1.00 = ₹{exemptAmt.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Taxable ({(tb.divTaxable * 100).toFixed(0)}%)</span>
                        <span className="text-terminal-red">₹{taxableAmt.toFixed(2)} × {(1 - rate).toFixed(2)} = ₹{(taxableAmt * (1 - rate)).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Amort. ({(tb.amortization * 100).toFixed(0)}%)</span>
                        <span className="text-terminal-green">₹{amortAmt.toFixed(2)} × 1.00 = ₹{amortAmt.toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="border-t border-border pt-1.5 space-y-1">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Net DPU</span>
                        <span className="text-foreground font-semibold">₹{postTaxDist.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Post-Tax Yield</span>
                        <span className="text-terminal-green font-semibold">{reit.postTaxYield.toFixed(2)}%</span>
                      </div>
                    </div>
                    <p className="text-[9px] text-muted-foreground pt-1">Exempt & amortization are never taxed</p>
                  </PopoverContent>
                </Popover>
              </div>
            </td>
          );
        }

        if (col.key === 'irUrl') {
          return (
            <td key={col.key} className="px-3 py-2.5">
              <a
                href={reit.irUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-terminal-blue hover:text-terminal-blue/80 underline underline-offset-2 text-[10px]"
              >
                IR Page
              </a>
            </td>
          );
        }

        return (
          <td key={col.key} className={`px-3 py-2.5 ${heatClass} text-foreground ${val === null ? 'text-muted-foreground italic' : ''}`}>
            {col.format ? col.format(val) : String(val)}
          </td>
        );
      })}
    </tr>
  );
}

function getRankBadge(rank: number) {
  const colors = ['text-terminal-green', 'text-terminal-amber', 'text-terminal-blue', 'text-muted-foreground'];
  return colors[rank - 1] || colors[3];
}

function ErrorRow({ colCount }: { colCount: number }) {
  return (
    <tr className="border-b border-border/50">
      <td colSpan={colCount} className="px-3 py-2.5 text-center text-terminal-red text-xs font-mono">
        ⚠ Data error — this row could not be rendered. Using cached values.
      </td>
    </tr>
  );
}

const STRATEGY_LABELS: Record<string, string> = {
  income: 'Income Focus',
  growth: 'Growth Focus',
  riskAverse: 'Risk Averse',
  custom: 'Custom',
};

export function REITTable({ data, gsecYield, taxRate, preset, sourceStatus, discoveredUrls, livePrices }: REITTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('rank');
  const [sortAsc, setSortAsc] = useState(true);

  const sorted = useMemo(() => {
    const copy = [...data];
    copy.sort((a, b) => {
      const aMissing = !a.cmp || !a.divYield;
      const bMissing = !b.cmp || !b.divYield;
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
              {sorted.map((reit) => (
                <REITErrorBoundary key={reit.id} fallback={<ErrorRow colCount={COLUMNS.length} />}>
                  <REITRow
                    reit={reit}
                    gsecYield={gsecYield}
                    taxRate={taxRate}
                    sourceStatus={sourceStatus}
                    discoveredUrls={discoveredUrls}
                    livePrices={livePrices}
                  />
                </REITErrorBoundary>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </TooltipProvider>
  );
}
