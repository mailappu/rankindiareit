import { supabase } from '@/integrations/supabase/client';
import { DATA_VERIFIED_DATE, computeDivYield, TTM_DISTRIBUTIONS, FALLBACK_CMP, type REITData } from './reit-types';
import { computeInvITDivYield, type InvITData } from './invit-types';

export interface PDFMetadata {
  reitId: string;
  label: string;
  pdfUrl?: string;
  discoveredFrom?: 'scrape' | 'fallback';
  contentLength: string | null;
  lastModified: string | null;
  error: string | null;
  warning?: string | null;
}

export interface SyncError {
  source: string;
  url: string;
  message: string;
  timestamp: string;
}

export interface LivePrice {
  reitId: string;
  cmp: number;
  isLive: boolean;
  fetchedAt: string;
  error: string | null;
  growth1Y?: number;
  growth3Y?: number | null;
  growth5Y?: number | null;
  cagrSource?: string;
}

export interface SyncResult {
  changed: boolean;
  checkedCount: number;
  changedSources: string[];
  errors: SyncError[];
  sourceStatus: Record<string, 'ok' | 'error'>;
  gsecYield: number | null;
  failed: boolean;
  discoveredUrls: Record<string, DiscoveredUrl>;
  newDiscoveries: string[];
  livePrices: Record<string, LivePrice>;
}

export interface DiscoveredUrl {
  pdfUrl: string;
  label: string;
  discoveredFrom: 'scrape' | 'fallback';
  discoveredAt: string;
}

const STORAGE_KEY = 'reit_pdf_metadata';
const DISCOVERED_URLS_KEY = 'reit_discovered_urls';
const CMP_CACHE_KEY = 'reit_cmp_cache';

const REIT_IDS = ['embassy', 'mindspace', 'brookfield', 'nexus'];

const FALLBACK_IR_URLS: Record<string, string> = {
  embassy: 'https://www.embassyofficeparks.com/investors',
  mindspace: 'https://www.mindspacereit.com/investor-relations',
  brookfield: 'https://www.brookfieldindiareit.in/investors/reports-and-filings',
  nexus: 'https://www.nexusselecttrust.com/investor-relation',
};

function getStoredMetadata(): Record<string, PDFMetadata> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch { return {}; }
}

function storeMetadata(metadata: Record<string, PDFMetadata>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(metadata));
}

