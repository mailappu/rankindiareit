import { useState, useMemo, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { TopNav } from '@/components/TopNav';
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
import { computeInvITPostTaxYield, computeInvITDivYield, LIVE_INVIT_DATA } from '@/lib/invit-types';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { REITErrorBoundary } from '@/components/REITErrorBoundary';
import { toast } from 'sonner';

// Market caps in ₹ Crores (approximate, Mar 2026)
const REIT_MARKET_CAPS: Record<string, number> = {
  embassy: 35400,
  mindspace: 26700,
  brookfield: 19200,
  nexus: 21500,
};

const INVIT_MARKET_CAPS: Record<string, number> = {
  indigrid: 22400,
  pginvit: 27100,
  irbinvit: 7200,
  nhit: 8600,
  bhinvit: 4800,
};

interface UnifiedRow {
  id: string;
  name: string;
  ticker: string;
  assetType: 'REIT' | 'InvIT';
  cmp: number;
  postTaxYield: number;
  ltv: number;
  marketCap: number; // in ₹ Crores
  finalScore: number;
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
  const [invitData, setInvitData] = useState<InvITData[]>(LIVE_INVIT_DATA);

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
      const reitBase = reitData.find(rd => rd.id === r.id);
      rows.push({
        id: r.id,
        name: r.name,
        ticker: r.ticker,
        assetType: 'REIT',
        cmp: r.cmp,
        postTaxYield: r.postTaxYield,
        ltv: reitBase?.ltv ?? 0,
        marketCap: REIT_MARKET_CAPS[r.id] ?? 0,
        finalScore: r.finalScore,
        isLiveCMP: r.isLiveCMP,
      });
    }

    for (const i of scoredInvits) {
      const invitBase = invitData.find(iv => iv.id === i.id);
      rows.push({
        id: i.id,
        name: i.name,
        ticker: i.ticker,
        assetType: 'InvIT',
        cmp: i.cmp,
        postTaxYield: i.postTaxYield,
        ltv: invitBase?.ltv ? invitBase.ltv * 100 : 0, // InvIT LTV stored as decimal
        marketCap: INVIT_MARKET_CAPS[i.id] ?? 0,
        finalScore: i.finalScore,
        isLiveCMP: i.isLiveCMP,
      });
    }

    // Sort by post-tax yield descending
    rows.sort((a, b) => b.postTaxYield - a.postTaxYield);

    return rows;
  }, [scoredReits, scoredInvits, gsecYield, reitData, invitData]);

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
      <TopNav
        gsecYield={gsecYield}
        gsecStatus={gsecStatus}
        lastSynced={lastSynced}
        syncFailed={syncFailed}
        isSyncing={isSyncing}
        onSync={handleSync}
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
          <MasterTable data={unifiedData} gsecYield={gsecYield} />
        )}
      </main>
    </div>
  );
}

// ── Unified Table ──

function MasterTable({ data, gsecYield }: { data: UnifiedRow[]; gsecYield: number }) {
  const [sortKey, setSortKey] = useState<SortKey>('postTaxYield');
  const [sortAsc, setSortAsc] = useState(false);

  const COLUMNS: { key: SortKey; label: string; align?: string }[] = [
    { key: 'name', label: 'Asset Name' },
    { key: 'assetType', label: 'Type' },
    { key: 'cmp', label: 'CMP (₹)', align: 'right' },
    { key: 'postTaxYield', label: 'Post-Tax Yield', align: 'right' },
    { key: 'ltv', label: 'LTV', align: 'right' },
    { key: 'marketCap', label: 'Market Cap', align: 'right' },
  ];

  const sorted = useMemo(() => {
    const copy = [...data];
    copy.sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (typeof aVal === 'string') return sortAsc ? aVal.localeCompare(bVal as string) : (bVal as string).localeCompare(aVal);
      return sortAsc ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });
    return copy;
  }, [data, sortKey, sortAsc]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  };

  const formatMarketCap = (v: number) => {
    if (v <= 0) return '—';
    return `₹${v.toLocaleString('en-IN')} Cr`;
  };

  return (
    <div className="card-terminal overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs font-mono">
          <thead>
            <tr className="border-b border-border">
              {COLUMNS.map(col => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className={`px-3 py-2.5 text-[10px] text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors whitespace-nowrap select-none ${col.align === 'right' ? 'text-right' : 'text-left'}`}
                >
                  <div className={`flex items-center gap-1 ${col.align === 'right' ? 'justify-end' : ''}`}>
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
            {sorted.map(row => (
              <REITErrorBoundary key={row.id} fallback={
                <tr className="border-b border-border/50">
                  <td colSpan={COLUMNS.length} className="px-3 py-2.5 text-center text-destructive text-xs font-mono">⚠ Render error</td>
                </tr>
              }>
                <MasterRow row={row} formatMarketCap={formatMarketCap} />
              </REITErrorBoundary>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MasterRow({ row, formatMarketCap }: { row: UnifiedRow; formatMarketCap: (v: number) => string }) {
  const isReit = row.assetType === 'REIT';
  const rowBg = isReit ? 'hover:bg-terminal-blue/5' : 'hover:bg-teal-500/5';

  return (
    <tr className={`border-b border-border/50 transition-colors ${rowBg}`}>
      <td className="px-3 py-2.5">
        <div className="font-semibold text-foreground text-xs">{row.ticker}</div>
        <div className="text-[10px] text-muted-foreground">{row.name}</div>
      </td>
      <td className="px-3 py-2.5">
        <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold ${
          isReit
            ? 'bg-terminal-blue/15 text-terminal-blue'
            : 'bg-teal-500/15 text-teal-400'
        }`}>
          {row.assetType}
        </span>
      </td>
      <td className="px-3 py-2.5 text-right text-foreground">{row.cmp > 0 ? `₹${row.cmp.toFixed(2)}` : '—'}</td>
      <td className="px-3 py-2.5 text-right">
        <span className={`font-bold ${row.postTaxYield > 0 ? 'text-primary' : 'text-muted-foreground'}`}>
          {row.postTaxYield > 0 ? `${row.postTaxYield.toFixed(2)}%` : '—'}
        </span>
      </td>
      <td className="px-3 py-2.5 text-right text-foreground">{row.ltv > 0 ? `${row.ltv.toFixed(1)}%` : '—'}</td>
      <td className="px-3 py-2.5 text-right text-foreground">{formatMarketCap(row.marketCap)}</td>
    </tr>
  );
}
