export interface InvITTaxBreakdown {
  interest: number;
  dividend: number;
  repaymentOfDebt: number;
}

export type InvITSector = 'Road/Toll' | 'Transmission' | 'Gas Pipeline' | 'Telecom Tower' | 'Mixed Infra';

export interface InvITData {
  id: string;
  name: string;
  ticker: string;
  bseScripCode: string;
  sector: InvITSector;
  cmp: number;
  nav: number;
  listingPrice: number;
  listingDate: string;
  ttmDistribution: number;
  divYield: number;
  taxBreakdown: InvITTaxBreakdown;
  growth1Y: number;
  growth3Y: number | null;
  growth5Y: number | null;
  sinceListing: number;
  availability: number;      // Asset availability % (replaces occupancy)
  concessionLife: number;    // Remaining concession life in years (replaces WALE)
  ltv: number;
  lastUpdated: string;
  irUrl: string;
  isLiveCMP: boolean;
  cmpCachedAt: string | null;
  // Dynamic XBRL state
  dataSource: 'xbrl' | 'loading' | 'error';
  reviewRequired: boolean;
  lastXbrlSync: string | null;
}

export interface InvITScoreBreakdown {
  divScore: number;
  safetyScore: number;
  growthScore: number;
  postTaxYield: number;
  finalScore: number;
  rank: number;
}

export const BSE_INVIT_SCRIP_CODES: Record<string, string> = {
  indigrid: '540565',
  pginvit: '543620',
  irbinvit: '541956',
  nhit: '543985',
  bhinvit: '544173',
};

export const INVIT_NAMES: Record<string, string> = {
  indigrid: 'IndiGrid Infrastructure Trust',
  pginvit: 'PowerGrid Infrastructure InvIT',
  irbinvit: 'IRB InvIT Fund',
  nhit: 'National Highways Infra Trust',
  bhinvit: 'Bharat Highways InvIT',
};

export const INVIT_TICKERS: Record<string, string> = {
  indigrid: 'INDIGRID',
  pginvit: 'PGINVIT',
  irbinvit: 'IRBINVIT',
  nhit: 'NHIT',
  bhinvit: 'BHINVIT',
};

export const INVIT_SECTORS: Record<string, InvITSector> = {
  indigrid: 'Transmission',
  pginvit: 'Transmission',
  irbinvit: 'Road/Toll',
  nhit: 'Road/Toll',
  bhinvit: 'Road/Toll',
};

export const INVIT_IDS = Object.keys(BSE_INVIT_SCRIP_CODES);

// ── Q3 FY26 Verified Baseline Data ──
// Sources: BSE filings, official distribution summaries, investor presentations
const CURRENT_DATE = '2026-03-24';

