import { useState, useMemo, useCallback, useEffect } from 'react';
import { DashboardHeader } from '@/components/DashboardHeader';
import { StrategyPanel } from '@/components/StrategyPanel';
import { REITTable } from '@/components/REITTable';
import { TerminologyCard } from '@/components/TerminologyCard';
import { calculateScores } from '@/lib/reit-scoring';
import { performSmartSync, getProvenanceBadge } from '@/lib/sync-engine';
import { getGSecYield, shouldShowToast, type GSecStatus } from '@/lib/gsec-service';
import {
  LIVE_REIT_DATA,
  DEFAULT_GSEC_YIELD,
  STRATEGY_PRESETS,
  StrategyPreset,
  StrategyWeights,
} from '@/lib/reit-types';
import { toast } from 'sonner';

export default function Index() {
  const [gsecYield, setGsecYield] = useState(DEFAULT_GSEC_YIELD);
  const [preset, setPreset] = useState<StrategyPreset>('income');
  const [weights, setWeights] = useState<StrategyWeights>(STRATEGY_PRESETS.income);
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [reitData] = useState(LIVE_REIT_DATA);
  const [provenanceBadge, setProvenanceBadge] = useState<string | null>(null);
  const [gsecStatus, setGsecStatus] = useState<GSecStatus>('fallback');

  const scoredData = useMemo(
    () => calculateScores(reitData, gsecYield, weights),
    [reitData, gsecYield, weights]
  );

  // 3-Tier G-Sec pulse on mount
  useEffect(() => {
    const fetchBenchmark = async () => {
      try {
        const result = await getGSecYield();
        setGsecYield(result.yield);
        setGsecStatus(result.status);

        if (result.changed && result.previousYield !== null && shouldShowToast(result.previousYield, result.yield)) {
          toast.info(`Benchmark rate changed to ${result.yield.toFixed(3)}%`, {
            description: 'Re-calculating Dividend Scores across all REITs.',
          });
        }

        setLastSynced(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }));
        setProvenanceBadge(getProvenanceBadge());
      } catch {
        setGsecStatus('fallback');
      }
    };
    fetchBenchmark();
  }, []);

  const handleSync = useCallback(async () => {
    setIsSyncing(true);

    try {
      // Fetch G-Sec with 3-tier logic (cache-aware)
      const gsecResult = await getGSecYield();
      setGsecStatus(gsecResult.status);

      if (gsecResult.changed && gsecResult.previousYield !== null) {
        setGsecYield(gsecResult.yield);
        if (shouldShowToast(gsecResult.previousYield, gsecResult.yield)) {
          toast.info(`Benchmark rate changed to ${gsecResult.yield.toFixed(3)}%`, {
            description: 'Re-calculating Dividend Scores across all REITs.',
          });
        }
      } else if (gsecResult.yield !== gsecYield) {
        setGsecYield(gsecResult.yield);
      }

      // Metadata check for PDF sources
      const result = await performSmartSync();

      if (result.changed) {
        toast.success('New data detected', {
          description: `Changes found in: ${result.changedSources.join(', ')}. Data refresh needed.`,
        });
      } else {
        toast.info('No material change detected in investor reports.', {
          description: `Data is current. ${result.checkedCount} sources checked via proxy. Tokens saved.`,
        });
      }

      if (result.errors.length > 0) {
        toast.warning(`${result.errors.length} source(s) unreachable`, {
          description: result.errors.join('; '),
        });
      }

      const syncTime = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
      setLastSynced(syncTime);
      setProvenanceBadge(getProvenanceBadge());
    } catch (err) {
      toast.error('Sync failed', {
        description: err instanceof Error ? err.message : 'Could not reach proxy. Try again later.',
      });
    } finally {
      setIsSyncing(false);
    }
  }, [gsecYield]);

  return (
    <div className="min-h-screen flex flex-col">
      <DashboardHeader
        gsecYield={gsecYield}
        gsecSource={gsecSource}
        lastSynced={lastSynced}
        isSyncing={isSyncing}
        onSync={handleSync}
        provenanceBadge={provenanceBadge}
      />

      <main className="flex-1 p-6 space-y-4 max-w-[1600px] mx-auto w-full">
        <StrategyPanel
          preset={preset}
          weights={weights}
          onPresetChange={setPreset}
          onWeightsChange={setWeights}
        />

        <REITTable data={scoredData} gsecYield={gsecYield} />

        <TerminologyCard />
      </main>
    </div>
  );
}
