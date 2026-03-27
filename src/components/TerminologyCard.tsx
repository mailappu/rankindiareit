import { useState } from 'react';
import { ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';

interface Term {
  term: string;
  short: string;
  detail: string;
  good: string;
  color: string;
  badge?: string;
}

const COMMON_TERMS: Term[] = [
  { term: 'CMP (Current Market Price)', short: 'Live trading price of one unit.', detail: 'Fetched from BSE during market hours. Used as the denominator in yield and valuation calculations.', good: 'N/A — relative metric', color: 'text-foreground' },
  { term: 'Market Cap', short: 'Total market value of all units.', detail: 'CMP × Total Units Outstanding. Indicates size and liquidity in the market.', good: 'Higher = more liquid', color: 'text-foreground' },
  { term: 'NAV (Net Asset Value)', short: 'What is the asset actually worth?', detail: 'Appraised value of all properties/assets minus liabilities, per unit. CMP < NAV = undervalued. CMP > NAV = market pricing in growth.', good: 'CMP < NAV = Undervalued', color: 'text-terminal-cyan' },
  { term: 'LTV (Loan-to-Value)', short: 'How leveraged is it?', detail: 'Total debt divided by total asset value. Lower LTV = less risk. SEBI mandates < 49%. Below 30% is conservative.', good: '< 30%', color: 'text-terminal-amber' },
];

const ASSET_SPECIFIC: Term[] = [
  { term: 'Occupancy Rate', short: 'How full is the property?', detail: 'Percentage of total leasable area currently occupied by tenants. Higher occupancy = stable rental income and strong demand.', good: '> 90%', color: 'text-terminal-green', badge: 'REIT' },
  { term: 'Availability', short: 'Operational uptime of infrastructure asset.', detail: 'Percentage of time the asset is available for use (e.g., road open for tolling, transmission line energized). Replaces "Occupancy" in InvIT context.', good: '> 95%', color: 'text-terminal-green', badge: 'InvIT' },
  { term: 'WALE (Weighted Avg Lease Expiry)', short: 'How long are tenants locked in?', detail: 'Average remaining lease term weighted by area. Higher WALE = predictable cash flows. Office REITs: 5–8Y, Retail: 3–5Y.', good: '> 5Y (Office)', color: 'text-terminal-blue', badge: 'REIT' },
  { term: 'Concession Life', short: 'Remaining life of the infrastructure concession.', detail: 'Years remaining on the government concession agreement. At expiry, the asset reverts to the authority. Normalized to 30Y max for scoring.', good: '> 15 years', color: 'text-terminal-blue', badge: 'InvIT' },
];

const SHARED_TERMS: Term[] = [
  { term: 'Pipeline', short: 'What growth is coming?', detail: 'Total area/value under construction or planned for acquisition. Signals future income growth and NAV expansion.', good: 'Higher = more growth', color: 'text-foreground' },
];

function TermItem({ t }: { t: Term }) {
  return (
    <div className="bg-secondary/50 rounded p-2.5 space-y-1">
      <div className="flex items-center gap-2">
        <span className={`font-semibold text-[11px] ${t.color}`}>{t.term}</span>
        {t.badge && (
          <span className={`text-[8px] font-mono font-bold uppercase px-1.5 py-0.5 rounded ${t.badge === 'REIT' ? 'bg-primary/15 text-primary' : 'bg-terminal-amber/15 text-terminal-amber'}`}>
            {t.badge}
          </span>
        )}
      </div>
      <p className="text-[10px] text-foreground font-medium">{t.short}</p>
      <p className="text-[10px] text-muted-foreground leading-relaxed">{t.detail}</p>
      <div className="flex items-center gap-1.5 pt-1 border-t border-border/50">
        <span className="text-[9px] text-muted-foreground uppercase">Healthy:</span>
        <span className="text-[10px] text-terminal-green font-mono">{t.good}</span>
      </div>
    </div>
  );
}

export function TerminologyCard({ defaultExpanded = false }: { defaultExpanded?: boolean }) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className="card-terminal p-3 sm:p-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-2">
          <HelpCircle className="h-4 w-4 text-terminal-cyan" />
          <h3 className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Glossary of Terms</h3>
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="mt-4 space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {COMMON_TERMS.map(t => <TermItem key={t.term} t={t} />)}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {ASSET_SPECIFIC.map(t => <TermItem key={t.term} t={t} />)}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {SHARED_TERMS.map(t => (
              <div key={t.term} className="sm:col-span-2">
                <TermItem t={t} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
