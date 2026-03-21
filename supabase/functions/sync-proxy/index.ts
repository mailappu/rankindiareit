const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const PDF_SOURCES = [
  {
    reitId: 'embassy',
    label: 'Embassy Q3 FY26',
    url: 'https://eopwebsvr.blob.core.windows.net/media/filer_public/4f/0c/4f0c413c-e92b-4a7c-9cc3-aff0d5969332/earnings_presentation.pdf',
  },
  {
    reitId: 'mindspace',
    label: 'Mindspace Investor Presentation',
    url: 'https://www.mindspacereit.com/wp-content/uploads/2025/11/Investor-Presentation.pdf',
  },
  {
    reitId: 'brookfield',
    label: 'Brookfield Q3 FY26',
    url: 'https://www.brookfieldindiareit.in/investors/reports-and-filings',
  },
  {
    reitId: 'nexus',
    label: 'Nexus Dec-25',
    url: 'https://www.nexusselecttrust.com/resources/assets/pdf/Nexus-Select-Trust-Dec-25-vf.pdf',
  },
];

interface SourceMetadata {
  reitId: string;
  label: string;
  contentLength: string | null;
  lastModified: string | null;
  error: string | null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const results: SourceMetadata[] = [];

    // Fetch HEAD metadata for all PDF sources in parallel
    const promises = PDF_SOURCES.map(async (source) => {
      try {
        const response = await fetch(source.url, {
          method: 'HEAD',
          redirect: 'follow',
          headers: {
            'User-Agent': 'SmartREITAnalyst/1.0',
          },
        });

        return {
          reitId: source.reitId,
          label: source.label,
          contentLength: response.headers.get('content-length'),
          lastModified: response.headers.get('last-modified'),
          error: null,
        };
      } catch (err) {
        return {
          reitId: source.reitId,
          label: source.label,
          contentLength: null,
          lastModified: null,
          error: err instanceof Error ? err.message : 'Unknown error',
        };
      }
    });

    const metadata = await Promise.all(promises);

    // Also try to fetch live G-Sec yield
    let gsecYield: number | null = null;
    try {
      const gsecResp = await fetch(
        'https://www.worldgovernmentbonds.com/bond-historical-data/india/10-years/',
        { headers: { 'User-Agent': 'SmartREITAnalyst/1.0' } }
      );
      const html = await gsecResp.text();
      // Look for the yield value in the page's data table — typically in a pattern like ">6.74%<"
      // or "Yield: 6.74%" or within a td element. Try multiple patterns.
      const patterns = [
        /Current Yield[^>]*>[\s]*(\d+\.\d+)\s*%/i,
        /class="[^"]*yield[^"]*"[^>]*>[\s]*(\d+\.\d+)\s*%/i,
        /<td[^>]*>[\s]*(\d\.\d{2,3})[\s]*%[\s]*<\/td>/i,
      ];
      for (const pattern of patterns) {
        const match = html.match(pattern);
        if (match) {
          const parsed = parseFloat(match[1]);
          if (parsed >= 5.5 && parsed <= 7.5) {
            gsecYield = parsed;
            break;
          }
        }
      }
      // If specific patterns fail, don't fall back to generic regex — return null
    } catch {
      // Fallback handled on frontend
    }

    return new Response(
      JSON.stringify({
        success: true,
        metadata,
        gsecYield,
        timestamp: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Sync proxy error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
