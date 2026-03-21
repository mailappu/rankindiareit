import { supabase } from '@/integrations/supabase/client';
import { DATA_VERIFIED_DATE } from './reit-types';

export interface PDFMetadata {
  reitId: string;
  label: string;
  contentLength: string | null;
  lastModified: string | null;
  error: string | null;
}

export interface SyncResult {
  changed: boolean;
  checkedCount: number;
  changedSources: string[];
  errors: string[];
  gsecYield: number | null;
}

const STORAGE_KEY = 'reit_pdf_metadata';

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
  // Call edge function proxy to bypass CORS
  const { data, error } = await supabase.functions.invoke('sync-proxy');

  if (error || !data?.success) {
    throw new Error(error?.message || data?.error || 'Sync proxy failed');
  }

  const stored = getStoredMetadata();
  const changedSources: string[] = [];
  const errors: string[] = [];
  const newMeta: Record<string, PDFMetadata> = {};

  for (const meta of data.metadata as PDFMetadata[]) {
    newMeta[meta.reitId] = meta;

    if (meta.error) {
      errors.push(`${meta.label}: ${meta.error}`);
      continue;
    }

    const prev = stored[meta.reitId];
    if (prev) {
      const lengthChanged = meta.contentLength && prev.contentLength && meta.contentLength !== prev.contentLength;
      const dateChanged = meta.lastModified && prev.lastModified && meta.lastModified !== prev.lastModified;
      if (lengthChanged || dateChanged) {
        changedSources.push(meta.label);
      }
    }
    // First sync = baseline, not flagged as change
  }

  storeMetadata(newMeta);

  return {
    changed: changedSources.length > 0,
    checkedCount: data.metadata.length,
    changedSources,
    errors,
    gsecYield: data.gsecYield ?? null,
  };
}

export function getProvenanceBadge(): string {
  return `Verified against Q3 FY2026 Official Filings · ${DATA_VERIFIED_DATE}`;
}
