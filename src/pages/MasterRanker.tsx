import { useState, useMemo, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DashboardHeader } from '@/components/DashboardHeader';
import { StrategyPanel } from '@/components/StrategyPanel';
import { calculateScores } from '@/lib/reit-scoring';
import { calculateInvITScores } from '@/lib/invit-scoring';
import { discoverInvITData } from '@/lib/invit-discovery-service';
import { performSmartSync, getProvenanceBadge, getStoredDiscoveredUrls, getStoredCMPCache, applyLivePrices, type SyncError, type LivePrice } from '@/lib/sync-engine';
import { getGSecYield, shouldShowToast, type GSecStatus } from '@/lib/gsec-service';
import { useTaxContext } from '@/contexts/TaxContext';
import {
  LIVE_REIT_DATA,
  DEFAULT_GSEC_YIELD,
  computePostTaxYield,
  computeDivYield,
  REIT_TAX_BREAKDOWNS,
} from '@/lib/reit-types';
import type { REITData, ScoreBreakdown } from '@/lib/reit-types';
import type { InvITData, InvITScoreBreakdown } from '@/lib/invit-types';
import { computeInvITPostTaxYield, computeInvITDivYield } from '@/lib/invit-types';
import { ArrowUpDown, ArrowUp, ArrowDown, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { REITErrorBoundary } from '@/components/REITErrorBoundary';
import { toast } from 'sonner';

interface UnifiedRow {
  id: string;
  name: string;
  ticker: string;
  assetType: 'REIT' | 'InvIT';
  sector: string;
  cmp: number;
  divYield: number;
  postTaxYield: number;
  postTaxAlpha: number; // postTaxYield - gsecYield
  finalScore: number;
  rank: number;
  safetyScore: number;
  growthScore: number;
  isLiveCMP: boolean;
}

type SortKey = keyof UnifiedRow;

export default function MasterRanker() {
  const { taxRate, setTaxRate, preset, setPreset, weights, setWeights } = useTaxContext();
  const [gsecYield, setGsecYield] = useState(DEFAULT_GSEC_YIELD);
  const [gsecStatus, setGsecStatus] = useState<GSecStatus>('fallback');
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFailed, setSyncFailed] = useState(false);
  const [syncErrors, setSyncErrors] = useState<SyncError[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [reitData, setReitData] = useState(() => {
    const cachedPrices = getStoredCMPCache();
    if (Object.keys(cachedPrices).length > 0) {
      return applyLivePrices(LIVE_REIT_DATA, cachedPrices);
    }
    return LIVE_REIT_DATA;
  });
  const [invitData, setInvitData] = useState<InvITData[]>([]);

  const scoredReits = useMemo(
    () => calculateScores(reitData, gsecYield, weights, taxRate),
    [reitData, gsecYield, weights, taxRate]
  );

  const scoredInvits = useMemo(
    () => invitData.length > 0 ? calculateInvITScores(invitData, gsecYield, weights, taxRate) : [],
    [invitData, gsecYield, weights, taxRate]
  );

  // Build unified list
  const unifiedData = useMemo(() => {
    const rows: UnifiedRow[] = [];

    for (const r of scoredReits) {
      const postTaxYield = r.postTaxYield;
      rows.push({
        id: r.id,
        name: r.name,
        ticker: r.ticker,
        assetType: 'REIT',
        sector: r.sector,
        cmp: r.cmp,
        divYield: r.divYield,
        postTaxYield,
        postTaxAlpha: postTaxYield - gsecYield,
        finalScore: r.finalScore,
        rank: 0,
        safetyScore: r.safetyScore,
        growthScore: r.growthScore,
        isLiveCMP: r.isLiveCMP,
      });
    }

    for (const i of scoredInvits) {
      const postTaxYield = i.postTaxYield;
      rows.push({
        id: i.id,
        name: i.name,
        ticker: i.ticker,
        assetType: 'InvIT',
        sector: i.sector,
        cmp: i.cmp,
        divYield: i.divYield,
        postTaxYield,
        postTaxAlpha: postTaxYield - gsecYield,
        finalScore: i.finalScore,
        rank: 0,
        safetyScore: i.safetyScore,
        growthScore: i.growthScore,
        isLiveCMP: i.isLiveCMP,
      });
    }

    // Rank by postTaxAlpha descending
    rows.sort((a, b) => b.postTaxAlpha - a.postTaxAlpha);
    rows.forEach((r, i) => { r.rank = i + 1; });

    return rows;
  }, [scoredReits, scoredInvits, gsecYield]);

  // Auto-fetch on mount
  useEffect(() => {
    const fetchOnMount = async () => {
      setIsLoading(true);

      try {
        const result = await getGSecYield();
        setGsecYield(result.yield);
        setGsecStatus(result.status);
      } catch {
        setGsecStatus('fallback');
      }

      // Fetch REIT CMP
      try {
        const { data, error } = await supabase.functions.invoke('fetch-cmp');
        if (!error && data?.success && Array.isArray(data.prices)) {
          const priceMap: Record<string, LivePrice> = {};
          for (const p of data.prices) {
            priceMap[p.reitId] = {
              reitId: p.reitId, cmp: p.cmp, isLive: p.isLive,
              fetchedAt: p.fetchedAt, error: p.error,
              growth1Y: p.growth1Y, growth3Y: p.growth3Y,
              growth5Y: p.growth5Y, cagrSource: p.cagrSource,
            };
          }
          setReitData(applyLivePrices(LIVE_REIT_DATA, priceMap));
          localStorage.setItem('reit_cmp_cache', JSON.stringify(priceMap));
        }
      } catch {}

      // Fetch InvIT data
      try {
        const result = await discoverInvITData();
        setInvitData(result.invits);
      } catch {}

      setLastSynced(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }));
      setIsLoading(false);
    };
    fetchOnMount();
  }, []);

  const handleSync = useCallback(async () => {
    setIsSyncing(true);
    setSyncFailed(false);
    try {
      const gsecResult = await getGSecYield();
      setGsecStatus(gsecResult.status);
      if (gsecResult.yield !== gsecYield) setGsecYield(gsecResult.yield);

      const syncResult = await performSmartSync();
      setReitData(applyLivePrices(LIVE_REIT_DATA, syncResult.livePrices));

      const invitResult = await discoverInvITData();
      setInvitData(invitResult.invits);

      toast.success('Master Ranker synced');
      setLastSynced(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }));
    } catch (err) {
      setSyncFailed(true);
      toast.error('Sync failed');
    } finally {
      setIsSyncing(false);
    }
  }, [gsecYield]);

  return (
    <div className="flex-1 flex flex-col">
      <DashboardHeader
        gsecYield={gsecYield}
        gsecStatus={gsecStatus}
        lastSynced={lastSynced}
        syncFailed={syncFailed}
        isSyncing={isSyncing}
        onSync={handleSync}
        provenanceBadge={null}
        syncErrors={syncErrors}
        taxRate={taxRate}
        onTaxRateChange={setTaxRate}
      />

      <main className="flex-1 px-3 sm:px-6 py-4 space-y-4 max-w-[1600px] mx-auto w-full">
        <StrategyPanel
          preset={preset}
          weights={weights}
          onPresetChange={setPreset}
          onWeightsChange={setWeights}
        />

        {isLoading ? (
          <div className="card-terminal p-12 text-center">
            <div className="animate-pulse space-y-3">
              <div className="text-lg font-mono text-primary">Loading Master Ranker...</div>
              <p className="text-xs font-mono text-muted-foreground">Fetching REITs and InvITs</p>
            </div>
          </div>
        ) : (
          <MasterTable data={unifiedData} gsecYield={gsecYield} preset={preset} />
        )}
      </main>
    </div>
  );
}

