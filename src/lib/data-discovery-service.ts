import { supabase } from '@/integrations/supabase/client';
import { XMLParser } from 'fast-xml-parser';
import type { TaxBreakdown } from './reit-types';

export interface BSEFiling {
  reitId: string;
  reitName: string;
  filingDate: string;
  subject: string;
  category: string;
  attachmentUrl: string | null;
  xbrlUrl: string | null;
  submissionTime: string;
  xbrlMetrics?: Record<string, string | number>;
  xbrlError?: string | null;
}

export interface DiscoveredMetrics {
  reitId: string;
  taxBreakdown?: Partial<TaxBreakdown>;
  occupancy?: number;
  wale?: number;
  ltv?: number;
  totalDistribution?: number;
  source: 'xbrl' | 'fallback';
  reviewRequired: boolean;
  lastSyncedAt: string;
  filingDate?: string;
}

export interface DataDiscoveryResult {
  filings: Record<string, BSEFiling[]>;
  metrics: Record<string, DiscoveredMetrics>;
  errors: string[];
  totalFilings: number;
  syncedAt: string;
}

const STORAGE_KEY = 'reit_bse_discovery';
const METRICS_KEY = 'reit_discovered_metrics';

/** Get cached discovery results */
export function getCachedDiscovery(): DataDiscoveryResult | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

