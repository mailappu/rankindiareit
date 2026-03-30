import { supabase } from '@/integrations/supabase/client';
import type { InvITData } from './invit-types';
import { LIVE_INVIT_DATA, computeInvITDivYield } from './invit-types';
import type { LivePrice } from './sync-engine';
import { persistCMPCache } from './sync-engine';

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

/** Build InvIT data from baseline + live BSE prices */
export async function discoverInvITData(livePrices?: Record<string, LivePrice>): Promise<InvITDiscoveryResult> {
  const errors: string[] = [];

  // Start with baseline data
  const invits: InvITData[] = LIVE_INVIT_DATA.map(d => ({ ...d }));
  const resolvedLivePrices: Record<string, LivePrice> = livePrices ? { ...livePrices } : {};

  try {
    if (!livePrices) {
      console.log('[InvIT Discovery] Fetching live CMP...');
      const { data: cmpData, error: cmpError } = await supabase.functions.invoke('fetch-cmp');

      if (cmpError) {
        errors.push(`CMP fetch error: ${cmpError.message}`);
      }

      if (!cmpError && cmpData?.success && Array.isArray(cmpData.prices)) {
        for (const price of cmpData.prices) {
          resolvedLivePrices[price.reitId] = {
            reitId: price.reitId,
            cmp: price.cmp,
            isLive: price.isLive,
            fetchedAt: price.fetchedAt,
            error: price.error,
            growth1Y: price.growth1Y,
            growth3Y: price.growth3Y,
            growth5Y: price.growth5Y,
            cagrSource: price.cagrSource,
          };
        }
      }
    }

    if (Object.keys(resolvedLivePrices).length > 0) {
      persistCMPCache(resolvedLivePrices);
    }

    for (const p of Object.values(resolvedLivePrices)) {
      const invit = invits.find(i => i.id === p.reitId);
      if (invit && p.cmp > 0) {
        invit.cmp = p.cmp;
        invit.isLiveCMP = p.isLive;
        invit.cmpCachedAt = p.fetchedAt;
        invit.divYield = computeInvITDivYield(invit.ttmDistribution, p.cmp);
        invit.growth1Y = p.growth1Y || invit.growth1Y;
        if (p.growth3Y != null) invit.growth3Y = p.growth3Y;
        if (p.growth5Y != null) invit.growth5Y = p.growth5Y;
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'CMP fetch failed';
    errors.push(msg);
  }

  const result: InvITDiscoveryResult = {
    invits,
    errors,
    syncedAt: new Date().toISOString(),
  };

  localStorage.setItem(INVIT_CACHE_KEY, JSON.stringify(result));
  console.log(`[InvIT Discovery] Complete: ${invits.length} InvITs, ${errors.length} errors`);
  return result;
}
