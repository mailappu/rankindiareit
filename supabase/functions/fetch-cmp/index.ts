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

// Fallback CAGR values (verified Mar 21, 2026)
const FALLBACK_CAGR: Record<string, { growth1Y: number; growth3Y: number | null; growth5Y: number | null }> = {
  embassy:    { growth1Y: 15.9, growth3Y: 11.6, growth5Y: 8.6 },
  mindspace:  { growth1Y: 26.9, growth3Y: 17.6, growth5Y: 12.8 },
  brookfield: { growth1Y: 10.9, growth3Y: 5.3,  growth5Y: null },
  nexus:      { growth1Y: 21.1, growth3Y: null,  growth5Y: null },
};

interface PriceResult {
  reitId: string;
  ticker: string;
  cmp: number;
  isLive: boolean;
  fetchedAt: string;
  error: string | null;
  source: string;
  growth1Y: number;
  growth3Y: number | null;
  growth5Y: number | null;
  cagrSource: string;
}

/** Calculate CAGR from two prices over N years */
function calcCAGR(startPrice: number, endPrice: number, years: number): number {
  if (startPrice <= 0 || years <= 0) return 0;
  return (Math.pow(endPrice / startPrice, 1 / years) - 1) * 100;
}

/**
 * Fetch historical prices from Yahoo Finance chart API for CAGR calculation.
 * Returns { price1YAgo, price3YAgo, price5YAgo } or nulls.
 */
async function fetchHistoricalPrices(symbol: string): Promise<{
  price1YAgo: number | null;
  price3YAgo: number | null;
  price5YAgo: number | null;
}> {
  try {
    const ticker = `${symbol}.NS`;
    // Fetch 5 years of monthly data
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1mo&range=5y`;
    const resp = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      },
    });

    if (!resp.ok) {
      console.warn(`Yahoo historical returned ${resp.status} for ${symbol}`);
      return { price1YAgo: null, price3YAgo: null, price5YAgo: null };
    }

    const data = await resp.json();
    const result = data?.chart?.result?.[0];
    if (!result) return { price1YAgo: null, price3YAgo: null, price5YAgo: null };

    const timestamps: number[] = result.timestamp || [];
    const closes: (number | null)[] = result.indicators?.quote?.[0]?.close || [];

    if (timestamps.length === 0) return { price1YAgo: null, price3YAgo: null, price5YAgo: null };

    const now = Date.now();
    const oneYearMs = 365.25 * 24 * 60 * 60 * 1000;

    // Find closest price to 1Y, 3Y, 5Y ago
    function findClosestPrice(targetMs: number): number | null {
      let bestIdx = -1;
      let bestDiff = Infinity;
      for (let i = 0; i < timestamps.length; i++) {
        const diff = Math.abs(timestamps[i] * 1000 - targetMs);
        if (diff < bestDiff && closes[i] != null && closes[i]! > 0) {
          bestDiff = diff;
          bestIdx = i;
        }
      }
      // Accept if within 45 days of target
      if (bestIdx >= 0 && bestDiff < 45 * 24 * 60 * 60 * 1000) {
        return closes[bestIdx]!;
      }
      return null;
    }

    const price1YAgo = findClosestPrice(now - 1 * oneYearMs);
    const price3YAgo = findClosestPrice(now - 3 * oneYearMs);
    const price5YAgo = findClosestPrice(now - 5 * oneYearMs);

    console.log(`[Historical] ${symbol}: 1Y ago=₹${price1YAgo}, 3Y ago=₹${price3YAgo}, 5Y ago=₹${price5YAgo}`);
    return { price1YAgo, price3YAgo, price5YAgo };
  } catch (err) {
    console.warn(`Historical price fetch failed for ${symbol}:`, err);
    return { price1YAgo: null, price3YAgo: null, price5YAgo: null };
  }
}

/**
 * Primary source: NSE India API
 */
async function fetchFromNSE(symbol: string): Promise<number | null> {
  try {
    const homeResp = await fetch('https://www.nseindia.com', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      redirect: 'follow',
    });
    const cookies = homeResp.headers.get('set-cookie') || '';
    const cookieStr = cookies.split(',').map(c => c.split(';')[0].trim()).join('; ');

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
    if (!resp.ok) return null;
    const data = await resp.json();
    const price = data?.priceInfo?.lastPrice;
    if (price && typeof price === 'number' && price > 0 && price < 10000) return price;
    return null;
  } catch (err) {
    console.warn(`NSE India failed for ${symbol}:`, err);
    return null;
  }
}

/**
 * Secondary source: Yahoo Finance v8 chart API (current price)
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
    if (!resp.ok) return null;
    const data = await resp.json();
    const meta = data?.chart?.result?.[0]?.meta;
    const price = meta?.regularMarketPrice;

    if (meta?.regularMarketTime) {
      const marketTime = meta.regularMarketTime * 1000;
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
      if (Date.now() - marketTime > sevenDaysMs) {
        console.warn(`Yahoo data for ${symbol} is stale, skipping`);
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
    if (!resp.ok) return null;
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
  const fallbackCagr = FALLBACK_CAGR[reitId] || { growth1Y: 0, growth3Y: null, growth5Y: null };

  // Fetch current price from multiple sources
  const sources = [
    { name: 'NSE', fn: () => fetchFromNSE(symbol) },
    { name: 'Yahoo', fn: () => fetchFromYahoo(symbol) },
    { name: 'Google', fn: () => fetchFromGoogleFinance(symbol) },
  ];

  let currentPrice: number | null = null;
  let priceSource = 'fallback';

  for (const source of sources) {
    try {
      const price = await source.fn();
      if (price !== null) {
        console.log(`✓ ${reitId} price from ${source.name}: ₹${price}`);
        currentPrice = price;
        priceSource = source.name;
        break;
      }
    } catch (err) {
      console.warn(`${source.name} failed for ${reitId}:`, err);
    }
  }

  const cmp = currentPrice ?? FALLBACK_CMP[reitId] ?? 0;
  const isLive = currentPrice !== null;

  // Fetch historical prices for CAGR calculation
  const historical = await fetchHistoricalPrices(symbol);
  let growth1Y = fallbackCagr.growth1Y;
  let growth3Y = fallbackCagr.growth3Y;
  let growth5Y = fallbackCagr.growth5Y;
  let cagrSource = 'fallback';

  if (historical.price1YAgo) {
    growth1Y = Math.round(calcCAGR(historical.price1YAgo, cmp, 1) * 10) / 10;
    cagrSource = 'yahoo-historical';
  }
  if (historical.price3YAgo) {
    growth3Y = Math.round(calcCAGR(historical.price3YAgo, cmp, 3) * 10) / 10;
  }
  if (historical.price5YAgo) {
    growth5Y = Math.round(calcCAGR(historical.price5YAgo, cmp, 5) * 10) / 10;
  }

  console.log(`[CAGR] ${reitId}: 1Y=${growth1Y}%, 3Y=${growth3Y}%, 5Y=${growth5Y}% (source: ${cagrSource})`);

  return {
    reitId,
    ticker: `${symbol}.NS`,
    cmp,
    isLive,
    fetchedAt: now,
    error: isLive ? null : 'Live price unavailable. Using latest verified closing price.',
    source: priceSource,
    growth1Y,
    growth3Y,
    growth5Y,
    cagrSource,
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
