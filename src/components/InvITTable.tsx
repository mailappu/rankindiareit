import { useState, useMemo } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, ExternalLink, Info, WifiOff, Radio, AlertTriangle } from 'lucide-react';
import type { InvITData, InvITScoreBreakdown } from '@/lib/invit-types';
import { getHeatmapClass } from '@/lib/reit-scoring';
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
  finalScore: 'Weighted composite of DivScore, ValueScore, SafetyScore & GrowthScore based on your selected strategy preset.',
  divScore: '(Post-Tax Yield / G-Sec Yield) × 100. Measures yield premium over the risk-free benchmark.',
  valueScore: '((NAV − CMP) / NAV) × 100. Positive = trading below intrinsic value (undervalued).',
  safetyScore: '(Availability × 40%) + (Concession/30 × 40%) + ((1−LTV) × 20%). Higher = more defensive.',
  growthScore: 'Weighted blend of 1Y (40%), 3Y (35%), 5Y (25%) price CAGR. If 5Y/3Y is N/A, weight redistributes.',
};

const COLUMNS: { key: SortKey; label: string; format?: (v: any) => string; heatmap?: string }[] = [
  { key: 'name', label: 'Asset' },
  { key: 'sector', label: 'Type' },
  { key: 'rank', label: '#' },
  { key: 'finalScore', label: 'Score', format: v => v.toFixed(1), heatmap: 'finalScore' },
  { key: 'cmp', label: 'CMP (₹)', format: v => v > 0 ? `₹${v.toFixed(2)}` : '—' },
  { key: 'nav', label: 'NAV (₹)', format: v => `₹${v}` },
  { key: 'divYield', label: 'Div Yield', format: v => v > 0 ? `${v.toFixed(2)}%` : '—', heatmap: 'divYield' },
  { key: 'postTaxYield', label: 'Post-Tax Yield', format: v => v > 0 ? `${v.toFixed(2)}%` : '—', heatmap: 'divYield' },
  { key: 'growth1Y', label: '1Y CAGR', format: v => v !== 0 ? `${v.toFixed(1)}%` : '—', heatmap: 'growth' },
  { key: 'growth3Y', label: '3Y CAGR', format: v => v !== null ? `${v.toFixed(1)}%` : '—' },
  { key: 'growth5Y', label: '5Y CAGR', format: v => v !== null ? `${v.toFixed(1)}%` : '—' },
  { key: 'sinceListing', label: 'Since IPO', format: v => `${v.toFixed(1)}%`, heatmap: 'growth' },
  { key: 'divScore', label: 'DivScore', format: v => v.toFixed(1) },
  { key: 'valueScore', label: 'Value%', format: v => `${v.toFixed(1)}%`, heatmap: 'valueScore' },
  { key: 'safetyScore', label: 'Safety', format: v => v.toFixed(1) },
  { key: 'growthScore', label: 'Growth', format: v => v.toFixed(1) },
];