// ── Unified Table ──

function MasterTable({ data, gsecYield, preset }: { data: UnifiedRow[]; gsecYield: number; preset?: string }) {
  const [sortKey, setSortKey] = useState<SortKey>('rank');
  const [sortAsc, setSortAsc] = useState(true);

  const COLUMNS: { key: SortKey; label: string; format?: (v: any) => string }[] = [
    { key: 'rank', label: '#' },
    { key: 'ticker', label: 'Name' },
    { key: 'assetType', label: 'Type' },
    { key: 'sector', label: 'Sector' },
    { key: 'cmp', label: 'CMP (₹)', format: v => v > 0 ? `₹${v.toFixed(2)}` : '—' },
    { key: 'divYield', label: 'Div Yield', format: v => v > 0 ? `${v.toFixed(2)}%` : '—' },
    { key: 'postTaxYield', label: 'Post-Tax Yield', format: v => v > 0 ? `${v.toFixed(2)}%` : '—' },
    { key: 'postTaxAlpha', label: 'Alpha vs G-Sec', format: v => `${v >= 0 ? '+' : ''}${v.toFixed(2)}%` },
    { key: 'safetyScore', label: 'Safety', format: v => v.toFixed(1) },
    { key: 'growthScore', label: 'Growth', format: v => v.toFixed(1) },
    { key: 'finalScore', label: 'Score', format: v => v.toFixed(1) },
  ];

  const sorted = useMemo(() => {
    const copy = [...data];
    copy.sort((a, b) => {
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

  const STRATEGY_LABELS: Record<string, string> = {
    income: 'Income Focus',
    growth: 'Growth Focus',
    riskAverse: 'Risk Averse',
    custom: 'Custom',
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
                    className="px-3 py-2.5 text-left text-[10px] text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors whitespace-nowrap select-none"
                  >
                    <div className="flex items-center gap-1">
                      {col.label}
                      {col.key === 'finalScore' && preset && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-terminal-amber cursor-help"><Info className="h-2.5 w-2.5" /></span>
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
              {sorted.map(row => (
                <REITErrorBoundary key={row.id} fallback={
                  <tr className="border-b border-border/50">
                    <td colSpan={COLUMNS.length} className="px-3 py-2.5 text-center text-destructive text-xs font-mono">⚠ Render error</td>
                  </tr>
                }>
                  <MasterRow row={row} gsecYield={gsecYield} />
                </REITErrorBoundary>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </TooltipProvider>
  );
}

function MasterRow({ row, gsecYield }: { row: UnifiedRow; gsecYield: number }) {
  const isReit = row.assetType === 'REIT';
  const rowBg = isReit ? 'hover:bg-terminal-blue/5' : 'hover:bg-teal-500/5';

  return (
    <tr className={`border-b border-border/50 transition-colors ${rowBg}`}>
      {/* Rank */}
      <td className="px-3 py-2.5">
        <span className={`font-bold text-sm ${row.rank <= 3 ? 'text-primary' : 'text-muted-foreground'}`}>
          {row.cmp > 0 ? row.rank : '--'}
        </span>
      </td>
      {/* Name */}
      <td className="px-3 py-2.5">
        <div className="font-semibold text-foreground text-xs">{row.ticker}</div>
        <div className="text-[10px] text-muted-foreground">{row.name}</div>
      </td>
      {/* Asset Type */}
      <td className="px-3 py-2.5">
        <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold ${
          isReit
            ? 'bg-terminal-blue/15 text-terminal-blue'
            : 'bg-teal-500/15 text-teal-400'
        }`}>
          {row.assetType}
        </span>
      </td>
      {/* Sector */}
      <td className="px-3 py-2.5 text-muted-foreground">{row.sector}</td>
      {/* CMP */}
      <td className="px-3 py-2.5 text-foreground">{row.cmp > 0 ? `₹${row.cmp.toFixed(2)}` : '—'}</td>
      {/* Div Yield */}
      <td className="px-3 py-2.5 text-foreground">{row.divYield > 0 ? `${row.divYield.toFixed(2)}%` : '—'}</td>
      {/* Post-Tax Yield */}
      <td className="px-3 py-2.5 text-foreground">{row.postTaxYield > 0 ? `${row.postTaxYield.toFixed(2)}%` : '—'}</td>
      {/* Alpha */}
      <td className="px-3 py-2.5">
        <span className={row.postTaxAlpha >= 0 ? 'text-primary font-semibold' : 'text-destructive font-semibold'}>
          {row.cmp > 0 ? `${row.postTaxAlpha >= 0 ? '+' : ''}${row.postTaxAlpha.toFixed(2)}%` : '—'}
        </span>
      </td>
      {/* Safety */}
      <td className="px-3 py-2.5 text-foreground">{row.safetyScore.toFixed(1)}</td>
      {/* Growth */}
      <td className="px-3 py-2.5 text-foreground">{row.growthScore.toFixed(1)}</td>
      {/* Score */}
      <td className="px-3 py-2.5 font-bold text-foreground">{row.cmp > 0 ? row.finalScore.toFixed(1) : '--'}</td>
    </tr>
  );
}
