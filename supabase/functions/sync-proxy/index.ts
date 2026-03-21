const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const IR_PAGES = [
  {
    reitId: 'embassy',
    label: 'Embassy Office Parks',
    irUrl: 'https://www.embassyofficeparks.com/investors',
    patterns: [/investor\s*presentation/i, /earnings\s*presentation/i],
    fallbackPdf: 'https://eopwebsvr.blob.core.windows.net/media/filer_public/4f/0c/4f0c413c-e92b-4a7c-9cc3-aff0d5969332/earnings_presentation.pdf',
    fallbackLabel: 'Embassy Q3 FY26 (Cached)',
  },
  {
    reitId: 'mindspace',
    label: 'Mindspace Business Parks',
    irUrl: 'https://www.mindspacereit.com/investor-relations',
    patterns: [/investor\s*presentation/i, /earnings.*presentation/i],
    fallbackPdf: 'https://www.mindspacereit.com/wp-content/uploads/2026/01/Investor-Presentation_Q3-FY26-1.pdf',
    fallbackLabel: 'Mindspace Q3 FY26 (Cached)',
  },
  {
    reitId: 'brookfield',
    label: 'Brookfield India REIT',
    irUrl: 'https://www.brookfieldindiareit.in/investors/reports-and-filings',
    patterns: [/investor\s*presentation/i, /earnings\s*presentation/i],
    fallbackPdf: 'https://media.brookfieldindiareit.in/Brookfield_REIT_Earnings_Jan30_2026_f4421e7b0a.pdf',
    fallbackLabel: 'Brookfield Q3 FY26 (Cached)',
  },
  {
    reitId: 'nexus',
    label: 'Nexus Select Trust',
    irUrl: 'https://www.nexusselecttrust.com/results-publications',
    patterns: [/investor\s*presentation/i, /earnings\s*presentation/i, /nexus.*select.*trust/i],
    fallbackPdf: 'https://www.nexusselecttrust.com/resources/assets/pdf/Nexus-Select-Trust-Dec-25-vf.pdf',
    fallbackLabel: 'Nexus Q3 FY26 (Cached)',
  },
];

// Exclusion patterns - skip these PDFs even if they match the main patterns
const EXCLUSION_PATTERNS = [
  /board\s*outcome/i,
  /board\s*meeting/i,
  /draft/i,
  /standalone\s*financial/i,
  /consolidated\s*financial/i,
  /annual\s*report/i,
  /code\s*of\s*conduct/i,
  /compliance\s*certificate/i,
  /corporate\s*governance/i,
  /scrutinizer/i,
  /postal\s*ballot/i,
  /voting\s*result/i,
  /agm|annual\s*general/i,
];

// Quarter/date keywords sorted by recency (FY26 = Apr 2025 – Mar 2026)
const QUARTER_RECENCY = [
  /fy\s*2027|fy27|2027-28/i,
  /q4\s*fy\s*26|q4\s*fy26|mar.*26|march.*2026|fy26.*annual/i,
  /q3\s*fy\s*26|q3\s*fy26|dec.*25|december.*2025|jan.*2026|january.*2026/i,
  /q2\s*fy\s*26|q2\s*fy26|sep.*25|september.*2025/i,
  /q1\s*fy\s*26|q1\s*fy26|jun.*25|june.*2025/i,
  /fy\s*2025|fy25|2024-25/i,
];

interface DiscoveredPDF {
  reitId: string;
  label: string;
  pdfUrl: string;
  discoveredFrom: 'scrape' | 'fallback';
  contentLength: string | null;
  lastModified: string | null;
  error: string | null;
}

