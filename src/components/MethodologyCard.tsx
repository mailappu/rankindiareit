import { useState } from 'react';
import { ChevronDown, ChevronUp, BookOpen } from 'lucide-react';

export function MethodologyCard() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="card-terminal p-4">
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
        <div className="mt-4 space-y-3 text-xs font-mono text-foreground">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-secondary/50 rounded p-3 space-y-1.5">
              <div className="text-terminal-green font-semibold text-[11px]">DivScore</div>
              <code className="text-[10px] text-muted-foreground block">= (REIT_Yield / G-Sec_Yield) × 100</code>
              <p className="text-[10px] text-muted-foreground">Measures yield premium over risk-free rate.</p>
            </div>
            <div className="bg-secondary/50 rounded p-3 space-y-1.5">
              <div className="text-terminal-amber font-semibold text-[11px]">ValueScore</div>
              <code className="text-[10px] text-muted-foreground block">= ((NAV - CMP) / NAV) × 100</code>
              <p className="text-[10px] text-muted-foreground">Discount to NAV. Higher = more undervalued.</p>
            </div>
            <div className="bg-secondary/50 rounded p-3 space-y-1.5">
              <div className="text-terminal-blue font-semibold text-[11px]">SafetyScore</div>
              <code className="text-[10px] text-muted-foreground block">= (Occupancy + (100 - LTV) + (WALE_scaled)) / 3</code>
              <p className="text-[10px] text-muted-foreground">WALE scaled to 10 (max 12Y). Retail sector gets 1.5× WALE adjustment.</p>
            </div>
            <div className="bg-secondary/50 rounded p-3 space-y-1.5">
              <div className="text-terminal-cyan font-semibold text-[11px]">GrowthScore</div>
              <code className="text-[10px] text-muted-foreground block">= weighted(1Y×40 + 3Y×35 + 5Y×25)</code>
              <p className="text-[10px] text-muted-foreground">If 5Y CAGR is N/A, its weight redistributes proportionally to 1Y and 3Y.</p>
            </div>
          </div>
          <div className="bg-secondary/50 rounded p-3">
            <div className="text-foreground font-semibold text-[11px]">Final Score</div>
            <code className="text-[10px] text-muted-foreground block">= Σ (Component × Weight%) / Total_Weight</code>
            <p className="text-[10px] text-muted-foreground mt-1">Weights determined by selected strategy preset or custom sliders.</p>
          </div>
        </div>
      )}
    </div>
  );
}
