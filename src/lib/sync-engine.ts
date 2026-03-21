import { supabase } from '@/integrations/supabase/client';
import { DATA_VERIFIED_DATE } from './reit-types';

export interface PDFMetadata {
  reitId: string;
  label: string;
  contentLength: string | null;
  lastModified: string | null;
  error: string | null;
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
}

const STORAGE_KEY = 'reit_pdf_metadata';

const SOURCE_URLS: Record<string, string> = {
  embassy: 'https://eopwebsvr.blob.core.windows.net/media/filer_public/4f/0c/4f0c413c-e92b-4a7c-9cc3-aff0d5969332/earnings_presentation.pdf',
  mindspace: 'https://www.mindspacereit.com/wp-content/uploads/2025/11/Investor-Presentation.pdf',
  brookfield: 'https://www.brookfieldindiareit.in/investors/reports-and-filings',
  nexus: 'https://www.nexusselecttrust.com/resources/assets/pdf/Nexus-Select-Trust-Dec-25-vf.pdf',
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
      sourceStatus: Object.fromEntries(Object.keys(SOURCE_URLS).map(k => [k, 'error' as const])),
      gsecYield: null,
      failed: true,
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
      sourceStatus: Object.fromEntries(Object.keys(SOURCE_URLS).map(k => [k, 'error' as const])),
      gsecYield: null,
      failed: true,
    };
  }

  const stored = getStoredMetadata();
  const changedSources: string[] = [];
  const errors: SyncError[] = [];
  const sourceStatus: Record<string, 'ok' | 'error'> = {};
  const newMeta: Record<string, PDFMetadata> = {};

  for (const meta of data.metadata as PDFMetadata[]) {
    newMeta[meta.reitId] = meta;

    if (meta.error) {
      errors.push({
        source: meta.label,
        url: SOURCE_URLS[meta.reitId] || 'unknown',
        message: meta.error,
        timestamp: new Date().toISOString(),
      });
      sourceStatus[meta.reitId] = 'error';
      continue;
    }

    sourceStatus[meta.reitId] = 'ok';

    const prev = stored[meta.reitId];
    if (prev) {
      const lengthChanged = meta.contentLength && prev.contentLength && meta.contentLength !== prev.contentLength;
      const dateChanged = meta.lastModified && prev.lastModified && meta.lastModified !== prev.lastModified;
      if (lengthChanged || dateChanged) {
        changedSources.push(meta.label);
      }
    }
  }

  storeMetadata(newMeta);

  return {
    changed: changedSources.length > 0,
    checkedCount: data.metadata.length,
    changedSources,
    errors,
    sourceStatus,
    gsecYield: data.gsecYield ?? null,
    failed: false,
  };
}

export function getProvenanceBadge(): string {
  return `Verified against Q3 FY2026 Official Filings · ${DATA_VERIFIED_DATE}`;
}
