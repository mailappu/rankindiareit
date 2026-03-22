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
    term: 'WALE',
    short: 'How long are tenants locked in?',
    detail: 'The average remaining lease term across all tenants, weighted by area. A higher WALE means predictable cash flows. Office REITs typically have 5–8 year WALEs, retail 3–5 years.',
    good: '> 5Y (Office), > 3Y (Retail)',
    color: 'text-terminal-blue',
  },
  {
    term: 'LTV (Loan-to-Value)',
    short: 'How leveraged is the REIT?',
    detail: 'Total debt divided by total asset value. Lower LTV = less risk. SEBI mandates < 49%. Below 30% is conservative.',
    good: '< 30%',
    color: 'text-terminal-amber',
  },
  {
    term: 'NAV (Net Asset Value)',
    short: 'What is the REIT actually worth?',
    detail: 'Appraised value of all properties minus liabilities, per unit. CMP < NAV = undervalued. CMP > NAV = market pricing in growth.',
    good: 'CMP < NAV = Undervalued',
    color: 'text-terminal-cyan',
  },
  {
    term: 'Pipeline',
    short: 'What growth is coming?',
    detail: 'Total area under construction or planned. Signals future rental income growth and NAV expansion.',
    good: 'Higher = more growth',
    color: 'text-foreground',
  },
  {
    term: 'Dividend Yield',
    short: 'What income do you earn?',
    detail: 'Annual DPU / current market price. Indian REITs must distribute 90%+ of net distributable cash flows. Yield above G-Sec = equity risk premium.',
    good: '> G-Sec (6.77%)',
    color: 'text-terminal-green',
  },
];

export function TerminologyCard() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="card-terminal p-3 sm:p-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-2">
          <HelpCircle className="h-4 w-4 text-terminal-cyan" />
          <h3 className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Terminology</h3>
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
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
