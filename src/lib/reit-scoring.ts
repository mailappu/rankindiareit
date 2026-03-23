import { REITData, ScoreBreakdown, StrategyWeights, computePostTaxYield } from './reit-types';

export function calculateScores(
  reits: REITData[],
  gsecYield: number,
  weights: StrategyWeights,
  taxRate: number = 10
): (REITData & ScoreBreakdown)[] {
  const maxPipeline = Math.max(...reits.map(r => r.pipeline));
  const maxGrowth1Y = Math.max(...reits.map(r => r.growth1Y));

  const scored = reits.map(reit => {
    // Post-tax yield for scoring
    const postTaxYield = computePostTaxYield(reit.taxBreakdown, reit.ttmDistribution, reit.cmp, taxRate);

    // DividendScore = (PostTax_Yield / G-Sec_Yield) * 100
    const divScore = (postTaxYield / gsecYield) * 100;

    // ValueScore = ((NAV - CMP) / NAV) * 100
    const valueScore = ((reit.nav - reit.cmp) / reit.nav) * 100;

    // SafetyScore = (Occupancy + (100 - LTV) + (WALE * 10)) / 3
    const safetyScore = (reit.occupancy + (100 - reit.ltv) + (reit.wale * 10)) / 3;

    // GrowthScore = normalized 1Y growth (relative to group max)
    const growthScore = (reit.growth1Y / maxGrowth1Y) * 100;

    const pipelineScore = (reit.pipeline / maxPipeline) * 100;

    // Missing data redistribution:
    // If 3Y or 5Y CAGR is missing, redistribute growth weight to 1Y growth and div yield
    const has3Y = reit.growth3Y !== null;
    const has5Y = reit.growth5Y !== null;
    const missingPenalty = (!has3Y ? 0.15 : 0) + (!has5Y ? 0.1 : 0); // fraction of growth weight to shift

    const totalWeight = weights.yield + weights.safety + weights.value + weights.growth + weights.pipeline;
    if (totalWeight === 0) {
      return {
        ...reit, divScore: r(divScore), valueScore: r(valueScore),
        safetyScore: r(safetyScore), growthScore: r(growthScore),
        pipelineScore: r(pipelineScore), finalScore: 0, rank: 0,
      };
    }

    // Effective weights with redistribution
    const growthRedist = weights.growth * missingPenalty;
    const effYield = (weights.yield + growthRedist * 0.6) / totalWeight; // 60% to yield
    const effGrowth = (weights.growth - growthRedist) / totalWeight;
    const effValue = weights.value / totalWeight;
    const effSafety = (weights.safety + growthRedist * 0.4) / totalWeight; // 40% to safety
    const effPipeline = weights.pipeline / totalWeight;

    const finalScore =
      divScore * effYield +
      valueScore * effValue +
      safetyScore * effSafety +
      growthScore * effGrowth +
      pipelineScore * effPipeline;

    return {
      ...reit,
      divScore: r(divScore),
      valueScore: r(valueScore),
      safetyScore: r(safetyScore),
      growthScore: r(growthScore),
      pipelineScore: r(pipelineScore),
      finalScore: r(finalScore),
      rank: 0,
    };
  });

  scored.sort((a, b) => b.finalScore - a.finalScore);
  scored.forEach((s, i) => { s.rank = i + 1; });

  return scored;
}

function r(v: number): number {
  return Math.round(v * 10) / 10;
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
