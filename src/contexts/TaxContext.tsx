import { createContext, useContext, useState, type ReactNode } from 'react';
import type { TaxBracket, StrategyPreset, StrategyWeights } from '@/lib/reit-types';
import { STRATEGY_PRESETS } from '@/lib/reit-types';

interface TaxContextType {
  taxRate: TaxBracket;
  setTaxRate: (rate: TaxBracket) => void;
  preset: StrategyPreset;
  setPreset: (preset: StrategyPreset) => void;
  weights: StrategyWeights;
  setWeights: (weights: StrategyWeights) => void;
}

const TaxContext = createContext<TaxContextType | null>(null);

export function TaxProvider({ children }: { children: ReactNode }) {
  const [taxRate, setTaxRate] = useState<TaxBracket>(31.2);
  const [preset, setPreset] = useState<StrategyPreset>('income');
  const [weights, setWeights] = useState<StrategyWeights>(STRATEGY_PRESETS.income);

  return (
    <TaxContext.Provider value={{ taxRate, setTaxRate, preset, setPreset, weights, setWeights }}>
      {children}
    </TaxContext.Provider>
  );
}

export function useTaxContext() {
  const ctx = useContext(TaxContext);
  if (!ctx) throw new Error('useTaxContext must be used within TaxProvider');
  return ctx;
}
