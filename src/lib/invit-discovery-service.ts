import { supabase } from '@/integrations/supabase/client';
import type { InvITData, InvITTaxBreakdown, InvITSector } from './invit-types';
import { BSE_INVIT_SCRIP_CODES, INVIT_NAMES, INVIT_TICKERS, INVIT_SECTORS, computeInvITDivYield } from './invit-types';
import type { LivePrice } from './sync-engine';

export interface InvITDiscoveryResult {
  invits: InvITData[];
  errors: string[];
  syncedAt: string;
}

const INVIT_CACHE_KEY = 'invit_discovery_cache';

export function getCachedInvITDiscovery(): InvITDiscoveryResult | null {
  try {
    const stored = localStorage.getItem(INVIT_CACHE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch { return null; }
}

/** Build InvIT data from BSE XBRL filings + live prices */
export async function discoverInvITData(): Promise<InvITDiscoveryResult> {
  const errors: string[] = [];
  const invits: InvITData[] = [];

  try {
    // Fetch XBRL filings for InvITs
    console.log('[InvIT Discovery] Fetching BSE XBRL data...');
    const { data, error } = await supabase.functions.invoke('fetch-bse-xbrl', {
      body: { reitIds: Object.keys(BSE_INVIT_SCRIP_CODES), parseXbrl: true },
    });

    if (error) {
      errors.push(`BSE API error: ${error.message}`);
    }

    // Fetch live CMP prices (includes InvITs now)
    console.log('[InvIT Discovery] Fetching live CMP...');
    const { data: cmpData, error: cmpError } = await supabase.functions.invoke('fetch-cmp');

    const livePriceMap: Record<string, LivePrice> = {};
    if (!cmpError && cmpData?.success && Array.isArray(cmpData.prices)) {
      for (const p of cmpData.prices) {
        livePriceMap[p.reitId] = p;
      }
    }

    // Build InvIT data objects
    for (const id of Object.keys(BSE_INVIT_SCRIP_CODES)) {
      const livePrice = livePriceMap[id];
      const filings = data?.results?.find((r: any) => r.reitId === id);
      const xbrlMetrics = extractMetricsFromFilings(filings?.filings || []);

      const cmp = livePrice?.cmp || 0;
      const isLive = livePrice?.isLive || false;
      const hasXbrl = Object.keys(xbrlMetrics).length > 0;

      // Extract values from XBRL or mark as review required
      const ttmDistribution = typeof xbrlMetrics.totalDistribution === 'number' ? xbrlMetrics.totalDistribution : 0;
      const availability = typeof xbrlMetrics.assetAvailability === 'number'
        ? (xbrlMetrics.assetAvailability > 1 ? xbrlMetrics.assetAvailability : xbrlMetrics.assetAvailability * 100)
        : 0;
      const concessionLife = typeof xbrlMetrics.concessionLife === 'number' ? xbrlMetrics.concessionLife : 0;
      const ltv = typeof xbrlMetrics.ltv === 'number'
        ? (xbrlMetrics.ltv > 1 ? xbrlMetrics.ltv : xbrlMetrics.ltv * 100)
        : 0;

      // Tax breakdown from XBRL
      const interest = typeof xbrlMetrics.interest === 'number' ? xbrlMetrics.interest : 0;
      const dividend = typeof xbrlMetrics.dividend === 'number' ? xbrlMetrics.dividend : 0;
      const repayment = typeof xbrlMetrics.amortization === 'number' ? xbrlMetrics.amortization : 0;
      const total = interest + dividend + repayment;

      const taxBreakdown: InvITTaxBreakdown = total > 0
        ? { interest: interest / total, dividend: dividend / total, repaymentOfDebt: repayment / total }
        : { interest: 0.5, dividend: 0.2, repaymentOfDebt: 0.3 }; // Default split

      const invit: InvITData = {
        id,
        name: INVIT_NAMES[id],
        ticker: INVIT_TICKERS[id],
        bseScripCode: BSE_INVIT_SCRIP_CODES[id],
        sector: INVIT_SECTORS[id],
        cmp,
        nav: 0, // Will come from XBRL
        listingPrice: 0,
        listingDate: '',
        ttmDistribution,
        divYield: computeInvITDivYield(ttmDistribution, cmp),
        taxBreakdown,
        growth1Y: livePrice?.growth1Y || 0,
        growth3Y: livePrice?.growth3Y ?? null,
        growth5Y: livePrice?.growth5Y ?? null,
        sinceListing: 0,
        availability,
        concessionLife,
        ltv,
        lastUpdated: new Date().toISOString(),
        irUrl: '',
        isLiveCMP: isLive,
        cmpCachedAt: livePrice?.fetchedAt || null,
        dataSource: hasXbrl ? 'xbrl' : (cmp > 0 ? 'loading' : 'error'),
        reviewRequired: !hasXbrl,
        lastXbrlSync: new Date().toISOString(),
      };

      invits.push(invit);

      if (!hasXbrl && cmp > 0) {
        errors.push(`${INVIT_NAMES[id]}: XBRL tags not matched — metrics flagged for review`);
      } else if (cmp === 0) {
        errors.push(`${INVIT_NAMES[id]}: Price unavailable from BSE`);
      }
    }

    const result: InvITDiscoveryResult = {
      invits,
      errors,
      syncedAt: new Date().toISOString(),
    };

    localStorage.setItem(INVIT_CACHE_KEY, JSON.stringify(result));
    console.log(`[InvIT Discovery] Complete: ${invits.length} InvITs, ${errors.length} errors`);
    return result;
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Discovery failed';
    errors.push(msg);
    return { invits: [], errors, syncedAt: new Date().toISOString() };
  }
}

function extractMetricsFromFilings(filings: any[]): Record<string, number | string> {
  const metrics: Record<string, number | string> = {};
  for (const filing of filings) {
    if (filing.xbrlMetrics && typeof filing.xbrlMetrics === 'object') {
      Object.assign(metrics, filing.xbrlMetrics);
    }
  }
  return metrics;
}