async function discoverPdf(source: typeof IR_PAGES[number]): Promise<DiscoveredPDF> {
  try {
    const resp = await fetch(source.irUrl, {
      headers: { 'User-Agent': 'SmartREITAnalyst/1.0' },
      redirect: 'follow',
    });

    if (!resp.ok) {
      return fallback(source, `IR page returned HTTP ${resp.status}`);
    }

    const html = await resp.text();

    const linkRegex = /<a\s[^>]*href\s*=\s*["']([^"']*\.pdf[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;
    const candidates: { href: string; text: string; recencyRank: number }[] = [];

    let match: RegExpExecArray | null;
    while ((match = linkRegex.exec(html)) !== null) {
      const href = match[1];
      const linkText = match[2].replace(/<[^>]*>/g, '').trim();
      const combined = `${linkText} ${href}`;

      // Skip excluded content
      if (EXCLUSION_PATTERNS.some(p => p.test(combined))) continue;

      // Check if this link matches any of our patterns
      const matchesPattern = source.patterns.some(p => p.test(combined));
      if (!matchesPattern) continue;

      // Score by quarter recency
      let recencyRank = QUARTER_RECENCY.length + 1;
      for (let i = 0; i < QUARTER_RECENCY.length; i++) {
        if (QUARTER_RECENCY[i].test(combined)) {
          recencyRank = i;
          break;
        }
      }

      // Resolve relative URLs
      let resolvedHref = href;
      if (href.startsWith('/')) {
        const urlObj = new URL(source.irUrl);
        resolvedHref = `${urlObj.origin}${href}`;
      } else if (!href.startsWith('http')) {
        const base = source.irUrl.substring(0, source.irUrl.lastIndexOf('/') + 1);
        resolvedHref = `${base}${href}`;
      }

      candidates.push({ href: resolvedHref, text: linkText, recencyRank });
    }

    if (candidates.length === 0) {
      return fallback(source, 'No matching presentation PDF found on IR page');
    }

    candidates.sort((a, b) => a.recencyRank - b.recencyRank);
    const best = candidates[0];

    console.log(`Discovered PDF for ${source.reitId}: ${best.href} (text: "${best.text}")`);

    const headResult = await headCheck(best.href);

    return {
      reitId: source.reitId,
      label: best.text || source.label,
      pdfUrl: best.href,
      discoveredFrom: 'scrape',
      contentLength: headResult.contentLength,
      lastModified: headResult.lastModified,
      error: headResult.error,
    };
  } catch (err) {
    console.error(`Discovery error for ${source.reitId}:`, err);
    return fallback(source, err instanceof Error ? err.message : 'Unknown discovery error');
  }
}

async function headCheck(url: string): Promise<{ contentLength: string | null; lastModified: string | null; error: string | null }> {
  try {
    const resp = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      headers: { 'User-Agent': 'SmartREITAnalyst/1.0' },
    });
    return {
      contentLength: resp.headers.get('content-length'),
      lastModified: resp.headers.get('last-modified'),
      error: resp.ok ? null : `HEAD returned ${resp.status}`,
    };
  } catch (err) {
    return {
      contentLength: null,
      lastModified: null,
      error: err instanceof Error ? err.message : 'HEAD check failed',
    };
  }
}

function fallback(source: typeof IR_PAGES[number], reason: string): DiscoveredPDF {
  return {
    reitId: source.reitId,
    label: source.fallbackLabel,
    pdfUrl: source.fallbackPdf,
    discoveredFrom: 'fallback',
    contentLength: null,
    lastModified: null,
    error: `Discovery fallback: ${reason}. Using cached URL.`,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const discoveryPromises = IR_PAGES.map(source => discoverPdf(source));

    const gsecPromise = (async (): Promise<number | null> => {
      try {
        const gsecResp = await fetch(
          'https://www.worldgovernmentbonds.com/bond-historical-data/india/10-years/',
          { headers: { 'User-Agent': 'SmartREITAnalyst/1.0' } }
        );
        const html = await gsecResp.text();
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
              return parsed;
            }
          }
        }
        return null;
      } catch {
        return null;
      }
    })();

    const [discovered, gsecYield] = await Promise.all([
      Promise.all(discoveryPromises),
      gsecPromise,
    ]);

    const metadata = discovered.map(d => ({
      reitId: d.reitId,
      label: d.label,
      pdfUrl: d.pdfUrl,
      discoveredFrom: d.discoveredFrom,
      contentLength: d.contentLength,
      lastModified: d.lastModified,
      error: d.error && !d.error.startsWith('Discovery fallback') ? d.error : null,
      warning: d.error?.startsWith('Discovery fallback') ? d.error : null,
    }));

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
