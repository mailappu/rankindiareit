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
