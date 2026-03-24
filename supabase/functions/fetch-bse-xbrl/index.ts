const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// BSE scrip codes for Indian REITs
const BSE_SCRIP_CODES: Record<string, string> = {
  // REITs
  embassy: '542602',
  mindspace: '543217',
  brookfield: '543261',
  nexus: '543913',
  // InvITs
  indigrid: '540565',
  pginvit: '543620',
  irbinvit: '541956',
  nhit: '543985',
  bhinvit: '544173',
};

const ENTITY_NAMES: Record<string, string> = {
  embassy: 'Embassy Office Parks REIT',
  mindspace: 'Mindspace Business Parks REIT',
  brookfield: 'Brookfield India Real Estate Trust',
  nexus: 'Nexus Select Trust',
  indigrid: 'IndiGrid Infrastructure Trust',
  pginvit: 'PowerGrid Infrastructure InvIT',
  irbinvit: 'IRB InvIT Fund',
  nhit: 'National Highways Infra Trust',
  bhinvit: 'Bharat Highways InvIT',
};

interface BSEAnnouncement {
  NEWS_DT: string;
  NEWSSUB: string;
  ATTACHMENTNAME: string;
  NSESSION_URL?: string;
  CATEGORYNAME: string;
  SUBCATEGORYNAME?: string;
  News_submission_dt: string;
  SCRIP_CD: string;
  SLONGNAME: string;
  HEADLINE?: string;
}

interface XBRLFiling {
  reitId: string;
  reitName: string;
  filingDate: string;
  subject: string;
  category: string;
  attachmentUrl: string | null;
  xbrlUrl: string | null;
  submissionTime: string;
  rawAnnouncement?: BSEAnnouncement;
}

interface FetchResult {
  reitId: string;
  filings: XBRLFiling[];
  error: string | null;
  fetchedAt: string;
}

/**
 * Fetch corporate announcements from BSE India API
 * Target: XBRL filings, Financial Results, Corporate Actions (distribution)
 */
async function fetchBSEAnnouncements(
  reitId: string,
  scripCode: string,
  fromDate: string,
  toDate: string,
  categories: string[] = ['Result', 'Corp. Action', 'Company Update']
): Promise<XBRLFiling[]> {
  const filings: XBRLFiling[] = [];

  for (const category of categories) {
    try {
      // BSE API endpoint for announcements
      const url = `https://api.bseindia.com/BseIndiaAPI/api/AnnSubCategoryGetData/w?pageno=1&strCat=${encodeURIComponent(category)}&strPrevDate=${encodeURIComponent(fromDate)}&strScrip=${scripCode}&strSearch=P&strToDate=${encodeURIComponent(toDate)}&strType=C`;

      console.log(`[BSE] Fetching ${category} for ${reitId} (scrip: ${scripCode})`);

      const resp = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json',
          'Referer': 'https://www.bseindia.com/corporates/ann.html',
          'Origin': 'https://www.bseindia.com',
        },
      });

      if (!resp.ok) {
        console.warn(`[BSE] ${category} fetch failed for ${reitId}: HTTP ${resp.status}`);
        continue;
      }

      const data = await resp.json();
      const announcements: BSEAnnouncement[] = data?.Table || [];

      console.log(`[BSE] Found ${announcements.length} ${category} announcements for ${reitId}`);

      for (const ann of announcements) {
        const subject = (ann.NEWSSUB || '').toLowerCase();

        // Filter for relevant filings:
        // - Financial results
        // - Distribution/dividend announcements
        // - XBRL filings
        const isRelevant =
          subject.includes('financial result') ||
          subject.includes('distribution') ||
          subject.includes('dividend') ||
          subject.includes('xbrl') ||
          subject.includes('outcome of board') ||
          subject.includes('quarterly') ||
          subject.includes('interest') ||
          subject.includes('amortization') ||
          subject.includes('repayment');

        if (!isRelevant) continue;

        // Extract attachment URL
        let attachmentUrl: string | null = null;
        let xbrlUrl: string | null = null;

        if (ann.ATTACHMENTNAME) {
          attachmentUrl = `https://www.bseindia.com/xml-data/corpfiling/AttachHis/${ann.ATTACHMENTNAME}`;

          // Check if it's an XBRL file (XML or ZIP)
          const attachLower = ann.ATTACHMENTNAME.toLowerCase();
          if (attachLower.endsWith('.xml') || attachLower.endsWith('.zip') || attachLower.endsWith('.xbrl')) {
            xbrlUrl = attachmentUrl;
          }
        }

        filings.push({
          reitId,
          reitName: ENTITY_NAMES[reitId] || reitId,
          filingDate: ann.NEWS_DT,
          subject: ann.NEWSSUB || '',
          category: ann.CATEGORYNAME || category,
          attachmentUrl,
          xbrlUrl,
          submissionTime: ann.News_submission_dt || '',
          rawAnnouncement: ann,
        });
      }
    } catch (err) {
      console.error(`[BSE] Error fetching ${category} for ${reitId}:`, err);
    }
  }

  // Sort by date, most recent first
  filings.sort((a, b) => new Date(b.filingDate).getTime() - new Date(a.filingDate).getTime());

  return filings;
}

