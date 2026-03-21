import { supabase } from '@/integrations/supabase/client';

const GSEC_CACHE_KEY = 'gsec_yield_cache';
const CACHE_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours
const FALLBACK_YIELD = 6.737;
const SIGNIFICANT_CHANGE_THRESHOLD = 0.02; // percentage points
const TOAST_THRESHOLD = 0.05; // percentage points for toast notification

export type GSecStatus = 'live' | 'cached' | 'fallback';

interface GSecCache {
  yield: number;
  fetchedAt: number; // epoch ms
  source: 'live' | 'fallback';
}

function getCache(): GSecCache | null {
  try {
    const raw = localStorage.getItem(GSEC_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setCache(data: GSecCache) {
  localStorage.setItem(GSEC_CACHE_KEY, JSON.stringify(data));
}

function isCacheFresh(cache: GSecCache): boolean {
  return Date.now() - cache.fetchedAt < CACHE_TTL_MS;
}

export function getCacheAge(cache: GSecCache | null): GSecStatus {
  if (!cache) return 'fallback';
  if (cache.source === 'fallback') return 'fallback';
  return isCacheFresh(cache) ? 'live' : 'cached';
}

/**
 * 3-Tier G-Sec Yield fetcher:
 * 1. Return fresh cache if < 4 hours old
 * 2. Fetch live via sync-proxy edge function
 * 3. Fallback to verified rate
 */
export async function getGSecYield(): Promise<{
  yield: number;
  status: GSecStatus;
  changed: boolean;
  previousYield: number | null;
}> {
  const cache = getCache();

  // Tier 1: Fresh cache — skip network entirely
  if (cache && isCacheFresh(cache) && cache.source === 'live') {
    return {
      yield: cache.yield,
      status: 'live',
      changed: false,
      previousYield: null,
    };
  }

  const previousYield = cache?.yield ?? null;

  // Tier 2: Fetch live from edge function
  try {
    const { data, error } = await supabase.functions.invoke('sync-proxy');

    if (!error && data?.gsecYield && data.gsecYield > 4 && data.gsecYield < 12) {
      const newYield = data.gsecYield;
      const yieldChanged = previousYield !== null &&
        Math.abs(newYield - previousYield) >= SIGNIFICANT_CHANGE_THRESHOLD;

      setCache({ yield: newYield, fetchedAt: Date.now(), source: 'live' });

      return {
        yield: newYield,
        status: 'live',
        changed: yieldChanged,
        previousYield: yieldChanged ? previousYield : null,
      };
    }
  } catch {
    // Fall through to tier 3
  }

  // Tier 3: Fallback
  const fallbackYield = cache?.yield ?? FALLBACK_YIELD;
  if (!cache || cache.source !== 'live') {
    setCache({ yield: fallbackYield, fetchedAt: Date.now(), source: 'fallback' });
  }

  return {
    yield: fallbackYield,
    status: cache ? getCacheAge(cache) : 'fallback',
    changed: false,
    previousYield: null,
  };
}

export function shouldShowToast(oldYield: number, newYield: number): boolean {
  return Math.abs(newYield - oldYield) >= TOAST_THRESHOLD;
}

export { FALLBACK_YIELD, SIGNIFICANT_CHANGE_THRESHOLD, TOAST_THRESHOLD };
