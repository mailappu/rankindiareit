import { StrategyPreset, StrategyWeights, STRATEGY_PRESETS } from '@/lib/reit-types';
import { Slider } from '@/components/ui/slider';

interface StrategyPanelProps {
  preset: StrategyPreset;
  weights: StrategyWeights;
  onPresetChange: (preset: StrategyPreset) => void;
  onWeightsChange: (weights: StrategyWeights) => void;
}

const PRESET_INFO: Record<Exclude<StrategyPreset, 'custom'>, { label: string; desc: string }> = {
  income: { label: 'INCOME', desc: '50% Yield · 30% Safety · 20% Value' },
  growth: { label: 'GROWTH', desc: '40% Growth · 40% Pipeline · 20% Value' },
  riskAverse: { label: 'RISK AVERSE', desc: '60% Safety · 20% Yield · 20% Value' },
};

const WEIGHT_LABELS: { key: keyof StrategyWeights; label: string; color: string }[] = [
  { key: 'yield', label: 'Div Yield', color: 'text-terminal-green' },
  { key: 'safety', label: 'Safety', color: 'text-terminal-blue' },
  { key: 'value', label: 'Value', color: 'text-terminal-amber' },
  { key: 'growth', label: 'Growth', color: 'text-terminal-cyan' },
  { key: 'pipeline', label: 'Pipeline', color: 'text-foreground' },
];

export function StrategyPanel({ preset, weights, onPresetChange, onWeightsChange }: StrategyPanelProps) {
  const handlePreset = (p: Exclude<StrategyPreset, 'custom'>) => {
    onPresetChange(p);
    onWeightsChange(STRATEGY_PRESETS[p]);
  };

  const handleSlider = (key: keyof StrategyWeights, val: number[]) => {
    onPresetChange('custom');
    onWeightsChange({ ...weights, [key]: val[0] });
  };

  return (
    <div className="card-terminal p-3 sm:p-4">
      <h3 className="text-xs font-mono text-muted-foreground mb-3 uppercase tracking-wider">Strategy Engine</h3>

      {/* Preset buttons - scroll horizontally on mobile */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {(Object.keys(PRESET_INFO) as Exclude<StrategyPreset, 'custom'>[]).map(p => (
          <button
            key={p}
            onClick={() => handlePreset(p)}
            className={`flex-1 min-w-[100px] px-2 sm:px-3 py-2 rounded text-xs font-mono transition-all border ${
              preset === p
                ? 'border-terminal-green/50 bg-terminal-green/10 text-terminal-green'
                : 'border-border bg-secondary/50 text-muted-foreground hover:border-muted-foreground/30'
            }`}
          >
            <div className="font-semibold text-[10px] sm:text-xs">{PRESET_INFO[p].label}</div>
            <div className="text-[9px] sm:text-[10px] mt-0.5 opacity-70 whitespace-nowrap">{PRESET_INFO[p].desc}</div>
          </button>
        ))}
      </div>

      {/* Weight sliders - 2 cols on mobile, 5 on desktop */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4">
        {WEIGHT_LABELS.map(({ key, label, color }) => (
          <div key={key} className="space-y-1.5">
            <div className="flex justify-between items-center">
              <span className={`text-[10px] font-mono ${color}`}>{label}</span>
              <span className="text-xs font-mono text-foreground font-semibold">{weights[key]}%</span>
            </div>
            <Slider
              value={[weights[key]]}
              onValueChange={(v) => handleSlider(key, v)}
              max={100}
              step={5}
              className="w-full"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
