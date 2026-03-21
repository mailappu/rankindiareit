const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const TICKERS: Record<string, string> = {
  embassy: 'EMBASSY.NS',
  mindspace: 'MINDSPACE.NS',
  brookfield: 'BIRET.NS',
  nexus: 'NXST.NS',
};

const FALLBACK_CMP: Record<string, number> = {
  embassy: 416.68,
  mindspace: 457.02,
  brookfield: 327.24,
  nexus: 154.68,
};

interface PriceResult {
  reitId: string;
  ticker: string;
  cmp: number;
  isLive: boolean;
  fetchedAt: string;
  error: string | null;
}

async function fetchPrice(reitId: string, ticker: string): Promise<PriceResult> {
  const now = new Date().toISOString();

  // Try Google Finance scraping approach
  try {
    const url = `https://www.google.com/finance/quote/${ticker.replace('.NS', '')}:NSE`;
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      redirect: 'follow',
    });

    if (resp.ok) {
      const html = await resp.text();
      // Google Finance puts the price in a div with data-last-price attribute
      const pricePatterns = [
        /data-last-price="(\d+\.?\d*)"/,
        /class="YMlKec fxKbKc"[^>]*>₹?([\d,]+\.?\d*)</,
        /class="[^"]*fxKbKc[^"]*"[^>]*>₹?([\d,]+\.?\d*)</,
      ];

      for (const pattern of pricePatterns) {
        const match = html.match(pattern);
        if (match) {
          const price = parseFloat(match[1].replace(/,/g, ''));
          if (price > 0 && price < 10000) {
            return { reitId, ticker, cmp: price, isLive: true, fetchedAt: now, error: null };
          }
        }
      }
    }
  } catch (err) {
    console.warn(`Google Finance fetch failed for ${ticker}:`, err);
  }

  // Fallback to hardcoded verified prices
  return {
    reitId,
    ticker,
    cmp: FALLBACK_CMP[reitId] ?? 0,
    isLive: false,
    fetchedAt: now,
    error: 'Live price unavailable. Using verified Mar 21 closing price.',
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const pricePromises = Object.entries(TICKERS).map(([reitId, ticker]) =>
      fetchPrice(reitId, ticker)
    );

    const prices = await Promise.all(pricePromises);

    return new Response(
      JSON.stringify({
        success: true,
        prices,
        timestamp: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('CMP fetch error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
