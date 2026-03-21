import { useState, useMemo, useCallback } from 'react';
import { DashboardHeader } from '@/components/DashboardHeader';
import { StrategyPanel } from '@/components/StrategyPanel';
import { REITTable } from '@/components/REITTable';
import { MethodologyCard } from '@/components/MethodologyCard';
import { calculateScores } from '@/lib/reit-scoring';
import {
  MOCK_REIT_DATA,
  DEFAULT_GSEC_YIELD,
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
  const [reitData] = useState(MOCK_REIT_DATA);

  const scoredData = useMemo(
    () => calculateScores(reitData, gsecYield, weights),
    [reitData, gsecYield, weights]
  );

  const handleSync = useCallback(() => {
    setIsSyncing(true);
    // Simulate sync check
    setTimeout(() => {
      const stored = localStorage.getItem('reit_last_hash');
      const currentHash = JSON.stringify(reitData).length.toString();
      if (stored === currentHash) {
        toast.info('No material change in reports. Tokens saved.', {
          description: 'All 4 REIT presentations match cached versions.',
        });
      } else {
        localStorage.setItem('reit_last_hash', currentHash);
        toast.success('Data synced successfully', {
          description: 'Embassy, Mindspace, Brookfield, Nexus — all updated.',
        });
      }
      setLastSynced(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }));
      setIsSyncing(false);
    }, 2000);
  }, [reitData]);

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

        <REITTable data={scoredData} />

        <MethodologyCard />
      </main>
    </div>
  );
}
