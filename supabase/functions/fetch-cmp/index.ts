const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const TICKERS: Record<string, string> = {
  embassy: 'EMBASSY',
  mindspace: 'MINDSPACE',
  brookfield: 'BIRET',
  nexus: 'NXST',
  // InvITs
  indigrid: 'INDIGRID',
  pginvit: 'PGINVIT',
  irbinvit: 'IRBINVIT',
  nhit: 'NHIT',
  bhinvit: 'BHINVIT',
};

const BSE_SCRIP_CODES: Record<string, string> = {
  embassy: '542602',
  mindspace: '543217',
  brookfield: '543261',
  nexus: '543913',
  // InvITs
  indigrid: '540565',
  pginvit: '543620',
  irbinvit: '541956',
  nhit: '543985',
  bhinvit: '544137',
};

const FALLBACK_CMP: Record<string, number> = {
  embassy: 417.00,
  mindspace: 449.59,
  brookfield: 319.79,
  nexus: 152.60,
  // InvITs - will be populated by first BSE fetch
  indigrid: 165.20,
  pginvit: 94.20,
  irbinvit: 118.65,
  nhit: 205.80,
  bhinvit: 113.00,
};

// Fallback CAGR values (verified Mar 21, 2026)
const FALLBACK_CAGR: Record<string, { growth1Y: number; growth3Y: number | null; growth5Y: number | null }> = {
  embassy:    { growth1Y: 15.9, growth3Y: 11.6, growth5Y: 8.6 },
  mindspace:  { growth1Y: 26.9, growth3Y: 17.6, growth5Y: 12.8 },
  brookfield: { growth1Y: 10.9, growth3Y: 5.3,  growth5Y: null },
  nexus:      { growth1Y: 21.1, growth3Y: null,  growth5Y: null },
  // InvITs
  indigrid:   { growth1Y: 0, growth3Y: null, growth5Y: null },
  pginvit:    { growth1Y: 0, growth3Y: null, growth5Y: null },
  irbinvit:   { growth1Y: 0, growth3Y: null, growth5Y: null },
  nhit:       { growth1Y: 0, growth3Y: null, growth5Y: null },
  bhinvit:    { growth1Y: 0, growth3Y: null, growth5Y: null },
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
 * Fetch historical closing price from NSE for a specific date range.
 * Returns the closing price closest to the target date.
 */
async function fetchNSEHistoricalPrice(symbol: string, targetDate: Date, cookieStr: string): Promise<number | null> {
  try {
    // Search in a 30-day window around the target date
    const from = new Date(targetDate);
    from.setDate(from.getDate() - 15);
    const to = new Date(targetDate);
    to.setDate(to.getDate() + 15);

    const fmt = (d: Date) => `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
    const url = `https://www.nseindia.com/api/historical/cm/equity?symbol=${encodeURIComponent(symbol)}&from=${fmt(from)}&to=${fmt(to)}`;

    const resp = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Referer': 'https://www.nseindia.com/',
        'Cookie': cookieStr,
      },
    });

    if (!resp.ok) return null;
    const data = await resp.json();
    const records = data?.data || [];

    if (records.length === 0) return null;

    // Find record closest to target date
    let bestRecord: any = null;
    let bestDiff = Infinity;
    for (const rec of records) {
      const recDate = new Date(rec.CH_TIMESTAMP || rec.mTIMESTAMP);
      const diff = Math.abs(recDate.getTime() - targetDate.getTime());
      if (diff < bestDiff) {
        bestDiff = diff;
        bestRecord = rec;
      }
    }

    const price = bestRecord?.CH_CLOSING_PRICE || bestRecord?.CLOSE;
    if (price && price > 0) return parseFloat(price);
    return null;
  } catch (err) {
    console.warn(`NSE historical failed for ${symbol}:`, err);
    return null;
  }
}

/**
 * Get NSE session cookies needed for API calls
 */
async function getNSECookies(): Promise<string> {
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
    return cookies.split(',').map(c => c.split(';')[0].trim()).join('; ');
  } catch {
    return '';
  }
}

type HistoricalPrices = { price1YAgo: number | null; price3YAgo: number | null; price5YAgo: number | null };

/**
 * Primary: NSE historical data. Fallback: Yahoo Finance chart API.
 */
