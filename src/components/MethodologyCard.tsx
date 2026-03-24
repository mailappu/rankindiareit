import { useState } from 'react';
import { ChevronDown, ChevronUp, BookOpen } from 'lucide-react';

interface ScoreMethod {
  name: string;
  formula: string;
  description: string;
  color: string;
}

const REIT_SCORES: ScoreMethod[] = [
  {
    name: 'DivScore',
    formula: 'DivScore = (Post-Tax Yield ÷ G-Sec Yield) × 100',
    description: 'Measures yield premium over the risk-free 10Y G-Sec benchmark. A score > 100 means the REIT yields more than government bonds after tax.',
    color: 'text-terminal-green',
  },
  {
    name: 'ValueScore',
    formula: 'ValueScore = ((NAV − CMP) ÷ NAV) × 100',
    description: 'Discount to Net Asset Value. Positive = undervalued (CMP < NAV). Negative = trading at a premium.',
    color: 'text-terminal-amber',
  },
  {
    name: 'SafetyScore',
    formula: 'SafetyScore = (Occupancy × 0.40) + (WALE÷10 × 100 × 0.40) + ((1 − LTV) × 100 × 0.20)',
    description: 'Weighted composite: 40% occupancy rate, 40% lease duration (normalized to 10Y), 20% inverse leverage. Rated: Stable (≥80), Monitor (≥60), Risk (<60).',
    color: 'text-terminal-blue',
  },
  {
    name: 'GrowthScore',
    formula: 'GrowthScore = (1Y CAGR × 0.40) + (3Y CAGR × 0.35) + (5Y CAGR × 0.25)',
    description: 'Weighted price appreciation. If 3Y/5Y data is unavailable (young listing), weight redistributes proportionally to available periods.',
    color: 'text-terminal-cyan',
  },
];

const INVIT_SCORES: ScoreMethod[] = [
  {
    name: 'DivScore',
    formula: 'DivScore = (Post-Tax Yield ÷ G-Sec Yield) × 100',
    description: 'Yield premium over the 10Y G-Sec benchmark. Post-tax yield accounts for Interest (taxed at slab), Dividend (SPV regime), and Repayment (tax-free) components.',
    color: 'text-terminal-green',
  },
  {
    name: 'ValueScore',
    formula: 'ValueScore = ((NAV − CMP) ÷ NAV) × 100',
    description: 'NAV discount/premium. NAV sourced from BSE XBRL "Net Asset Value" tag. Positive = trading below intrinsic value.',
    color: 'text-terminal-amber',
  },
  {
    name: 'SafetyScore',
    formula: 'SafetyScore = (Availability × 0.40) + (Concession÷30 × 100 × 0.40) + ((1 − LTV) × 100 × 0.20)',
    description: 'InvIT-specific: 40% asset availability (uptime), 40% concession life (normalized to 30Y), 20% inverse leverage. Reflects infrastructure risk profile.',
    color: 'text-terminal-blue',
  },
  {
    name: 'GrowthScore',
    formula: 'GrowthScore = (1Y CAGR × 0.40) + (3Y CAGR × 0.35) + (5Y CAGR × 0.25)',
    description: 'Weighted price CAGR with proportional redistribution for missing periods. Recently listed InvITs use 1Y only.',
    color: 'text-terminal-cyan',
  },
];

function FormulaCard({ score }: { score: ScoreMethod }) {
  return (
    <div className="bg-secondary/50 rounded p-2.5 space-y-1.5">
      <div className={`font-semibold text-[11px] ${score.color}`}>{score.name}</div>
      <div className="bg-background/60 rounded px-2 py-1.5 border border-border/30">
        <code className="text-[10px] text-foreground font-mono block whitespace-pre-wrap">{score.formula}</code>
      </div>
      <p className="text-[10px] text-muted-foreground leading-relaxed">{score.description}</p>
    </div>
  );
}

function ScoreColumn({ title, scores, accent }: { title: string; scores: ScoreMethod[]; accent: string }) {
  return (
    <div className="space-y-2">
      <div className={`text-[11px] font-mono font-bold uppercase tracking-wider ${accent} border-b border-border/50 pb-1.5`}>
        {title}
      </div>
      <div className="space-y-2">
        {scores.map(s => <FormulaCard key={s.name} score={s} />)}
      </div>
    </div>
  );
}

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
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ScoreColumn title="REIT Methodology" scores={REIT_SCORES} accent="text-primary" />
            <ScoreColumn title="InvIT Methodology" scores={INVIT_SCORES} accent="text-terminal-amber" />
          </div>

          {/* Final Score — shared */}
          <div className="bg-secondary/50 rounded p-3">
            <div className="text-foreground font-semibold text-[11px]">Final Score (Both)</div>
            <div className="bg-background/60 rounded px-2 py-1.5 border border-border/30 mt-1">
              <code className="text-[10px] text-foreground font-mono block">FinalScore = Σ (Component × Strategy Weight%) ÷ Total Weight</code>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">Weights are determined by the selected strategy preset (Income, Growth, Risk Averse) or custom sliders. The formula is identical for REITs and InvITs.</p>
          </div>
        </div>
      )}
    </div>
  );
}
