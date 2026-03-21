export interface REITData {
  id: string;
  name: string;
  ticker: string;
  sector: 'Office' | 'Retail' | 'Mixed';
  cmp: number;
  nav: number;
  growth1Y: number;
  growth3Y: number;
  growth5Y: number | null;
  divYield: number;
  occupancy: number;
  wale: number;
  ltv: number;
  pipeline: number; // million sq ft
  lastUpdated: string;
  irUrl: string;
}

export interface ScoreBreakdown {
  divScore: number;
  valueScore: number;
  safetyScore: number;
  growthScore: number;
  pipelineScore: number;
  finalScore: number;
  rank: number;
}

export interface StrategyWeights {
  yield: number;
  safety: number;
  value: number;
  growth: number;
  pipeline: number;
}

export type StrategyPreset = 'income' | 'growth' | 'riskAverse' | 'custom';

export const STRATEGY_PRESETS: Record<Exclude<StrategyPreset, 'custom'>, StrategyWeights> = {
  income: { yield: 50, safety: 30, value: 20, growth: 0, pipeline: 0 },
  growth: { yield: 0, safety: 0, value: 20, growth: 40, pipeline: 40 },
  riskAverse: { yield: 20, safety: 60, value: 20, growth: 0, pipeline: 0 },
};

export const DEFAULT_GSEC_YIELD = 7.12;

export const MOCK_REIT_DATA: REITData[] = [
  {
    id: 'embassy',
    name: 'Embassy Office Parks',
    ticker: 'EMBASSY',
    sector: 'Office',
    cmp: 338,
    nav: 395,
    growth1Y: 12.5,
    growth3Y: 8.2,
    growth5Y: 6.8,
    divYield: 6.8,
    occupancy: 87,
    wale: 7.2,
    ltv: 28,
    pipeline: 7.6,
    lastUpdated: '2025-01-15',
    irUrl: 'https://www.embassyofficeparks.com/investors',
  },
  {
    id: 'mindspace',
    name: 'Mindspace Business Parks',
    ticker: 'MINDSPACE',
    sector: 'Office',
    cmp: 340,
    nav: 380,
    growth1Y: 15.1,
    growth3Y: 10.5,
    growth5Y: 7.4,
    divYield: 5.9,
    occupancy: 91,
    wale: 6.8,
    ltv: 22,
    pipeline: 5.2,
    lastUpdated: '2025-01-10',
    irUrl: 'https://www.mindspacereit.com/investors',
  },
  {
    id: 'brookfield',
    name: 'Brookfield India Real Estate Trust',
    ticker: 'BIRET',
    sector: 'Office',
    cmp: 275,
    nav: 320,
    growth1Y: 18.3,
    growth3Y: 11.2,
    growth5Y: null,
    divYield: 7.2,
    occupancy: 89,
    wale: 8.1,
    ltv: 30,
    pipeline: 4.8,
    lastUpdated: '2025-01-12',
    irUrl: 'https://www.brookfieldindiareit.in/investors',
  },
  {
    id: 'nexus',
    name: 'Nexus Select Trust',
    ticker: 'NXST',
    sector: 'Retail',
    cmp: 132,
    nav: 150,
    growth1Y: 22.6,
    growth3Y: 14.8,
    growth5Y: null,
    divYield: 6.1,
    occupancy: 96,
    wale: 4.2,
    ltv: 18,
    pipeline: 3.1,
    lastUpdated: '2025-01-08',
    irUrl: 'https://www.nexusselecttrust.com/investors',
  },
];