async function fetchHistoricalPrices(symbol: string, nseCookies: string): Promise<HistoricalPrices & { source: string }> {
  const now = new Date();
  const date1YAgo = new Date(now); date1YAgo.setFullYear(date1YAgo.getFullYear() - 1);
  const date3YAgo = new Date(now); date3YAgo.setFullYear(date3YAgo.getFullYear() - 3);
  const date5YAgo = new Date(now); date5YAgo.setFullYear(date5YAgo.getFullYear() - 5);

  // Try NSE first
  if (nseCookies) {
    try {
      const [p1, p3, p5] = await Promise.all([
        fetchNSEHistoricalPrice(symbol, date1YAgo, nseCookies),
        fetchNSEHistoricalPrice(symbol, date3YAgo, nseCookies),
        fetchNSEHistoricalPrice(symbol, date5YAgo, nseCookies),
      ]);

      if (p1 !== null) {
        console.log(`[Historical-NSE] ${symbol}: 1Y=₹${p1}, 3Y=₹${p3}, 5Y=₹${p5}`);
        return { price1YAgo: p1, price3YAgo: p3, price5YAgo: p5, source: 'NSE' };
      }
    } catch (err) {
      console.warn(`NSE historical batch failed for ${symbol}:`, err);
    }
  }

  // Fallback to Yahoo Finance
  try {
    const ticker = `${symbol}.NS`;
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1mo&range=5y`;
    const resp = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      },
    });

    if (!resp.ok) return { price1YAgo: null, price3YAgo: null, price5YAgo: null, source: 'none' };

    const data = await resp.json();
    const result = data?.chart?.result?.[0];
    if (!result) return { price1YAgo: null, price3YAgo: null, price5YAgo: null, source: 'none' };

    const timestamps: number[] = result.timestamp || [];
    const closes: (number | null)[] = result.indicators?.quote?.[0]?.close || [];
    if (timestamps.length === 0) return { price1YAgo: null, price3YAgo: null, price5YAgo: null, source: 'none' };

    const nowMs = Date.now();
    const oneYearMs = 365.25 * 24 * 60 * 60 * 1000;

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
      if (bestIdx >= 0 && bestDiff < 45 * 24 * 60 * 60 * 1000) return closes[bestIdx]!;
      return null;
    }

    const price1YAgo = findClosestPrice(nowMs - 1 * oneYearMs);
    const price3YAgo = findClosestPrice(nowMs - 3 * oneYearMs);
    const price5YAgo = findClosestPrice(nowMs - 5 * oneYearMs);

    console.log(`[Historical-Yahoo] ${symbol}: 1Y=₹${price1YAgo}, 3Y=₹${price3YAgo}, 5Y=₹${price5YAgo}`);
    return { price1YAgo, price3YAgo, price5YAgo, source: 'Yahoo' };
  } catch (err) {
    console.warn(`Yahoo historical failed for ${symbol}:`, err);
    return { price1YAgo: null, price3YAgo: null, price5YAgo: null, source: 'none' };
  }
}

/**
 * Primary source: NSE India API (uses shared cookies)
 */
async function fetchFromNSE(symbol: string, cookieStr: string): Promise<number | null> {
  try {
    if (!cookieStr) return null;
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

/**
 * Primary source: BSE India equity quote API
 */
async function fetchFromBSE(scripCode: string): Promise<number | null> {
  try {
    const url = `https://api.bseindia.com/BseIndiaAPI/api/getScripHeaderData/w?Ession_id=&scripcode=${scripCode}&seression_id=`;
    const resp = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Referer': 'https://www.bseindia.com/',
        'Origin': 'https://www.bseindia.com',
      },
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    const header = data?.Header;
    const priceStr = header?.LTP || header?.CurrRate?.CurrPrice;
    if (priceStr) {
      const price = parseFloat(String(priceStr).replace(/,/g, ''));
      if (price > 0 && price < 10000) return price;
    }
    return null;
  } catch (err) {
    console.warn(`BSE failed for scrip ${scripCode}:`, err);
    return null;
  }
}

async function fetchPrice(reitId: string, symbol: string, nseCookies: string): Promise<PriceResult> {
  const now = new Date().toISOString();
  const fallbackCagr = FALLBACK_CAGR[reitId] || { growth1Y: 0, growth3Y: null, growth5Y: null };
  const scripCode = BSE_SCRIP_CODES[reitId];

  // Fetch current price: BSE → NSE → Yahoo → Google → Fallback
  const sources = [
    { name: 'BSE', fn: () => fetchFromBSE(scripCode) },
    { name: 'NSE', fn: () => fetchFromNSE(symbol, nseCookies) },
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

  // Fetch historical prices for CAGR: NSE first, Yahoo fallback
  const historical = await fetchHistoricalPrices(symbol, nseCookies);
  let growth1Y = fallbackCagr.growth1Y;
  let growth3Y = fallbackCagr.growth3Y;
  let growth5Y = fallbackCagr.growth5Y;
  let cagrSource = 'fallback';

  if (historical.price1YAgo) {
    growth1Y = Math.round(calcCAGR(historical.price1YAgo, cmp, 1) * 10) / 10;
    cagrSource = historical.source;
  }
  if (historical.price3YAgo) {
    growth3Y = Math.round(calcCAGR(historical.price3YAgo, cmp, 3) * 10) / 10;
  }
  if (historical.price5YAgo) {
    growth5Y = Math.round(calcCAGR(historical.price5YAgo, cmp, 5) * 10) / 10;
  }

  console.log(`[CAGR] ${reitId}: 1Y=${growth1Y}%, 3Y=${growth3Y}%, 5Y=${growth5Y}% (CMP source: ${priceSource}, CAGR source: ${cagrSource})`);

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
    // Get NSE session cookies once, share across all fetches
    console.log('[Init] Getting NSE session cookies...');
    const nseCookies = await getNSECookies();
    console.log(`[Init] NSE cookies: ${nseCookies ? 'obtained' : 'failed'}`);

    const pricePromises = Object.entries(TICKERS).map(([reitId, symbol]) =>
      fetchPrice(reitId, symbol, nseCookies)
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