function ScoreInfoPopover({ invit, gsecYield }: { invit: ScoredInvIT; gsecYield: number }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="ml-1 text-muted-foreground hover:text-terminal-amber transition-colors">
          <Info className="h-3 w-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 bg-card border-border text-xs font-mono p-3 space-y-2" side="left">
        <div className="text-[11px] font-semibold text-foreground border-b border-border pb-1 mb-2">
          {invit.ticker} — Score Breakdown
        </div>
        <div className="space-y-1.5">
          <div className="flex justify-between">
            <span className="text-muted-foreground">DivScore</span>
            <span className="text-terminal-green">
              ({invit.postTaxYield.toFixed(2)}% / {gsecYield}%) × 100 = <span className="font-semibold">{invit.divScore}</span>
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">ValueScore</span>
            <span className={invit.valueScore >= 0 ? 'text-terminal-green' : 'text-terminal-red'}>
              (({invit.nav} - {invit.cmp.toFixed(0)}) / {invit.nav}) × 100 = <span className="font-semibold">{invit.valueScore}%</span>
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">SafetyScore</span>
            <span className="text-terminal-blue">
              (Avail:{invit.availability}% × 0.4) + (Life:{invit.concessionLife}Y × 0.4) + (LTV:{invit.ltv}% × 0.2) = <span className="font-semibold">{invit.safetyScore}</span>
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">GrowthScore</span>
            <span className="text-terminal-cyan">
              <span className="font-semibold">{invit.growthScore}</span>
            </span>
          </div>
          <div className="border-t border-border pt-1.5 flex justify-between font-semibold">
            <span className="text-foreground">Final Score</span>
            <span className="text-terminal-amber">{invit.finalScore}</span>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function InvITRow({ invit, gsecYield, taxRate }: { invit: ScoredInvIT; gsecYield: number; taxRate: number }) {
  const isLivePrice = invit.isLiveCMP;
  const isMissingData = !invit.cmp || invit.cmp === 0;

  return (
    <tr className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
      {COLUMNS.map(col => {
        const val = invit[col.key];
        const heatClass = col.heatmap && val !== null ? getHeatmapClass(val as number, col.heatmap) : '';

        // ── Asset cell with badges + IR link ──
        if (col.key === 'name') {
          return (
            <td key={col.key} className="px-3 py-2.5 sticky left-0 z-10 bg-card">
              <div className="flex items-center gap-2">
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
                </div>
                <div className="flex items-center gap-1">
                  <a href={invit.irUrl} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-terminal-blue transition-colors">
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            </td>
          );
        }

        // ── Sector badge ──
        if (col.key === 'sector') {
          return (
            <td key={col.key} className="px-3 py-2.5">
              <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                invit.sector === 'Road/Toll' ? 'bg-terminal-amber/15 text-terminal-amber' : 'bg-teal-500/15 text-teal-400'
              }`}>
                {invit.sector}
              </span>
            </td>
          );
        }

        // ── Rank ──
        if (col.key === 'rank') {
          return (
            <td key={col.key} className="px-3 py-2.5">
              {isMissingData ? (
                <span className="text-muted-foreground font-mono">--</span>
              ) : (
                <span className={`font-bold text-sm ${getRankColor(invit.rank)}`}>{invit.rank}</span>
              )}
            </td>
          );
        }

        // ── Score with popover ──
        if (col.key === 'finalScore') {
          return (
            <td key={col.key} className={`px-3 py-2.5 font-bold text-sm text-foreground ${heatClass}`}>
              {isMissingData ? '--' : (
                <div className="flex items-center">
                  {invit.finalScore.toFixed(1)}
                  <ScoreInfoPopover invit={invit} gsecYield={gsecYield} />
                </div>
              )}
            </td>
          );
        }

        // ── CMP with LIVE/CACHED badge + tooltip ──
        if (col.key === 'cmp') {
          return (
            <td key={col.key} className="px-3 py-2.5">
              <div className="flex flex-col">
                <span className={!isLivePrice ? 'text-terminal-amber' : 'text-foreground'}>
                  {invit.cmp > 0 ? `₹${invit.cmp.toFixed(2)}` : '—'}
                </span>
                {invit.cmp > 0 && (
                  isLivePrice ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="flex items-center gap-0.5 mt-0.5">
                          <Radio className="h-2 w-2 text-terminal-green animate-pulse" />
                          <span className="text-[7px] px-1 py-0 rounded bg-terminal-green/15 text-terminal-green font-mono font-semibold">LIVE</span>
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-[10px] font-mono">
                        <p>Live market price · {invit.cmpCachedAt ? new Date(invit.cmpCachedAt).toLocaleTimeString('en-IN') : 'Just now'}</p>
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="flex items-center gap-0.5 mt-0.5">
                          <WifiOff className="h-2 w-2 text-terminal-amber" />
                          <span className="text-[7px] px-1 py-0 rounded bg-terminal-amber/15 text-terminal-amber font-mono font-semibold">CACHED</span>
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-[10px] font-mono max-w-[220px]">
                        <p>API unavailable. Showing price from {invit.cmpCachedAt ? new Date(invit.cmpCachedAt).toLocaleTimeString('en-IN') : 'last close'}.</p>
                      </TooltipContent>
                    </Tooltip>
                  )
                )}
              </div>
            </td>
          );
        }

        // ── NAV with VERIFIED badge ──
        if (col.key === 'nav') {
          return (
            <td key={col.key} className="px-3 py-2.5">
              <div className="flex flex-col">
                <span className="text-foreground">₹{invit.nav}</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-[7px] px-1 py-0 rounded bg-terminal-green/15 text-terminal-green font-mono mt-0.5 w-fit">
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

        // ── Post-Tax Yield (green if > G-Sec) ──
        if (col.key === 'postTaxYield') {
          const yieldColor = invit.postTaxYield > gsecYield ? 'text-terminal-green' : 'text-foreground';
          const tb = invit.taxBreakdown;
          const ttm = invit.ttmDistribution;
          const rate = taxRate / 100;
          const interestAmt = ttm * tb.interest;
          const dividendAmt = ttm * tb.dividend;
          const repaymentAmt = ttm * tb.repaymentOfDebt;

          return (
            <td key={col.key} className={`px-3 py-2.5 ${heatClass}`}>
              <div className="flex items-center gap-1">
                <span className={`font-bold ${invit.postTaxYield > 0 ? yieldColor : 'text-muted-foreground'}`}>
                  {invit.postTaxYield > 0 ? `${invit.postTaxYield.toFixed(2)}%` : '—'}
                </span>
                {invit.postTaxYield > 0 && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="text-muted-foreground hover:text-terminal-amber transition-colors">
                        <Info className="h-2.5 w-2.5" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 bg-card border-border text-xs font-mono p-3 space-y-1.5" side="top">
                      <div className="text-[11px] font-semibold text-foreground border-b border-border pb-1 mb-1">
                        {invit.ticker} — Post-Tax Yield @ {taxRate}%
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Interest ({(tb.interest * 100).toFixed(0)}%)</span>
                          <span className="text-terminal-red">₹{interestAmt.toFixed(2)} × {(1 - rate).toFixed(2)} = ₹{(interestAmt * (1 - rate)).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Dividend ({(tb.dividend * 100).toFixed(0)}%)</span>
                          <span className={tb.spvDividendTaxRate > 0 ? 'text-terminal-red' : 'text-terminal-green'}>
                            ₹{dividendAmt.toFixed(2)} × {(1 - (tb.spvDividendTaxRate ?? 0)).toFixed(2)} = ₹{(dividendAmt * (1 - (tb.spvDividendTaxRate ?? 0))).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Repayment ({(tb.repaymentOfDebt * 100).toFixed(0)}%)</span>
                          <span className="text-terminal-green">₹{repaymentAmt.toFixed(2)} × 1.00 = ₹{repaymentAmt.toFixed(2)}</span>
                        </div>
                      </div>
                      <div className="border-t border-border pt-1.5 space-y-1">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Net DPU</span>
                          <span className="text-foreground font-semibold">₹{(interestAmt * (1 - rate) + dividendAmt * (1 - (tb.spvDividendTaxRate ?? 0)) + repaymentAmt).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Post-Tax Yield</span>
                          <span className="text-terminal-green font-semibold">{invit.postTaxYield.toFixed(2)}%</span>
                        </div>
                      </div>
                      <p className="text-[9px] text-muted-foreground pt-1">Repayment of debt is always tax-free</p>
                    </PopoverContent>
                  </Popover>
                )}
              </div>
            </td>
          );
        }

        // ── Div Yield with popover ──
        if (col.key === 'divYield') {
          return (
            <td key={col.key} className={`px-3 py-2.5 ${heatClass}`}>
              <div className="flex items-center gap-1">
                <span className="text-foreground">{invit.divYield > 0 ? `${invit.divYield.toFixed(2)}%` : '—'}</span>
                {invit.divYield > 0 && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="text-muted-foreground hover:text-terminal-amber transition-colors">
                        <Info className="h-2.5 w-2.5" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56 bg-card border-border text-xs font-mono p-3 space-y-1.5" side="top">
                      <div className="text-[11px] font-semibold text-foreground border-b border-border pb-1 mb-1">Yield Breakdown</div>
                      <div className="flex justify-between font-semibold">
                        <span className="text-muted-foreground">TTM DPU</span>
                        <span className="text-foreground">₹{invit.ttmDistribution}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">CMP</span>
                        <span className="text-foreground">₹{invit.cmp.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between border-t border-border pt-1">
                        <span className="text-muted-foreground">Yield</span>
                        <span className="text-terminal-green font-semibold">{invit.divYield.toFixed(2)}%</span>
                      </div>
                      <div className="border-t border-border pt-1 space-y-0.5">
                        <div className="text-[9px] text-muted-foreground uppercase tracking-wider">NDCF Split</div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Interest</span>
                          <span className="text-foreground">{(invit.taxBreakdown.interest * 100).toFixed(0)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Dividend</span>
                          <span className="text-foreground">{(invit.taxBreakdown.dividend * 100).toFixed(0)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Repayment</span>
                          <span className="text-foreground">{(invit.taxBreakdown.repaymentOfDebt * 100).toFixed(0)}%</span>
                        </div>
                      </div>
                      <p className="text-[9px] text-muted-foreground pt-1">Source: Q3 FY26 distributions</p>
                    </PopoverContent>
                  </Popover>
                )}
              </div>
            </td>
          );
        }

        // ── DivScore with popover ──
        if (col.key === 'divScore') {
          return (
            <td key={col.key} className={`px-3 py-2.5 ${heatClass} text-foreground`}>
              <div className="flex items-center gap-1">
                {invit.divScore.toFixed(1)}
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="text-muted-foreground hover:text-terminal-amber transition-colors">
                      <Info className="h-2.5 w-2.5" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 bg-card border-border text-xs font-mono p-3 space-y-1" side="top">
                    <div className="text-[11px] font-semibold text-foreground border-b border-border pb-1 mb-1">DivScore</div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Post-Tax Yield</span>
                      <span className="text-foreground">{invit.postTaxYield.toFixed(2)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">G-Sec Yield</span>
                      <span className="text-foreground">{gsecYield}%</span>
                    </div>
                    <div className="flex justify-between border-t border-border pt-1">
                      <span className="text-muted-foreground">Score</span>
                      <span className="text-terminal-green font-semibold">({invit.postTaxYield.toFixed(2)} / {gsecYield}) × 100 = {invit.divScore}</span>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </td>
          );
        }

        // ── ValueScore with popover ──
        if (col.key === 'valueScore') {
          return (
            <td key={col.key} className={`px-3 py-2.5 ${heatClass} text-foreground`}>
              <div className="flex items-center gap-1">
                <span className={invit.valueScore >= 0 ? 'text-terminal-green' : 'text-terminal-red'}>{invit.valueScore.toFixed(1)}%</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="text-muted-foreground hover:text-terminal-amber transition-colors">
                      <Info className="h-2.5 w-2.5" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 bg-card border-border text-xs font-mono p-3 space-y-1" side="top">
                    <div className="text-[11px] font-semibold text-foreground border-b border-border pb-1 mb-1">Value%</div>
                    <code className="text-[10px] text-muted-foreground block">((NAV − CMP) / NAV) × 100</code>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">NAV</span>
                      <span className="text-foreground">₹{invit.nav}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">CMP</span>
                      <span className="text-foreground">₹{invit.cmp.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between border-t border-border pt-1">
                      <span className="text-muted-foreground">Discount</span>
                      <span className={`font-semibold ${invit.valueScore >= 0 ? 'text-terminal-green' : 'text-terminal-red'}`}>{invit.valueScore.toFixed(1)}%</span>
                    </div>
                    <p className="text-[9px] text-muted-foreground">Positive = undervalued vs NAV</p>
                  </PopoverContent>
                </Popover>
              </div>
            </td>
          );
        }

        // ── SafetyScore with popover ──
        if (col.key === 'safetyScore') {
          return (
            <td key={col.key} className={`px-3 py-2.5 ${heatClass} text-foreground`}>
              <div className="flex items-center gap-1">
                {invit.safetyScore.toFixed(1)}
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="text-muted-foreground hover:text-terminal-amber transition-colors">
                      <Info className="h-2.5 w-2.5" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 bg-card border-border text-xs font-mono p-3 space-y-1" side="top">
                    <div className="text-[11px] font-semibold text-foreground border-b border-border pb-1 mb-1">SafetyScore</div>
                    <code className="text-[10px] text-muted-foreground block">(Avail×40%) + (Life/30×40%) + ((1−LTV)×20%)</code>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Availability</span>
                      <span className="text-foreground">{invit.availability}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Concession Life</span>
                      <span className="text-foreground">{invit.concessionLife}Y (/ 30Y)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">LTV</span>
                      <span className="text-foreground">{invit.ltv}%</span>
                    </div>
                    <div className="flex justify-between border-t border-border pt-1">
                      <span className="text-muted-foreground">Result</span>
                      <span className="text-terminal-blue font-semibold">{invit.safetyScore.toFixed(1)}</span>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </td>
          );
        }

        // ── GrowthScore with popover ──
        if (col.key === 'growthScore') {
          return (
            <td key={col.key} className={`px-3 py-2.5 ${heatClass} text-foreground`}>
              <div className="flex items-center gap-1">
                {invit.growthScore.toFixed(1)}
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="text-muted-foreground hover:text-terminal-amber transition-colors">
                      <Info className="h-2.5 w-2.5" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 bg-card border-border text-xs font-mono p-3 space-y-1" side="top">
                    <div className="text-[11px] font-semibold text-foreground border-b border-border pb-1 mb-1">GrowthScore</div>
                    <code className="text-[10px] text-muted-foreground block">weighted(1Y×40 + 3Y×35 + 5Y×25)</code>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">1Y CAGR</span>
                      <span className="text-foreground">{invit.growth1Y.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">3Y CAGR</span>
                      <span className="text-foreground">{invit.growth3Y !== null ? `${invit.growth3Y.toFixed(1)}%` : 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">5Y CAGR</span>
                      <span className="text-foreground">{invit.growth5Y !== null ? `${invit.growth5Y.toFixed(1)}%` : 'N/A'}</span>
                    </div>
                    <div className="flex justify-between border-t border-border pt-1">
                      <span className="text-muted-foreground">Result</span>
                      <span className="text-terminal-cyan font-semibold">{invit.growthScore.toFixed(1)}</span>
                    </div>
                    {invit.growth5Y === null && (
                      <p className="text-[9px] text-terminal-amber">5Y N/A — weight redistributed to 1Y & 3Y</p>
                    )}
                  </PopoverContent>
                </Popover>
              </div>
            </td>
          );
        }

        // ── Default cell with heatmap ──
        return (
          <td key={col.key} className={`px-3 py-2.5 ${heatClass} text-foreground ${val === null ? 'text-muted-foreground italic' : ''}`}>
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
