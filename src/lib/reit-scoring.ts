import { REITData, ScoreBreakdown, StrategyWeights } from './reit-types';

export function calculateScores(
  reits: REITData[],
  gsecYield: number,
  weights: StrategyWeights
): (REITData & ScoreBreakdown)[] {
  const maxPipeline = Math.max(...reits.map(r => r.pipeline));
  const maxGrowth1Y = Math.max(...reits.map(r => r.growth1Y));

  const scored = reits.map(reit => {
    // DividendScore = (REIT_Yield / G-Sec_Yield) * 100
    const divScore = (reit.divYield / gsecYield) * 100;

    // ValueScore = ((NAV - CMP) / NAV) * 100
    const valueScore = ((reit.nav - reit.cmp) / reit.nav) * 100;

    // SafetyScore = (Occupancy + (100 - LTV) + (WALE * 10)) / 3
    const safetyScore = (reit.occupancy + (100 - reit.ltv) + (reit.wale * 10)) / 3;

    // GrowthScore = normalized 1Y growth (relative to group max)
    const growthScore = (reit.growth1Y / maxGrowth1Y) * 100;

    const pipelineScore = (reit.pipeline / maxPipeline) * 100;

    // FinalScore = weighted sum
    const totalWeight = weights.yield + weights.safety + weights.value + weights.growth + weights.pipeline;
    const finalScore = totalWeight > 0
      ? (
          divScore * (weights.yield / totalWeight) +
          valueScore * (weights.value / totalWeight) +
          safetyScore * (weights.safety / totalWeight) +
          growthScore * (weights.growth / totalWeight) +
          pipelineScore * (weights.pipeline / totalWeight)
        )
      : 0;

    return {
      ...reit,
      divScore: Math.round(divScore * 10) / 10,
      valueScore: Math.round(valueScore * 10) / 10,
      safetyScore: Math.round(safetyScore * 10) / 10,
      growthScore: Math.round(growthScore * 10) / 10,
      pipelineScore: Math.round(pipelineScore * 10) / 10,
      finalScore: Math.round(finalScore * 10) / 10,
      rank: 0,
    };
  });

  scored.sort((a, b) => b.finalScore - a.finalScore);
  scored.forEach((s, i) => { s.rank = i + 1; });

  return scored;
}

export function getHeatmapClass(value: number, metric: string): string {
  switch (metric) {
    case 'divYield':
      if (value >= 7) return 'bg-heatmap-green-high';
      if (value >= 6) return 'bg-heatmap-green-mid';
      return 'bg-heatmap-neutral';
    case 'occupancy':
      if (value >= 93) return 'bg-heatmap-green-high';
      if (value >= 88) return 'bg-heatmap-green-mid';
      return 'bg-heatmap-red-mid';
    case 'ltv':
      if (value <= 20) return 'bg-heatmap-green-high';
      if (value <= 27) return 'bg-heatmap-green-mid';
      return 'bg-heatmap-red-mid';
    case 'valueScore':
      if (value >= 5) return 'bg-heatmap-green-high';
      if (value >= 0) return 'bg-heatmap-green-mid';
      return 'bg-heatmap-red-mid';
    case 'finalScore':
      if (value >= 80) return 'bg-heatmap-green-high';
      if (value >= 60) return 'bg-heatmap-green-mid';
      return 'bg-heatmap-neutral';
    case 'growth':
      if (value >= 20) return 'bg-heatmap-green-high';
      if (value >= 12) return 'bg-heatmap-green-mid';
      return 'bg-heatmap-neutral';
    default:
      return 'bg-heatmap-neutral';
  }
}