/**
 * Try to fetch and parse XBRL content from a filing attachment.
 * Returns extracted metrics if successful.
 */
async function fetchXBRLContent(url: string): Promise<{
  rawXml: string | null;
  metrics: Record<string, string | number>;
  error: string | null;
}> {
  try {
    const resp = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': '*/*',
      },
    });

    if (!resp.ok) {
      return { rawXml: null, metrics: {}, error: `HTTP ${resp.status}` };
    }

    const contentType = resp.headers.get('content-type') || '';
    const text = await resp.text();

    // If it's XML/XBRL, try to extract key tags
    if (contentType.includes('xml') || text.trim().startsWith('<?xml') || text.trim().startsWith('<xbrl')) {
      const metrics: Record<string, string | number> = {};

      // XBRL tag patterns for REIT-relevant data
      const tagPatterns: Record<string, RegExp[]> = {
        interest: [
          /<[^:]*:?Interest[^>]*>([^<]+)/i,
          /<[^:]*:?InterestIncome[^>]*>([^<]+)/i,
          /<[^:]*:?InterestDistribution[^>]*>([^<]+)/i,
        ],
        dividend: [
          /<[^:]*:?Dividend[^>]*>([^<]+)/i,
          /<[^:]*:?DividendIncome[^>]*>([^<]+)/i,
          /<[^:]*:?DividendDistribution[^>]*>([^<]+)/i,
        ],
        amortization: [
          /<[^:]*:?RepaymentOfDebt[^>]*>([^<]+)/i,
          /<[^:]*:?Amortization[^>]*>([^<]+)/i,
          /<[^:]*:?AmortisationOfSPV[^>]*>([^<]+)/i,
        ],
        occupancy: [
          /<[^:]*:?OccupancyRate[^>]*>([^<]+)/i,
          /<[^:]*:?Occupancy[^>]*>([^<]+)/i,
        ],
        wale: [
          /<[^:]*:?WeightedAverageLeaseExpiry[^>]*>([^<]+)/i,
          /<[^:]*:?WALE[^>]*>([^<]+)/i,
        ],
        totalDistribution: [
          /<[^:]*:?TotalDistribution[^>]*>([^<]+)/i,
          /<[^:]*:?DistributionPerUnit[^>]*>([^<]+)/i,
        ],
        ltv: [
          /<[^:]*:?LoanToValue[^>]*>([^<]+)/i,
          /<[^:]*:?NetDebtToGAV[^>]*>([^<]+)/i,
          /<[^:]*:?LTV[^>]*>([^<]+)/i,
        ],
        // InvIT-specific tags
        assetAvailability: [
          /<[^:]*:?AssetAvailability[^>]*>([^<]+)/i,
          /<[^:]*:?Availability[^>]*>([^<]+)/i,
          /<[^:]*:?PlantAvailability[^>]*>([^<]+)/i,
          /<[^:]*:?SystemAvailability[^>]*>([^<]+)/i,
        ],
        concessionLife: [
          /<[^:]*:?RemainingConcessionLife[^>]*>([^<]+)/i,
          /<[^:]*:?ConcessionPeriod[^>]*>([^<]+)/i,
          /<[^:]*:?RemainingLife[^>]*>([^<]+)/i,
          /<[^:]*:?UsefulLife[^>]*>([^<]+)/i,
        ],
        tollCollection: [
          /<[^:]*:?TollCollection[^>]*>([^<]+)/i,
          /<[^:]*:?TollRevenue[^>]*>([^<]+)/i,
        ],
      };

      for (const [key, patterns] of Object.entries(tagPatterns)) {
        for (const pattern of patterns) {
          const match = text.match(pattern);
          if (match) {
            const val = match[1].trim();
            const num = parseFloat(val);
            metrics[key] = isNaN(num) ? val : num;
            break;
          }
        }
      }

      console.log(`[XBRL] Extracted ${Object.keys(metrics).length} metrics from ${url}`);

      // Return first 5000 chars of XML for client-side parsing
      return {
        rawXml: text.substring(0, 5000),
        metrics,
        error: null,
      };
    }

    return { rawXml: null, metrics: {}, error: 'Not XML/XBRL content' };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return { rawXml: null, metrics: {}, error: msg };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const {
      reitIds = Object.keys(BSE_SCRIP_CODES),
      fromDate,
      toDate,
      parseXbrl = false,
    } = body as {
      reitIds?: string[];
      fromDate?: string;
      toDate?: string;
      parseXbrl?: boolean;
    };

    // Default date range: last 6 months
    const now = new Date();
    const sixMonthsAgo = new Date(now);
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const fmt = (d: Date) =>
      `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;

    const effectiveFrom = fromDate || fmt(sixMonthsAgo);
    const effectiveTo = toDate || fmt(now);

    console.log(`[BSE XBRL] Fetching filings from ${effectiveFrom} to ${effectiveTo} for: ${reitIds.join(', ')}`);

    const results: FetchResult[] = [];

    // Fetch announcements for each REIT
    const fetchPromises = reitIds
      .filter(id => BSE_SCRIP_CODES[id])
      .map(async (reitId) => {
        try {
          const filings = await fetchBSEAnnouncements(
            reitId,
            BSE_SCRIP_CODES[reitId],
            effectiveFrom,
            effectiveTo
          );

          // Optionally parse XBRL content from the first XML filing
          if (parseXbrl) {
            for (const filing of filings) {
              if (filing.xbrlUrl) {
                console.log(`[BSE XBRL] Parsing XBRL from ${filing.xbrlUrl}`);
                const xbrlResult = await fetchXBRLContent(filing.xbrlUrl);
                (filing as any).xbrlMetrics = xbrlResult.metrics;
                (filing as any).xbrlError = xbrlResult.error;
                // Only parse first XBRL file per REIT
                break;
              }
            }
          }

          return {
            reitId,
            filings,
            error: null,
            fetchedAt: new Date().toISOString(),
          };
        } catch (err) {
          return {
            reitId,
            filings: [],
            error: err instanceof Error ? err.message : 'Fetch failed',
            fetchedAt: new Date().toISOString(),
          };
        }
      });

    const fetchResults = await Promise.all(fetchPromises);
    results.push(...fetchResults);

    const totalFilings = results.reduce((sum, r) => sum + r.filings.length, 0);
    console.log(`[BSE XBRL] Total: ${totalFilings} filings across ${results.length} REITs`);

    return new Response(
      JSON.stringify({
        success: true,
        results,
        totalFilings,
        dateRange: { from: effectiveFrom, to: effectiveTo },
        timestamp: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[BSE XBRL] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
