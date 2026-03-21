import { supabase } from '@/integrations/supabase/client';
import { DATA_VERIFIED_DATE } from './reit-types';

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

export interface SyncResult {
  changed: boolean;
  checkedCount: number;
  changedSources: string[];
  errors: SyncError[];
  sourceStatus: Record<string, 'ok' | 'error'>;
  gsecYield: number | null;
  failed: boolean;
  discoveredUrls: Record<string, DiscoveredUrl>;
  newDiscoveries: string[]; // REIT IDs with newly discovered URLs
}

export interface DiscoveredUrl {
  pdfUrl: string;
  label: string;
  discoveredFrom: 'scrape' | 'fallback';
  discoveredAt: string;
}

const STORAGE_KEY = 'reit_pdf_metadata';
const DISCOVERED_URLS_KEY = 'reit_discovered_urls';

const REIT_IDS = ['embassy', 'mindspace', 'brookfield', 'nexus'];

// Fallback IR URLs per REIT (used when discovery fails)
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
  } catch {
    return {};
  }
}

function storeMetadata(metadata: Record<string, PDFMetadata>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(metadata));
}

export function getStoredDiscoveredUrls(): Record<string, DiscoveredUrl> {
  try {
    const stored = localStorage.getItem(DISCOVERED_URLS_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function storeDiscoveredUrls(urls: Record<string, DiscoveredUrl>) {
  localStorage.setItem(DISCOVERED_URLS_KEY, JSON.stringify(urls));
}

export async function performSmartSync(): Promise<SyncResult> {
  let data: any;
  let invokeError: any;

  try {
    const result = await supabase.functions.invoke('sync-proxy');
    data = result.data;
    invokeError = result.error;
  } catch (err) {
    return {
      changed: false,
      checkedCount: 0,
      changedSources: [],
      errors: [{
        source: 'Proxy',
        url: 'sync-proxy',
        message: err instanceof Error ? err.message : 'Could not reach sync proxy.',
        timestamp: new Date().toISOString(),
      }],
      sourceStatus: Object.fromEntries(REIT_IDS.map(k => [k, 'error' as const])),
      gsecYield: null,
      failed: true,
      discoveredUrls: getStoredDiscoveredUrls(),
      newDiscoveries: [],
    };
  }

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

    // Track discovered URLs
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

    // Check for content changes (existing logic)
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
  };
}

export function getProvenanceBadge(): string {
  return `Verified against Q3 FY2026 Official Filings · ${DATA_VERIFIED_DATE}`;
}