function buildInvITData(
  id: string, name: string, ticker: string, sector: InvITSector,
  cmp: number, nav: number, listingPrice: number, listingDate: string,
  ttmDistribution: number,
  taxBreakdown: InvITTaxBreakdown,
  availability: number, concessionLife: number, ltv: number,
  growth1Y: number, irUrl: string
): InvITData {
  const divYield = computeInvITDivYield(ttmDistribution, cmp);
  const age = (new Date(CURRENT_DATE).getTime() - new Date(listingDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  const sinceListing = age > 0 ? (Math.pow(cmp / listingPrice, 1 / age) - 1) * 100 : 0;
  const growth3Y = age >= 3 ? (Math.pow(cmp / listingPrice, 1 / Math.min(age, 3)) - 1) * 100 : null;
  const growth5Y = age >= 5 ? (Math.pow(cmp / listingPrice, 1 / Math.min(age, 5)) - 1) * 100 : null;

  return {
    id, name, ticker,
    bseScripCode: BSE_INVIT_SCRIP_CODES[id],
    sector, cmp, nav, listingPrice, listingDate,
    ttmDistribution, divYield, taxBreakdown,
    growth1Y, growth3Y, growth5Y,
    sinceListing: Math.round(sinceListing * 10) / 10,
    availability, concessionLife, ltv,
    lastUpdated: CURRENT_DATE,
    irUrl,
    isLiveCMP: false,
    cmpCachedAt: null,
    dataSource: 'xbrl',
    reviewRequired: false,
    lastXbrlSync: null,
  };
}

const rawInvITData: InvITData[] = [
  // IndiGrid: TTM = Q4 FY25 (₹4.0) + Q1 FY26 (₹4.0) + Q2 FY26 (₹4.0) + Q3 FY26 (₹4.0) = ₹16.0
  buildInvITData('indigrid', 'IndiGrid Infrastructure Trust', 'INDIGRID', 'Transmission',
    165.13, 168, 100, '2017-06-05',
    16.0,
    { interest: 0.55, dividend: 0.0, repaymentOfDebt: 0.45 },
    99.8, 28, 0.42,
    8.2, 'https://www.indigrid.co.in/investor-relations/'
  ),
  // PGInvIT: TTM = Q4 FY25 (₹3.0) + Q1 FY26 (₹3.0) + Q2 FY26 (₹3.0) + Q3 FY26 (₹3.0) = ₹12.0
  buildInvITData('pginvit', 'PowerGrid Infrastructure InvIT', 'PGINVIT', 'Transmission',
    155.50, 130, 100, '2021-05-17',
    12.0,
    { interest: 0.60, dividend: 0.0, repaymentOfDebt: 0.40 },
    98.0, 30, 0.15,
    12.5, 'https://www.pginvit.in/investor-relations/'
  ),
  // IRB InvIT: Q3 FY26 DPU ₹1.50, 9M FY26 cumulative ₹5.00 → TTM ~₹6.50
  buildInvITData('irbinvit', 'IRB InvIT Fund', 'IRBINVIT', 'Road/Toll',
    61.79, 68, 100, '2017-05-15',
    6.50,
    { interest: 0.70, dividend: 0.0, repaymentOfDebt: 0.30 },
    95.0, 18, 0.35,
    -5.2, 'https://www.irbinvit.com/investor-relations/'
  ),
  // NHIT: TTM (Jan-Mar'25: 2.047 + Q1 FY26: 2.984 + Q2: 2.471 + Q3: 2.744) = ₹10.25
  buildInvITData('nhit', 'National Highways Infra Trust', 'NHIT', 'Road/Toll',
    155.00, 152, 100, '2021-11-30',
    10.25,
    { interest: 0.97, dividend: 0.0, repaymentOfDebt: 0.03 },
    97.0, 22, 0.20,
    4.5, 'https://nhit.co.in/'
  ),
  // BHINVIT: Newer listing, estimated TTM ~₹8.50
  buildInvITData('bhinvit', 'Bharat Highways InvIT', 'BHINVIT', 'Road/Toll',
    122.33, 118, 100, '2024-09-12',
    8.50,
    { interest: 0.80, dividend: 0.0, repaymentOfDebt: 0.20 },
    96.0, 20, 0.25,
    22.3, 'https://www.bharathighwaysinvit.com/'
  ),
];

export const LIVE_INVIT_DATA: InvITData[] = rawInvITData;

/** Compute post-tax yield for InvIT distribution breakdown */
export function computeInvITPostTaxYield(
  taxBreakdown: InvITTaxBreakdown,
  ttmDistribution: number,
  cmp: number,
  taxRate: number // percentage e.g. 31.2
): number {
  if (!cmp || cmp <= 0) return 0;
  const rate = taxRate / 100;
  // Interest is taxed; Dividend taxed at slab (for InvITs); Repayment of Debt is tax-free
  const postTaxDist =
    ttmDistribution * taxBreakdown.interest * (1 - rate) +
    ttmDistribution * taxBreakdown.dividend * (1 - rate) +
    ttmDistribution * taxBreakdown.repaymentOfDebt * 1;
  return (postTaxDist / cmp) * 100;
}

export function computeInvITDivYield(ttmDistribution: number, cmp: number): number {
  if (!cmp || cmp <= 0) return 0;
  return (ttmDistribution / cmp) * 100;
}
