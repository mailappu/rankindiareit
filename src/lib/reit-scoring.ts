import { REITData, ScoreBreakdown, StrategyWeights } from './reit-types';

const WALE_MAX = 12; // scale WALE to 10 based on this max
const RETAIL_WALE_ADJUSTMENT = 1.5; // Retail WALEs are naturally shorter

function normalizeWale(wale: number, sector: string): number {
  const adjusted = sector === 'Retail' ? wale * RETAIL_WALE_ADJUSTMENT : wale;
  return Math.min((adjusted / WALE_MAX) * 10, 10);
}

export function calculateScores(
  reits: REITData[],
  gsecYield: number,
  weights: StrategyWeights
): (REITData & ScoreBreakdown)[] {
  // Normalize all scores to 0-100 range relative to the group
  const maxPipeline = Math.max(...reits.map(r => r.pipeline));
  const maxGrowth1Y = Math.max(...reits.map(r => r.growth1Y));
  const maxGrowth3Y = Math.max(...reits.map(r => r.growth3Y));
  const maxGrowth5Y = Math.max(...reits.filter(r => r.growth5Y !== null).map(r => r.growth5Y!), 1);

  const scored = reits.map(reit => {
    const divScore = (reit.divYield / gsecYield) * 100;
    const valueScore = ((reit.nav - reit.cmp) / reit.nav) * 100;
    const waleScaled = normalizeWale(reit.wale, reit.sector);
    const safetyScore = (reit.occupancy + (100 - reit.ltv) + (waleScaled * 10)) / 3;

    // Growth score with missing data redistribution
    let growthScore: number;
    if (reit.growth5Y !== null) {
      growthScore = (
        (reit.growth1Y / maxGrowth1Y) * 40 +
        (reit.growth3Y / maxGrowth3Y) * 35 +
        (reit.growth5Y / maxGrowth5Y) * 25
      );
    } else {
      // Redistribute 5Y weight proportionally to 1Y and 3Y
      growthScore = (
        (reit.growth1Y / maxGrowth1Y) * 53.3 +
        (reit.growth3Y / maxGrowth3Y) * 46.7
      );
    }

    const pipelineScore = (reit.pipeline / maxPipeline) * 100;

    // Weighted final score
    const totalWeight = weights.yield + weights.safety + weights.value + weights.growth + weights.pipeline;
    const finalScore = totalWeight > 0
      ? (
          divScore * (weights.yield / totalWeight) +
          safetyScore * (weights.safety / totalWeight) +
          valueScore * (weights.value / totalWeight) +
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

  // Assign ranks
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
      if (value >= 13) return 'bg-heatmap-green-high';
      if (value >= 8) return 'bg-heatmap-green-mid';
      return 'bg-heatmap-neutral';
    case 'finalScore':
      if (value >= 80) return 'bg-heatmap-green-high';
      if (value >= 60) return 'bg-heatmap-green-mid';
      return 'bg-heatmap-neutral';
    case 'growth':
      if (value >= 15) return 'bg-heatmap-green-high';
      if (value >= 10) return 'bg-heatmap-green-mid';
      return 'bg-heatmap-neutral';
    default:
      return 'bg-heatmap-neutral';
  }
}
