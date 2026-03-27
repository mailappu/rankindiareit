import { useState } from 'react';
import { ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';

interface Term {
  term: string;
  short: string;
  detail: string;
  good: string;
  color: string;
}

const REIT_TERMS: Term[] = [
  { term: 'CMP (Current Market Price)', short: 'Live trading price of one REIT unit.', detail: 'Fetched from BSE during market hours. Used as the denominator in yield and valuation calculations.', good: 'N/A — relative metric', color: 'text-foreground' },
  { term: 'Market Cap', short: 'Total market value of all units.', detail: 'CMP × Total Units Outstanding. Indicates the REIT\'s size and liquidity in the market.', good: 'Higher = more liquid', color: 'text-foreground' },
  { term: 'NAV (Net Asset Value)', short: 'What is the REIT actually worth?', detail: 'Appraised value of all properties minus liabilities, per unit. CMP < NAV = undervalued. CMP > NAV = market pricing in growth.', good: 'CMP < NAV = Undervalued', color: 'text-terminal-cyan' },
  { term: 'LTV (Loan-to-Value)', short: 'How leveraged is the REIT?', detail: 'Total debt divided by total asset value. Lower LTV = less risk. SEBI mandates < 49%. Below 30% is conservative.', good: '< 30%', color: 'text-terminal-amber' },
  { term: 'Occupancy Rate', short: 'How full is the property?', detail: 'Percentage of total leasable area currently occupied by tenants. Higher occupancy = stable rental income and strong demand.', good: '> 90%', color: 'text-terminal-green' },
  { term: 'WALE (Weighted Avg Lease Expiry)', short: 'How long are tenants locked in?', detail: 'Average remaining lease term weighted by area. Higher WALE = predictable cash flows. Office REITs: 5–8Y, Retail: 3–5Y.', good: '> 5Y (Office)', color: 'text-terminal-blue' },
  { term: 'Pipeline', short: 'What growth is coming?', detail: 'Total area under construction or planned for acquisition. Signals future rental income growth and NAV expansion.', good: 'Higher = more growth', color: 'text-foreground' },
];

const INVIT_TERMS: Term[] = [
  { term: 'CMP (Current Market Price)', short: 'Live trading price of one InvIT unit.', detail: 'Fetched from BSE during market hours. Used as the denominator in yield and valuation calculations.', good: 'N/A — relative metric', color: 'text-foreground' },
  { term: 'Market Cap', short: 'Total market value of all units.', detail: 'CMP × Total Units Outstanding. Indicates the InvIT\'s size and liquidity in the market.', good: 'Higher = more liquid', color: 'text-foreground' },
  { term: 'NAV (Net Asset Value)', short: 'What is the InvIT actually worth?', detail: 'Net Asset Value from BSE XBRL filings. CMP < NAV = undervalued. Used to calculate Value% discount/premium.', good: 'CMP < NAV = Undervalued', color: 'text-terminal-cyan' },
  { term: 'LTV (Loan-to-Value)', short: 'How leveraged is the InvIT?', detail: 'Consolidated borrowings / Enterprise value. SEBI cap is 49%. IndiGrid ~56% (Net Debt/AUM), PGInvIT ~8%.', good: '< 35%', color: 'text-terminal-amber' },
  { term: 'Availability', short: 'Operational uptime of infrastructure asset.', detail: 'Percentage of time the asset is available for use (e.g., road open for tolling, transmission line energized). Replaces "Occupancy" in InvIT context.', good: '> 95%', color: 'text-terminal-green' },
  { term: 'Concession Life', short: 'Remaining life of the infrastructure concession.', detail: 'Years remaining on the government concession agreement. At expiry, the asset reverts to the authority. Normalized to 30Y max for scoring.', good: '> 15 years', color: 'text-terminal-blue' },
  { term: 'Pipeline', short: 'Future asset acquisitions planned.', detail: 'Value (₹ Cr) of assets under construction or in the acquisition pipeline. Signals future distribution growth.', good: 'Higher = more growth', color: 'text-foreground' },
];

function TermColumn({ title, terms, accent }: { title: string; terms: Term[]; accent: string }) {
  return (
    <div className="space-y-2">
      <div className={`text-[11px] font-mono font-bold uppercase tracking-wider ${accent} border-b border-border/50 pb-1.5`}>
        {title}
      </div>
      <div className="space-y-2">
        {terms.map(t => (
          <div key={t.term} className="bg-secondary/50 rounded p-2.5 space-y-1">
            <div className={`font-semibold text-[11px] ${t.color}`}>{t.term}</div>
            <p className="text-[10px] text-foreground font-medium">{t.short}</p>
            <p className="text-[10px] text-muted-foreground leading-relaxed">{t.detail}</p>
            <div className="flex items-center gap-1.5 pt-1 border-t border-border/50">
              <span className="text-[9px] text-muted-foreground uppercase">Healthy:</span>
              <span className="text-[10px] text-terminal-green font-mono">{t.good}</span>
            </div>
          </div>
        ))}
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
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <TermColumn title="REIT Terms" terms={REIT_TERMS} accent="text-primary" />
          <TermColumn title="InvIT Terms" terms={INVIT_TERMS} accent="text-terminal-amber" />
        </div>
      )}
    </div>
  );
}
