import { useState, useMemo, useCallback, useEffect } from 'react';
import { DashboardHeader } from '@/components/DashboardHeader';
import { StrategyPanel } from '@/components/StrategyPanel';
import { InvITTable } from '@/components/InvITTable';
import { calculateInvITScores } from '@/lib/invit-scoring';
import { discoverInvITData, getCachedInvITDiscovery } from '@/lib/invit-discovery-service';
import { getGSecYield, shouldShowToast, type GSecStatus } from '@/lib/gsec-service';
import { useTaxContext } from '@/contexts/TaxContext';
import {
  DEFAULT_GSEC_YIELD,
  STRATEGY_PRESETS,
} from '@/lib/reit-types';
import type { InvITData } from '@/lib/invit-types';
import { toast } from 'sonner';

export default function InvITs() {
  const { taxRate, setTaxRate, preset, setPreset, weights, setWeights } = useTaxContext();
  const [gsecYield, setGsecYield] = useState(DEFAULT_GSEC_YIELD);
  const [gsecStatus, setGsecStatus] = useState<GSecStatus>('fallback');
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [invitData, setInvitData] = useState<InvITData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [syncFailed, setSyncFailed] = useState(false);

  const scoredData = useMemo(
    () => invitData.length > 0 ? calculateInvITScores(invitData, gsecYield, weights, taxRate) : [],
    [invitData, gsecYield, weights, taxRate]
  );

  // Auto-fetch on mount
  useEffect(() => {
    const fetchOnMount = async () => {
      setIsLoading(true);

      // Fetch G-Sec
      try {
        const result = await getGSecYield();
        setGsecYield(result.yield);
        setGsecStatus(result.status);
      } catch {
        setGsecStatus('fallback');
      }

      // Fetch InvIT data
      try {
        console.log('[InvIT] Starting data discovery...');
        const result = await discoverInvITData();
        setInvitData(result.invits);

        if (result.errors.length > 0) {
          result.errors.forEach(err => toast.warning('InvIT Data', { description: err }));
        }

        const withPrice = result.invits.filter(i => i.cmp > 0);
        if (withPrice.length > 0) {
          toast.success(`InvIT data loaded: ${withPrice.length}/${result.invits.length} with live prices`);
        } else {
          toast.warning('InvIT prices unavailable. Data will populate after BSE market hours.');
          setSyncFailed(true);
        }
      } catch (err) {
        console.error('[InvIT] Discovery failed:', err);
        toast.error('Failed to load InvIT data');
        setSyncFailed(true);
      }

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
      if (gsecResult.yield !== gsecYield) {
        setGsecYield(gsecResult.yield);
      }

      const result = await discoverInvITData();
      setInvitData(result.invits);

      if (result.errors.length > 0) {
        result.errors.forEach(err => toast.warning('InvIT Sync', { description: err }));
      }

      const withPrice = result.invits.filter(i => i.cmp > 0);
      toast.success(`InvIT sync complete: ${withPrice.length} with live data`);

      setLastSynced(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }));
    } catch (err) {
      setSyncFailed(true);
      toast.error('Sync failed', {
        description: err instanceof Error ? err.message : 'Could not reach BSE API.',
      });
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
        syncErrors={[]}
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
              <div className="text-lg font-mono text-primary">Fetching InvIT data from BSE...</div>
              <p className="text-xs font-mono text-muted-foreground">
                Querying corporate filings for INDIGRID, PGINVIT, IRBINVIT, NHIT, BHINVIT
              </p>
              <div className="flex justify-center gap-1 mt-4">
                {[0, 1, 2, 3, 4].map(i => (
                  <div key={i} className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: `${i * 0.1}s` }} />
                ))}
              </div>
            </div>
          </div>
        ) : invitData.length === 0 ? (
          <div className="card-terminal p-12 text-center">
            <div className="text-lg font-mono text-terminal-amber mb-2">No InvIT Data Available</div>
            <p className="text-xs font-mono text-muted-foreground mb-4">
              BSE XBRL data could not be fetched or parsed. This may happen outside market hours or if filings haven't been submitted yet.
            </p>
            <button onClick={handleSync} className="px-4 py-2 rounded border border-primary/30 text-primary text-xs font-mono hover:bg-primary/10 transition-colors">
              Retry Sync
            </button>
          </div>
        ) : (
          <InvITTable data={scoredData} gsecYield={gsecYield} taxRate={taxRate} preset={preset} />
        )}

      </main>
    </div>
  );
}
