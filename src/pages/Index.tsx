import { useState, useMemo, useCallback, useEffect } from 'react';
import { DashboardHeader } from '@/components/DashboardHeader';
import { StrategyPanel } from '@/components/StrategyPanel';
import { REITTable } from '@/components/REITTable';
import { TerminologyCard } from '@/components/TerminologyCard';
import { calculateScores } from '@/lib/reit-scoring';
import { performSmartSync, getProvenanceBadge } from '@/lib/sync-engine';
import {
  LIVE_REIT_DATA,
  DEFAULT_GSEC_YIELD,
  DATA_VERIFIED_DATE,
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
  const [gsecSource, setGsecSource] = useState<'fallback' | 'live'>('fallback');

  const scoredData = useMemo(
    () => calculateScores(reitData, gsecYield, weights),
    [reitData, gsecYield, weights]
  );

  // Try to fetch live G-Sec yield on mount
  useEffect(() => {
    const fetchGsec = async () => {
      try {
        const { performSmartSync: _ } = await import('@/lib/sync-engine');
        // Quick background check — don't block UI
        const result = await performSmartSync();
        if (result.gsecYield && result.gsecYield !== gsecYield) {
          setGsecYield(result.gsecYield);
          setGsecSource('live');
          toast.info(`G-Sec yield updated to ${result.gsecYield}%`, {
            description: 'Live benchmark data fetched. All scores recalculated.',
          });
        }
        setLastSynced(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }));
        setProvenanceBadge(getProvenanceBadge());
      } catch {
        // Silently fallback to hardcoded value
        setGsecSource('fallback');
      }
    };
    fetchGsec();
  }, []);

  const handleSync = useCallback(async () => {
    setIsSyncing(true);

    try {
      const result = await performSmartSync();
      const syncTime = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

      // Update G-Sec if new value fetched
      if (result.gsecYield && result.gsecYield !== gsecYield) {
        setGsecYield(result.gsecYield);
        setGsecSource('live');
        toast.info(`G-Sec benchmark updated: ${result.gsecYield}%`, {
          description: 'Dividend scores recalculated with live rate.',
        });
      }

      if (result.changed) {
        toast.success('New data detected', {
          description: `Changes found in: ${result.changedSources.join(', ')}. Data refresh needed.`,
        });
      } else {
        toast.info(
          `No material change detected in investor reports.`,
          {
            description: `Data is current as of ${DATA_VERIFIED_DATE}. ${result.checkedCount} sources checked via proxy. Tokens saved.`,
          }
        );
      }

      if (result.errors.length > 0) {
        toast.warning(`${result.errors.length} source(s) unreachable`, {
          description: result.errors.join('; '),
        });
      }

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
