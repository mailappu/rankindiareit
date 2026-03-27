import { useState } from 'react';
import { ChevronDown, ChevronUp, BookOpen } from 'lucide-react';

export function MethodologyCard({ defaultExpanded = false }: { defaultExpanded?: boolean }) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className="card-terminal p-3 sm:p-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-terminal-amber" />
          <h3 className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Scoring Methodology</h3>
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="mt-4 space-y-3 text-xs font-mono text-muted-foreground leading-relaxed">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-secondary/50 rounded p-3 space-y-1.5">
              <div className="text-terminal-green font-semibold text-[11px]">DivScore</div>
              <code className="text-[10px] block text-foreground">= (Post-Tax Yield / G-Sec Yield) × 100</code>
              <p className="text-[10px]">Measures yield premium over the risk-free rate. A score {'>'} 100 means the asset yields more than government bonds after tax.</p>
            </div>
            <div className="bg-secondary/50 rounded p-3 space-y-1.5">
              <div className="text-terminal-amber font-semibold text-[11px]">ValueScore</div>
              <code className="text-[10px] block text-foreground">= ((NAV - CMP) / NAV) × 100</code>
              <p className="text-[10px]">Discount to Net Asset Value. Positive = undervalued (CMP {'<'} NAV). Negative = trading at a premium.</p>
            </div>
            <div className="bg-secondary/50 rounded p-3 space-y-1.5">
              <div className="text-terminal-blue font-semibold text-[11px]">SafetyScore (REIT)</div>
              <code className="text-[10px] block text-foreground">= (Occ × 0.4) + (WALE/10 × 100 × 0.4) + ((1−LTV) × 100 × 0.2)</code>
              <p className="text-[10px]">40% occupancy, 40% lease duration (normalized to 10Y), 20% inverse leverage.</p>
            </div>
            <div className="bg-secondary/50 rounded p-3 space-y-1.5">
              <div className="text-terminal-blue font-semibold text-[11px]">SafetyScore (InvIT)</div>
              <code className="text-[10px] block text-foreground">= (Avail × 0.4) + (Concession/30 × 100 × 0.4) + ((1−LTV) × 100 × 0.2)</code>
              <p className="text-[10px]">40% asset availability (uptime), 40% concession life (normalized to 30Y), 20% inverse leverage.</p>
            </div>
            <div className="bg-secondary/50 rounded p-3 space-y-1.5 sm:col-span-2">
              <div className="text-terminal-cyan font-semibold text-[11px]">GrowthScore</div>
              <code className="text-[10px] block text-foreground">= (1Y CAGR × 0.40) + (3Y CAGR × 0.35) + (5Y CAGR × 0.25)</code>
              <p className="text-[10px]">Weighted price appreciation. If 3Y/5Y data is unavailable (young listing), weight redistributes proportionally to available periods. Applies to both REITs and InvITs.</p>
            </div>
          </div>

          {/* Final Score */}
          <div className="bg-secondary/50 rounded p-3 space-y-1.5">
            <div className="text-foreground font-semibold text-[11px]">Final Score & Strategy Weighting</div>
            <div className="bg-background/60 rounded px-2 py-1.5 border border-border/30">
              <code className="text-[10px] text-foreground font-mono block">FinalScore = Σ (Component × Strategy Weight%) ÷ Total Weight</code>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-2 text-[10px]">
              <div><span className="text-primary font-semibold">Income:</span> 70% Yield · 20% Safety · 10% Growth</div>
              <div><span className="text-terminal-cyan font-semibold">Growth:</span> 60% Growth · 20% Yield · 20% Safety</div>
              <div><span className="text-terminal-blue font-semibold">Risk Averse:</span> 60% Safety · 30% Yield · 10% Growth</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
