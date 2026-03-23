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

async function fetchFromYahoo(ticker: string): Promise<number | null> {
  try {
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
    const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
    if (price && price > 0 && price < 10000) return price;
    return null;
  } catch (err) {
    console.warn(`Yahoo Finance failed for ${ticker}:`, err);
    return null;
  }
}

async function fetchFromGoogleFinance(ticker: string): Promise<number | null> {
  try {
    const symbol = ticker.replace('.NS', '');
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
    console.warn(`Google Finance failed for ${ticker}:`, err);
    return null;
  }
}

async function fetchFromKoyebAPI(ticker: string): Promise<number | null> {
  try {
    const symbol = ticker.replace('.NS', '');
    const url = `https://military-jobye-haiqstudios-14f59639.koyeb.app/stock/${symbol}`;
    const resp = await fetch(url, {
      headers: { 'Accept': 'application/json' },
    });
    if (!resp.ok) {
      await resp.text();
      return null;
    }
    const data = await resp.json();
    const price = data?.currentPrice || data?.lastPrice || data?.price;
    if (price && typeof price === 'number' && price > 0 && price < 10000) return price;
    // Try parsing string price
    if (price && typeof price === 'string') {
      const parsed = parseFloat(price.replace(/,/g, ''));
      if (parsed > 0 && parsed < 10000) return parsed;
    }
    return null;
  } catch (err) {
    console.warn(`Koyeb API failed for ${ticker}:`, err);
    return null;
  }
}

async function fetchPrice(reitId: string, ticker: string): Promise<PriceResult> {
  const now = new Date().toISOString();

  // Try multiple sources in order
  const sources = [
    { name: 'Yahoo', fn: () => fetchFromYahoo(ticker) },
    { name: 'Koyeb', fn: () => fetchFromKoyebAPI(ticker) },
    { name: 'Google', fn: () => fetchFromGoogleFinance(ticker) },
  ];

  for (const source of sources) {
    try {
      const price = await source.fn();
      if (price !== null) {
        console.log(`✓ ${reitId} price from ${source.name}: ₹${price}`);
        return { reitId, ticker, cmp: price, isLive: true, fetchedAt: now, error: null };
      }
    } catch (err) {
      console.warn(`${source.name} failed for ${reitId}:`, err);
    }
  }

  // Fallback to hardcoded verified prices
  console.log(`✗ ${reitId}: all sources failed, using fallback ₹${FALLBACK_CMP[reitId]}`);
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
