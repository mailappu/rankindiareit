import { useState } from 'react';
import { ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';

const TERMS = [
  {
    term: 'Occupancy Rate',
    short: 'How full is the property?',
    detail: 'The percentage of total leasable area currently occupied by tenants. Higher occupancy means stable rental income and strong demand. Below 85% may signal tenant exits or oversupply in the micro-market.',
    good: '> 90%',
    color: 'text-terminal-green',
  },
  {
    term: 'WALE (Weighted Average Lease Expiry)',
    short: 'How long are tenants locked in?',
    detail: 'The average remaining lease term across all tenants, weighted by the area they occupy. A higher WALE means predictable cash flows for longer. Office REITs typically have 5–8 year WALEs, while retail (malls) naturally run shorter at 3–5 years.',
    good: '> 5 years (Office), > 3 years (Retail)',
    color: 'text-terminal-blue',
  },
  {
    term: 'LTV (Loan-to-Value)',
    short: 'How leveraged is the REIT?',
    detail: 'Total debt divided by total asset value. A lower LTV means less financial risk — the REIT owns more of its assets outright. SEBI mandates Indian REITs maintain LTV below 49%. Below 30% is considered conservative and leaves room for acquisitions.',
    good: '< 30%',
    color: 'text-terminal-amber',
  },
  {
    term: 'NAV (Net Asset Value)',
    short: 'What is the REIT actually worth?',
    detail: 'The appraised value of all properties minus liabilities, divided by total units. When CMP trades below NAV, the REIT is "undervalued" — you\'re buying ₹1 of real estate for less than ₹1. When CMP exceeds NAV, the market is pricing in growth expectations.',
    good: 'CMP < NAV = Undervalued',
    color: 'text-terminal-cyan',
  },
  {
    term: 'Pipeline',
    short: 'What growth is coming?',
    detail: 'The total area (in million sq ft) of properties under construction or planned for development. A strong pipeline signals future rental income growth and NAV expansion. However, pipeline value depends on location quality, pre-leasing levels, and the REIT\'s track record of on-time delivery.',
    good: 'Higher = more growth potential',
    color: 'text-foreground',
  },
  {
    term: 'Dividend Yield',
    short: 'What income do you earn?',
    detail: 'Annual distribution per unit divided by the current market price. Indian REITs are required to distribute at least 90% of net distributable cash flows. A yield above the G-Sec rate means you\'re earning more than the risk-free government bond, compensating you for equity risk.',
    good: '> G-Sec Yield (6.77%)',
    color: 'text-terminal-green',
  },
];

export function TerminologyCard() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="card-terminal p-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-2">
          <HelpCircle className="h-4 w-4 text-terminal-cyan" />
          <h3 className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Terminology & What to Look For</h3>
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="mt-4 grid grid-cols-2 gap-3">
          {TERMS.map(t => (
            <div key={t.term} className="bg-secondary/50 rounded p-3 space-y-1.5">
              <div className={`font-semibold text-[11px] ${t.color}`}>{t.term}</div>
              <p className="text-[11px] text-foreground font-medium">{t.short}</p>
              <p className="text-[10px] text-muted-foreground leading-relaxed">{t.detail}</p>
              <div className="flex items-center gap-1.5 pt-1 border-t border-border/50">
                <span className="text-[9px] text-muted-foreground uppercase">Healthy:</span>
                <span className="text-[10px] text-terminal-green font-mono">{t.good}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
