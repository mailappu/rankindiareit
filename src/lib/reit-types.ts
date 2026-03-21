export interface REITData {
  id: string;
  name: string;
  ticker: string;
  sector: 'Office' | 'Retail' | 'Mixed';
  cmp: number;
  nav: number;
  growth1Y: number;
  growth3Y: number | null;
  growth5Y: number | null;
  divYield: number;
  occupancy: number;
  wale: number;
  ltv: number;
  pipeline: number;
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

export const DEFAULT_GSEC_YIELD = 6.77;
export const DATA_VERIFIED_DATE = 'March 21, 2026';

export const LIVE_REIT_DATA: REITData[] = [
  {
    id: 'embassy',
    name: 'Embassy Office Parks',
    ticker: 'EMBASSY',
    sector: 'Office',
    cmp: 416.68,
    nav: 398,
    growth1Y: 15.9,
    growth3Y: null,
    growth5Y: null,
    divYield: 5.57,
    occupancy: 87,
    wale: 6.4,
    ltv: 38,
    pipeline: 7.6,
    lastUpdated: '2026-03-21',
    irUrl: 'https://www.embassyofficeparks.com/investors',
  },
  {
    id: 'mindspace',
    name: 'Mindspace Business Parks',
    ticker: 'MINDSPACE',
    sector: 'Office',
    cmp: 457.02,
    nav: 452,
    growth1Y: 26.9,
    growth3Y: null,
    growth5Y: null,
    divYield: 5.10,
    occupancy: 91,
    wale: 6.1,
    ltv: 24,
    pipeline: 5.2,
    lastUpdated: '2026-03-21',
    irUrl: 'https://www.mindspacereit.com/investors',
  },
  {
    id: 'brookfield',
    name: 'Brookfield India Real Estate Trust',
    ticker: 'BIRET',
    sector: 'Office',
    cmp: 327.24,
    nav: 331,
    growth1Y: 10.9,
    growth3Y: null,
    growth5Y: null,
    divYield: 7.92,
    occupancy: 85,
    wale: 6.0,
    ltv: 35,
    pipeline: 4.8,
    lastUpdated: '2026-03-21',
    irUrl: 'https://www.brookfieldindiareit.in/investors',
  },
  {
    id: 'nexus',
    name: 'Nexus Select Trust',
    ticker: 'NXST',
    sector: 'Retail',
    cmp: 154.68,
    nav: 148,
    growth1Y: 21.1,
    growth3Y: null,
    growth5Y: null,
    divYield: 6.05,
    occupancy: 97,
    wale: 5.5,
    ltv: 18,
    pipeline: 3.1,
    lastUpdated: '2026-03-21',
    irUrl: 'https://www.nexusselecttrust.com/investors',
  },
];