/** Get cached discovered metrics */
export function getCachedMetrics(): Record<string, DiscoveredMetrics> {
  try {
    const stored = localStorage.getItem(METRICS_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

/** Parse XBRL XML content client-side using fast-xml-parser */
function parseXBRLMetrics(xmlContent: string): Record<string, number | string> {
  const metrics: Record<string, number | string> = {};

  try {
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      removeNSPrefix: true,
    });

    const parsed = parser.parse(xmlContent);

    // Recursively search for REIT-relevant tags
    const searchTags: Record<string, string[]> = {
      interest: ['Interest', 'InterestIncome', 'InterestDistribution', 'InterestComponent'],
      dividend: ['Dividend', 'DividendIncome', 'DividendDistribution', 'DividendComponent'],
      amortization: ['RepaymentOfDebt', 'Amortization', 'AmortisationOfSPV', 'AmortizationComponent'],
      occupancy: ['OccupancyRate', 'Occupancy', 'OccupancyPercentage'],
      wale: ['WeightedAverageLeaseExpiry', 'WALE', 'WeightedAvgLeaseExpiry'],
      totalDistribution: ['TotalDistribution', 'DistributionPerUnit', 'TotalDPU'],
      ltv: ['LoanToValue', 'NetDebtToGAV', 'LTV', 'LoanToValueRatio'],
    };

    function searchObject(obj: any, depth = 0): void {
      if (depth > 10 || !obj || typeof obj !== 'object') return;

      for (const [key, value] of Object.entries(obj)) {
        const cleanKey = key.replace(/^[^:]*:/, ''); // Remove namespace prefix

        for (const [metricName, tags] of Object.entries(searchTags)) {
          if (tags.some(tag => cleanKey.toLowerCase().includes(tag.toLowerCase()))) {
            if (typeof value === 'number') {
              metrics[metricName] = value;
            } else if (typeof value === 'string') {
              const num = parseFloat(value);
              if (!isNaN(num)) metrics[metricName] = num;
            } else if (typeof value === 'object' && value !== null) {
              // Check #text for text content in XML
              const textVal = (value as any)['#text'];
              if (textVal !== undefined) {
                const num = parseFloat(String(textVal));
                if (!isNaN(num)) metrics[metricName] = num;
              }
            }
          }
        }

        if (typeof value === 'object') {
          searchObject(value, depth + 1);
        }
      }
    }

    searchObject(parsed);
  } catch (err) {
    console.warn('[XBRL Parser] Client-side parse error:', err);
  }

  return metrics;
}

/** Convert raw XBRL metrics to DiscoveredMetrics */
function metricsToDiscovered(
  reitId: string,
  xbrlMetrics: Record<string, number | string>,
  filingDate?: string
): DiscoveredMetrics {
  const result: DiscoveredMetrics = {
    reitId,
    source: Object.keys(xbrlMetrics).length > 0 ? 'xbrl' : 'fallback',
    reviewRequired: Object.keys(xbrlMetrics).length === 0,
    lastSyncedAt: new Date().toISOString(),
    filingDate,
  };

  // Extract tax breakdown components
  const interest = typeof xbrlMetrics.interest === 'number' ? xbrlMetrics.interest : undefined;
  const dividend = typeof xbrlMetrics.dividend === 'number' ? xbrlMetrics.dividend : undefined;
  const amortization = typeof xbrlMetrics.amortization === 'number' ? xbrlMetrics.amortization : undefined;

  if (interest !== undefined || dividend !== undefined || amortization !== undefined) {
    const total = (interest || 0) + (dividend || 0) + (amortization || 0);
    if (total > 0) {
      result.taxBreakdown = {
        interest: interest ? interest / total : 0,
        divExempt: 0, // Would need manual categorization
        divTaxable: dividend ? dividend / total : 0,
        amortization: amortization ? amortization / total : 0,
      };
    }
  }

  if (typeof xbrlMetrics.occupancy === 'number') {
    result.occupancy = xbrlMetrics.occupancy > 1 ? xbrlMetrics.occupancy : xbrlMetrics.occupancy * 100;
  }

  if (typeof xbrlMetrics.wale === 'number') {
    result.wale = xbrlMetrics.wale;
  }

  if (typeof xbrlMetrics.ltv === 'number') {
    result.ltv = xbrlMetrics.ltv > 1 ? xbrlMetrics.ltv : xbrlMetrics.ltv * 100;
  }

  if (typeof xbrlMetrics.totalDistribution === 'number') {
    result.totalDistribution = xbrlMetrics.totalDistribution;
  }

  // If most fields are missing, flag for review
  const extractedCount = [result.occupancy, result.wale, result.ltv, result.totalDistribution, result.taxBreakdown]
    .filter(v => v !== undefined).length;
  if (extractedCount < 2) {
    result.reviewRequired = true;
  }

  return result;
}

/**
 * Main data discovery function — fetches BSE filings and extracts metrics
 */
export async function discoverREITData(
  reitIds?: string[],
  parseXbrl = true
): Promise<DataDiscoveryResult> {
  const errors: string[] = [];
  const filings: Record<string, BSEFiling[]> = {};
  const metrics: Record<string, DiscoveredMetrics> = {};

  try {
    console.log('[DataDiscovery] Invoking fetch-bse-xbrl edge function...');

    const { data, error } = await supabase.functions.invoke('fetch-bse-xbrl', {
      body: { reitIds, parseXbrl },
    });

    if (error) {
      console.error('[DataDiscovery] Edge function error:', error);
      errors.push(`BSE API error: ${error.message}`);

      return {
        filings: {},
        metrics: getCachedMetrics(),
        errors,
        totalFilings: 0,
        syncedAt: new Date().toISOString(),
      };
    }

    if (!data?.success) {
      errors.push(data?.error || 'Unknown BSE API error');
      return {
        filings: {},
        metrics: getCachedMetrics(),
        errors,
        totalFilings: 0,
        syncedAt: new Date().toISOString(),
      };
    }

    // Process results
    for (const result of data.results || []) {
      const reitId = result.reitId;
      filings[reitId] = result.filings || [];

      if (result.error) {
        errors.push(`${reitId}: ${result.error}`);
      }

      // Extract metrics from server-side XBRL parsing or try client-side
      let xbrlMetrics: Record<string, number | string> = {};

      for (const filing of result.filings || []) {
        if (filing.xbrlMetrics && Object.keys(filing.xbrlMetrics).length > 0) {
          xbrlMetrics = { ...xbrlMetrics, ...filing.xbrlMetrics };
        }
      }

      const latestFiling = result.filings?.[0];
      metrics[reitId] = metricsToDiscovered(
        reitId,
        xbrlMetrics,
        latestFiling?.filingDate
      );
    }

    // Cache results
    const discoveryResult: DataDiscoveryResult = {
      filings,
      metrics,
      errors,
      totalFilings: data.totalFilings || 0,
      syncedAt: new Date().toISOString(),
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(discoveryResult));
    localStorage.setItem(METRICS_KEY, JSON.stringify(metrics));

    console.log(`[DataDiscovery] Complete: ${data.totalFilings} filings, ${Object.keys(metrics).length} REITs processed`);

    return discoveryResult;
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Discovery failed';
    errors.push(msg);
    console.error('[DataDiscovery] Error:', err);

    return {
      filings: {},
      metrics: getCachedMetrics(),
      errors,
      totalFilings: 0,
      syncedAt: new Date().toISOString(),
    };
  }
}

export { parseXBRLMetrics };
