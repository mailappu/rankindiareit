const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const TICKERS: Record<string, string> = {
  embassy: 'EMBASSY',
  mindspace: 'MINDSPACE',
  brookfield: 'BIRET',
  nexus: 'NXST',
};

const FALLBACK_CMP: Record<string, number> = {
  embassy: 417.00,
  mindspace: 449.59,
  brookfield: 319.79,
  nexus: 152.60,
};

interface PriceResult {
  reitId: string;
  ticker: string;
  cmp: number;
  isLive: boolean;
  fetchedAt: string;
  error: string | null;
  source: string;
}

/**
 * Primary source: NSE India API
 * Requires a session cookie obtained by first hitting the main page
 */
async function fetchFromNSE(symbol: string): Promise<number | null> {
  try {
    // Step 1: Get session cookies from NSE homepage
    const homeResp = await fetch('https://www.nseindia.com', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      redirect: 'follow',
    });

    // Extract cookies from response
    const cookies = homeResp.headers.get('set-cookie') || '';
    const cookieStr = cookies.split(',').map(c => c.split(';')[0].trim()).join('; ');

    // Step 2: Fetch quote with session cookies
    const url = `https://www.nseindia.com/api/quote-equity?symbol=${encodeURIComponent(symbol)}`;
    const resp = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.5',
        'Referer': 'https://www.nseindia.com/',
        'Cookie': cookieStr,
      },
    });

    if (!resp.ok) {
      console.warn(`NSE API returned ${resp.status} for ${symbol}`);
      return null;
    }

    const data = await resp.json();
    const price = data?.priceInfo?.lastPrice;
    if (price && typeof price === 'number' && price > 0 && price < 10000) {
      return price;
    }
    return null;
  } catch (err) {
    console.warn(`NSE India failed for ${symbol}:`, err);
    return null;
  }
}

/**
 * Secondary source: Yahoo Finance v8 chart API
 * Includes staleness check — rejects prices with regularMarketTime older than 7 days
 */
async function fetchFromYahoo(symbol: string): Promise<number | null> {
  try {
    const ticker = `${symbol}.NS`;
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1d`;
    const resp = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      },
    });
    if (!resp.ok) {
      await resp.text();
      return null;
    }
    const data = await resp.json();
    const meta = data?.chart?.result?.[0]?.meta;
    const price = meta?.regularMarketPrice;

    // Staleness check: reject if regularMarketTime is more than 7 days old
    if (meta?.regularMarketTime) {
      const marketTime = meta.regularMarketTime * 1000; // Convert to ms
      const now = Date.now();
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
      if (now - marketTime > sevenDaysMs) {
        console.warn(`Yahoo data for ${symbol} is stale (market time: ${new Date(marketTime).toISOString()}), skipping`);
        return null;
      }
    }

    if (price && price > 0 && price < 10000) return price;
    return null;
  } catch (err) {
    console.warn(`Yahoo Finance failed for ${symbol}:`, err);
    return null;
  }
}

/**
 * Tertiary source: Google Finance HTML scraping
 */
async function fetchFromGoogleFinance(symbol: string): Promise<number | null> {
  try {
    const url = `https://www.google.com/finance/quote/${symbol}:NSE`;
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      redirect: 'follow',
    });
    if (!resp.ok) {
      await resp.text();
      return null;
    }
    const html = await resp.text();
    const patterns = [
      /data-last-price="(\d+\.?\d*)"/,
      /class="YMlKec fxKbKc"[^>]*>₹?([\d,]+\.?\d*)</,
      /class="[^"]*fxKbKc[^"]*"[^>]*>₹?([\d,]+\.?\d*)</,
    ];
    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match) {
        const price = parseFloat(match[1].replace(/,/g, ''));
        if (price > 0 && price < 10000) return price;
      }
    }
    return null;
  } catch (err) {
    console.warn(`Google Finance failed for ${symbol}:`, err);
    return null;
  }
}

async function fetchPrice(reitId: string, symbol: string): Promise<PriceResult> {
  const now = new Date().toISOString();

  const sources = [
    { name: 'NSE', fn: () => fetchFromNSE(symbol) },
    { name: 'Yahoo', fn: () => fetchFromYahoo(symbol) },
    { name: 'Google', fn: () => fetchFromGoogleFinance(symbol) },
  ];

  for (const source of sources) {
    try {
      const price = await source.fn();
      if (price !== null) {
        console.log(`✓ ${reitId} price from ${source.name}: ₹${price}`);
        return { reitId, ticker: `${symbol}.NS`, cmp: price, isLive: true, fetchedAt: now, error: null, source: source.name };
      }
    } catch (err) {
      console.warn(`${source.name} failed for ${reitId}:`, err);
    }
  }

  // Fallback
  console.log(`✗ ${reitId}: all sources failed, using fallback ₹${FALLBACK_CMP[reitId]}`);
  return {
    reitId,
    ticker: `${symbol}.NS`,
    cmp: FALLBACK_CMP[reitId] ?? 0,
    isLive: false,
    fetchedAt: now,
    error: 'Live price unavailable. Using latest verified closing price.',
    source: 'fallback',
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const pricePromises = Object.entries(TICKERS).map(([reitId, symbol]) =>
      fetchPrice(reitId, symbol)
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