export function getStoredDiscoveredUrls(): Record<string, DiscoveredUrl> {
  try {
    const stored = localStorage.getItem(DISCOVERED_URLS_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch { return {}; }
}

function storeDiscoveredUrls(urls: Record<string, DiscoveredUrl>) {
  localStorage.setItem(DISCOVERED_URLS_KEY, JSON.stringify(urls));
}

export function getStoredCMPCache(): Record<string, LivePrice> {
  try {
    const stored = localStorage.getItem(CMP_CACHE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch { return {}; }
}

function storeCMPCache(prices: Record<string, LivePrice>) {
  localStorage.setItem(CMP_CACHE_KEY, JSON.stringify(prices));
}

/** Fetch live CMP prices from edge function, fallback to cached/hardcoded */
async function fetchLivePrices(): Promise<Record<string, LivePrice>> {
  const cached = getStoredCMPCache();

  try {
    const { data, error } = await supabase.functions.invoke('fetch-cmp');

    if (!error && data?.success && Array.isArray(data.prices)) {
      const result: Record<string, LivePrice> = {};
      for (const p of data.prices) {
        result[p.reitId] = {
          reitId: p.reitId,
          cmp: p.cmp,
          isLive: p.isLive,
          fetchedAt: p.fetchedAt,
          error: p.error,
          growth1Y: p.growth1Y,
          growth3Y: p.growth3Y,
          growth5Y: p.growth5Y,
          cagrSource: p.cagrSource,
        };
      }
      storeCMPCache(result);
      return result;
    }
  } catch (err) {
    console.warn('CMP fetch failed, using cached prices:', err);
  }

  // Return cached or fallback prices
  if (Object.keys(cached).length > 0) {
    // Mark all cached prices as offline
    const offlineCached: Record<string, LivePrice> = {};
    for (const [id, price] of Object.entries(cached)) {
      offlineCached[id] = { ...price, isLive: false };
    }
    return offlineCached;
  }

  // Pure fallback from hardcoded values
  const fallback: Record<string, LivePrice> = {};
  for (const id of REIT_IDS) {
    fallback[id] = {
      reitId: id,
      cmp: FALLBACK_CMP[id] ?? 0,
      isLive: false,
      fetchedAt: new Date().toISOString(),
      error: 'Using verified Mar 21 closing price.',
    };
  }
  return fallback;
}

/** Apply live prices to REIT data and recalculate divYield */
export function applyLivePrices(
  reits: REITData[],
  livePrices: Record<string, LivePrice>
): REITData[] {
  return reits.map(reit => {
    const lp = livePrices[reit.id];
    if (!lp) return reit;

    const newCmp = lp.cmp;
    const newDivYield = computeDivYield(reit.ttmDistribution, newCmp);

    return {
      ...reit,
      cmp: newCmp,
      divYield: newDivYield,
      isLiveCMP: lp.isLive,
      cmpCachedAt: lp.fetchedAt,
      ...(lp.growth1Y !== undefined ? { growth1Y: lp.growth1Y } : {}),
      ...(lp.growth3Y !== undefined ? { growth3Y: lp.growth3Y } : {}),
      ...(lp.growth5Y !== undefined ? { growth5Y: lp.growth5Y } : {}),
    };
  });
}

/** Apply live prices to InvIT data and recalculate divYield */
export function applyLivePricesToInvITs(
  invits: import('./invit-types').InvITData[],
  livePrices: Record<string, LivePrice>
): import('./invit-types').InvITData[] {
  const { computeInvITDivYield } = require('./invit-types');
  return invits.map(invit => {
    const lp = livePrices[invit.id];
    if (!lp || lp.cmp <= 0) return invit;

    return {
      ...invit,
      cmp: lp.cmp,
      divYield: computeInvITDivYield(invit.ttmDistribution, lp.cmp),
      isLiveCMP: lp.isLive,
      cmpCachedAt: lp.fetchedAt,
      ...(lp.growth1Y !== undefined ? { growth1Y: lp.growth1Y } : {}),
      ...(lp.growth3Y !== undefined ? { growth3Y: lp.growth3Y } : {}),
      ...(lp.growth5Y !== undefined ? { growth5Y: lp.growth5Y } : {}),
    };
  });
}

export async function performSmartSync(): Promise<SyncResult> {
  let data: any;
  let invokeError: any;

  // Fetch CMP prices in parallel with sync-proxy
  const [cmpResult, syncResult] = await Promise.all([
    fetchLivePrices(),
    (async () => {
      try {
        const result = await supabase.functions.invoke('sync-proxy');
        return { data: result.data, error: result.error };
      } catch (err) {
        return { data: null, error: err };
      }
    })(),
  ]);

  data = syncResult.data;
  invokeError = syncResult.error;

  if (invokeError || !data?.success) {
    return {
      changed: false,
      checkedCount: 0,
      changedSources: [],
      errors: [{
        source: 'Proxy',
        url: 'sync-proxy',
        message: invokeError?.message || data?.error || 'Sync proxy returned an error.',
        timestamp: new Date().toISOString(),
      }],
      sourceStatus: Object.fromEntries(REIT_IDS.map(k => [k, 'error' as const])),
      gsecYield: null,
      failed: true,
      discoveredUrls: getStoredDiscoveredUrls(),
      newDiscoveries: [],
      livePrices: cmpResult,
    };
  }

  const stored = getStoredMetadata();
  const storedUrls = getStoredDiscoveredUrls();
  const changedSources: string[] = [];
  const errors: SyncError[] = [];
  const sourceStatus: Record<string, 'ok' | 'error'> = {};
  const newMeta: Record<string, PDFMetadata> = {};
  const discoveredUrls: Record<string, DiscoveredUrl> = { ...storedUrls };
  const newDiscoveries: string[] = [];

  for (const meta of data.metadata as PDFMetadata[]) {
    newMeta[meta.reitId] = meta;

    if (meta.error) {
      errors.push({
        source: meta.label,
        url: meta.pdfUrl || FALLBACK_IR_URLS[meta.reitId] || 'unknown',
        message: meta.error,
        timestamp: new Date().toISOString(),
      });
      sourceStatus[meta.reitId] = 'error';
    } else {
      sourceStatus[meta.reitId] = 'ok';
    }

    if (meta.pdfUrl) {
      const previousUrl = storedUrls[meta.reitId]?.pdfUrl;
      const isNew = previousUrl && previousUrl !== meta.pdfUrl;

      discoveredUrls[meta.reitId] = {
        pdfUrl: meta.pdfUrl,
        label: meta.label,
        discoveredFrom: meta.discoveredFrom || 'fallback',
        discoveredAt: new Date().toISOString(),
      };

      if (isNew) {
        newDiscoveries.push(meta.reitId);
      }
    }

    const prev = stored[meta.reitId];
    if (prev && !meta.error) {
      const lengthChanged = meta.contentLength && prev.contentLength && meta.contentLength !== prev.contentLength;
      const dateChanged = meta.lastModified && prev.lastModified && meta.lastModified !== prev.lastModified;
      if (lengthChanged || dateChanged) {
        changedSources.push(meta.label);
      }
    }
  }

  storeMetadata(newMeta);
  storeDiscoveredUrls(discoveredUrls);

  return {
    changed: changedSources.length > 0,
    checkedCount: data.metadata.length,
    changedSources,
    errors,
    sourceStatus,
    gsecYield: data.gsecYield ?? null,
    failed: false,
    discoveredUrls,
    newDiscoveries,
    livePrices: cmpResult,
  };
}

export function getProvenanceBadge(): string {
  return `Verified against Q3 FY2026 Official Filings · ${DATA_VERIFIED_DATE}`;
}
