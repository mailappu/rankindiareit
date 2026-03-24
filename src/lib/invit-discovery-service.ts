import { supabase } from '@/integrations/supabase/client';
import type { InvITData } from './invit-types';
import { LIVE_INVIT_DATA, computeInvITDivYield } from './invit-types';
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

/** Build InvIT data from baseline + live BSE prices */
export async function discoverInvITData(): Promise<InvITDiscoveryResult> {
  const errors: string[] = [];

  // Start with baseline data
  const invits: InvITData[] = LIVE_INVIT_DATA.map(d => ({ ...d }));

  try {
    // Fetch live CMP prices
    console.log('[InvIT Discovery] Fetching live CMP...');
    const { data: cmpData, error: cmpError } = await supabase.functions.invoke('fetch-cmp');

    if (cmpError) {
      errors.push(`CMP fetch error: ${cmpError.message}`);
    }

    if (!cmpError && cmpData?.success && Array.isArray(cmpData.prices)) {
      for (const p of cmpData.prices) {
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
