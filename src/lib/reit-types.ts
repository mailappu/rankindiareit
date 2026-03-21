export interface REITData {
  id: string;
  name: string;
  ticker: string;
  sector: 'Office' | 'Retail' | 'Mixed';
  cmp: number;
  nav: number;
  listingPrice: number;
  listingDate: string; // ISO date
  growth1Y: number;
  growth3Y: number | null;
  growth5Y: number | null;
  sinceListing: number; // CAGR since listing
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
export const CURRENT_DATE = '2026-03-21';

function calcCAGR(startPrice: number, endPrice: number, years: number): number {
  return (Math.pow(endPrice / startPrice, 1 / years) - 1) * 100;
}

function yearsSince(dateStr: string, asOf: string): number {
  const d = new Date(dateStr);
  const now = new Date(asOf);
  return (now.getTime() - d.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
}

function buildREITData(
  id: string, name: string, ticker: string, sector: 'Office' | 'Retail',
  cmp: number, nav: number, listingPrice: number, listingDate: string,
  divYield: number, occupancy: number, wale: number, ltv: number,
  pipeline: number, irUrl: string
): REITData {
  const age = yearsSince(listingDate, CURRENT_DATE);
  const sinceListing = calcCAGR(listingPrice, cmp, age);

  // Calculate CAGRs based on age
  // We use listing price as proxy for older prices when age < period
  const growth1Y = 0; // Will be set from live data
  const growth3Y = age >= 3 ? calcCAGR(listingPrice, cmp, Math.min(age, 3)) : null;
  const growth5Y = age >= 5 ? calcCAGR(listingPrice, cmp, Math.min(age, 5)) : null;

  return {
    id, name, ticker, sector, cmp, nav, listingPrice, listingDate,
    growth1Y, growth3Y, growth5Y, sinceListing: Math.round(sinceListing * 10) / 10,
    divYield, occupancy, wale, ltv, pipeline,
    lastUpdated: CURRENT_DATE,
    irUrl,
  };
}

// Build with listing data, then override growth1Y with live values
const rawData = [
  buildREITData('embassy', 'Embassy Office Parks', 'EMBASSY', 'Office',
    416.68, 398, 300, '2019-04-01', 5.57, 87, 6.4, 38, 7.6,
    'https://www.embassyofficeparks.com/investors'),
  buildREITData('mindspace', 'Mindspace Business Parks', 'MINDSPACE', 'Office',
    457.02, 452, 275, '2020-08-01', 5.10, 91, 6.1, 24, 5.2,
    'https://www.mindspacereit.com/investor-relations'),
  buildREITData('brookfield', 'Brookfield India Real Estate Trust', 'BIRET', 'Office',
    327.24, 331, 275, '2021-02-01', 7.92, 85, 6.0, 35, 4.8,
    'https://www.brookfieldindiareit.in/investors'),
  buildREITData('nexus', 'Nexus Select Trust', 'NXST', 'Retail',
    154.68, 148, 100, '2023-05-01', 6.05, 97, 5.5, 18, 3.1,
    'https://www.nexusselecttrust.com/investor-relations'),
];

// Override with live 1Y growth data
rawData[0].growth1Y = 15.9;
rawData[1].growth1Y = 26.9;
rawData[2].growth1Y = 10.9;
rawData[3].growth1Y = 21.1;

export const LIVE_REIT_DATA: REITData[] = rawData;
