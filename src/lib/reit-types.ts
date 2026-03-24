export interface TaxBreakdown {
  interest: number;
  divExempt: number;
  divTaxable: number;
  amortization: number;
}

export interface REITData {
  id: string;
  name: string;
  ticker: string;
  nseSymbol: string;
  sector: 'Office' | 'Retail' | 'Mixed';
  cmp: number;
  nav: number;
  listingPrice: number;
  listingDate: string;
  ttmDistribution: number;
  divYield: number;
  taxBreakdown: TaxBreakdown;
  growth1Y: number;
  growth3Y: number | null;
  growth5Y: number | null;
  sinceListing: number;
  occupancy: number;
  wale: number;
  ltv: number;
  pipeline: number;
  lastUpdated: string;
  irUrl: string;
  latestPdfUrl: string | null;
  isLiveCMP: boolean;
  cmpCachedAt: string | null;
}

export interface ScoreBreakdown {
  divScore: number;
  valueScore: number;
  safetyScore: number;
  growthScore: number;
  pipelineScore: number;
  postTaxYield: number;
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

export const TAX_BRACKETS = [0, 10, 20, 31.2] as const;
export type TaxBracket = typeof TAX_BRACKETS[number];

/** Calculate post-tax yield given tax breakdown, TTM distribution, CMP, and tax rate */
export function computePostTaxYield(
  taxBreakdown: TaxBreakdown,
  ttmDistribution: number,
  cmp: number,
  taxRate: number // as percentage e.g. 31.2
): number {
  if (!cmp || cmp <= 0) return 0;
  const rate = taxRate / 100;
  // Interest and divTaxable components are taxed; divExempt and amortization are tax-free
  const postTaxDistribution =
    ttmDistribution * taxBreakdown.interest * (1 - rate) +
    ttmDistribution * taxBreakdown.divExempt * 1 +
    ttmDistribution * taxBreakdown.divTaxable * (1 - rate) +
    ttmDistribution * taxBreakdown.amortization * 1;
  return (postTaxDistribution / cmp) * 100;
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

// Quarterly distributions (most recent first, verified Mar 21 2026)
export const QUARTERLY_DISTRIBUTIONS: Record<string, { quarter: string; amount: number }[]> = {
  embassy: [
    { quarter: 'Q3 FY26', amount: 6.47 },
    { quarter: 'Q2 FY26', amount: 6.51 },
    { quarter: 'Q1 FY26', amount: 5.80 },
    { quarter: 'Q4 FY25', amount: 5.68 },
  ],
  mindspace: [
    { quarter: 'Q3 FY26', amount: 5.83 },
    { quarter: 'Q2 FY26', amount: 5.83 },
    { quarter: 'Q1 FY26', amount: 5.79 },
    { quarter: 'Q4 FY25', amount: 6.44 },
  ],
  brookfield: [
    { quarter: 'Q3 FY26', amount: 5.40 },
    { quarter: 'Q2 FY26', amount: 5.25 },
    { quarter: 'Q1 FY26', amount: 5.25 },
    { quarter: 'Q4 FY25', amount: 5.25 },
  ],
  nexus: [
    { quarter: 'Q3 FY26', amount: 2.37 },
    { quarter: 'Q2 FY26', amount: 2.20 },
    { quarter: 'Q1 FY26', amount: 2.23 },
    { quarter: 'Q4 FY25', amount: 2.00 },
  ],
};

// TTM Distributions (Total of last 4 quarters, verified Mar 21 2026)
export const TTM_DISTRIBUTIONS: Record<string, number> = {
  embassy: 24.46,
  mindspace: 23.89,
  brookfield: 21.15,
  nexus: 8.80,
};

// Fallback CMP prices (verified closing prices Mar 21 2026)
export const FALLBACK_CMP: Record<string, number> = {
  embassy: 417.00,
  mindspace: 449.59,
  brookfield: 319.79,
  nexus: 152.60,
};

// NSE ticker symbols for live price fetching
export const NSE_SYMBOLS: Record<string, string> = {
  embassy: 'EMBASSY.NS',
  mindspace: 'MINDSPACE.NS',
  brookfield: 'BIRET.NS',
  nexus: 'NXST.NS',
};

function calcCAGR(startPrice: number, endPrice: number, years: number): number {
  return (Math.pow(endPrice / startPrice, 1 / years) - 1) * 100;
}

function yearsSince(dateStr: string, asOf: string): number {
  const d = new Date(dateStr);
  const now = new Date(asOf);
  return (now.getTime() - d.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
}

/** Compute divYield dynamically from TTM distribution and CMP */
export function computeDivYield(ttmDistribution: number, cmp: number): number {
  if (!cmp || cmp <= 0) return 0;
  return (ttmDistribution / cmp) * 100;
}

export const REIT_TAX_BREAKDOWNS: Record<string, TaxBreakdown> = {
  embassy:    { interest: 0.15, divExempt: 0.75, divTaxable: 0,    amortization: 0.10 },
  mindspace:  { interest: 0.05, divExempt: 0,    divTaxable: 0.85, amortization: 0.10 },
  brookfield: { interest: 0.35, divExempt: 0,    divTaxable: 0.20, amortization: 0.45 },
  nexus:      { interest: 0.20, divExempt: 0.30, divTaxable: 0.10, amortization: 0.40 },
};

function buildREITData(
  id: string, name: string, ticker: string, nseSymbol: string, sector: 'Office' | 'Retail',
  cmp: number, nav: number, listingPrice: number, listingDate: string,
  ttmDistribution: number, occupancy: number, wale: number, ltv: number,
  pipeline: number, irUrl: string, latestPdfUrl: string | null
): REITData {
  const taxBreakdown = REIT_TAX_BREAKDOWNS[id] || { interest: 0.25, divExempt: 0.25, divTaxable: 0.25, amortization: 0.25 };
  const age = yearsSince(listingDate, CURRENT_DATE);
  const sinceListing = calcCAGR(listingPrice, cmp, age);
  const growth1Y = 0;
  const growth3Y = age >= 3 ? calcCAGR(listingPrice, cmp, Math.min(age, 3)) : null;
  const growth5Y = age >= 5 ? calcCAGR(listingPrice, cmp, Math.min(age, 5)) : null;
  const divYield = computeDivYield(ttmDistribution, cmp);

  return {
    id, name, ticker, nseSymbol, sector, cmp, nav, listingPrice, listingDate,
    ttmDistribution, divYield, taxBreakdown,
    growth1Y, growth3Y, growth5Y, sinceListing: Math.round(sinceListing * 10) / 10,
    occupancy, wale, ltv, pipeline,
    lastUpdated: CURRENT_DATE,
    irUrl, latestPdfUrl,
    isLiveCMP: false,
    cmpCachedAt: null,
  };
}

const rawData = [
  buildREITData('embassy', 'Embassy Office Parks', 'EMBASSY', 'EMBASSY.NS', 'Office',
    417.00, 398, 300, '2019-04-01', 24.46, 87, 6.4, 38, 7.6,
    'https://www.embassyofficeparks.com/investors/',
    'https://eopwebsvr.blob.core.windows.net/media/filer_public/4f/0c/4f0c413c-e92b-4a7c-9cc3-aff0d5969332/earnings_presentation.pdf'),
  buildREITData('mindspace', 'Mindspace Business Parks', 'MINDSPACE', 'MINDSPACE.NS', 'Office',
    449.59, 452, 275, '2020-08-01', 23.89, 91, 6.1, 24, 5.2,
    'https://www.mindspacereit.com/investor-relations',
    'https://www.mindspacereit.com/wp-content/uploads/2026/01/Investor-Presentation_Q3-FY26-1.pdf'),
  buildREITData('brookfield', 'Brookfield India Real Estate Trust', 'BIRET', 'BIRET.NS', 'Office',
    319.79, 331, 275, '2021-02-01', 21.15, 85, 6.0, 35, 4.8,
    'https://www.brookfieldindiareit.in/investors',
    'https://media.brookfieldindiareit.in/Brookfield_REIT_Earnings_Jan30_2026_f4421e7b0a.pdf'),
  buildREITData('nexus', 'Nexus Select Trust', 'NXST', 'NXST.NS', 'Retail',
    152.60, 148, 100, '2023-05-01', 8.80, 97, 5.5, 18, 3.1,
    'https://www.nexusselecttrust.com/investors',
    'https://www.nexusselecttrust.com/resources/assets/pdf/Nexus-Select-Trust-Dec-25-vf.pdf'),
];

// Override with live 1Y growth data
rawData[0].growth1Y = 15.9;
rawData[1].growth1Y = 26.9;
rawData[2].growth1Y = 10.9;
rawData[3].growth1Y = 21.1;

export const LIVE_REIT_DATA: REITData[] = rawData;
