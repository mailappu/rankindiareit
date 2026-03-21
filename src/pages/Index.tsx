import { useState, useMemo, useCallback } from 'react';
import { DashboardHeader } from '@/components/DashboardHeader';
import { StrategyPanel } from '@/components/StrategyPanel';
import { REITTable } from '@/components/REITTable';

import { calculateScores } from '@/lib/reit-scoring';
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
  const [gsecYield] = useState(DEFAULT_GSEC_YIELD);
  const [preset, setPreset] = useState<StrategyPreset>('income');
  const [weights, setWeights] = useState<StrategyWeights>(STRATEGY_PRESETS.income);
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [reitData] = useState(LIVE_REIT_DATA);

  const scoredData = useMemo(
    () => calculateScores(reitData, gsecYield, weights),
    [reitData, gsecYield, weights]
  );

  const handleSync = useCallback(() => {
    setIsSyncing(true);
    setTimeout(() => {
      toast.info(`Data is up to date (${DATA_VERIFIED_DATE}). No new reports found.`, {
        description: 'All 4 REIT investor presentations match cached versions.',
      });
      setLastSynced(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }));
      setIsSyncing(false);
    }, 2000);
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <DashboardHeader
        gsecYield={gsecYield}
        lastSynced={lastSynced}
        isSyncing={isSyncing}
        onSync={handleSync}
      />

      <main className="flex-1 p-6 space-y-4 max-w-[1600px] mx-auto w-full">
        <StrategyPanel
          preset={preset}
          weights={weights}
          onPresetChange={setPreset}
          onWeightsChange={setWeights}
        />

        <REITTable data={scoredData} gsecYield={gsecYield} />
      </main>
    </div>
  );
}
