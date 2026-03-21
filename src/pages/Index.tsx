import { useState, useMemo, useCallback } from 'react';
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

  const scoredData = useMemo(
    () => calculateScores(reitData, gsecYield, weights),
    [reitData, gsecYield, weights]
  );

  const handleSync = useCallback(async () => {
    setIsSyncing(true);

    try {
      const result = await performSmartSync();
      const syncTime = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

      if (result.changed) {
        toast.success('New data detected', {
          description: `Changes found in: ${result.changedSources.join(', ')}. Re-parsing required.`,
        });
      } else {
        toast.info(
          `No material change detected in investor reports.`,
          {
            description: `Data is current as of ${DATA_VERIFIED_DATE}. ${result.checkedCount} sources checked. Tokens saved.`,
          }
        );
      }

      setLastSynced(syncTime);
      setProvenanceBadge(getProvenanceBadge());
    } catch {
      toast.error('Sync failed', {
        description: 'Could not reach investor relations servers. Try again later.',
      });
    } finally {
      setIsSyncing(false);
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <DashboardHeader
        gsecYield={gsecYield}
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
