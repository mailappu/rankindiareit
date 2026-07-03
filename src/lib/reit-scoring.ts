import { REITData, ScoreBreakdown, StrategyWeights, computePostTaxYield } from './reit-types';

export function calculateScores(
  reits: REITData[],
  gsecYield: number,
  weights: StrategyWeights,
  taxRate: number = 10
): (REITData & ScoreBreakdown)[] {
  const maxPipeline = Math.max(...reits.map(r => r.pipeline));

  const scored = reits.map(reit => {
    // Post-tax yield for scoring
    const postTaxYield = computePostTaxYield(reit.taxBreakdown, reit.ttmDistribution, reit.cmp, taxRate);

    // DividendScore = (PostTax_Yield / G-Sec_Yield) * 100
    const divScore = (postTaxYield / gsecYield) * 100;

    // ValueScore = ((NAV - CMP) / NAV) * 100
    const valueScore = ((reit.nav - reit.cmp) / reit.nav) * 100;

    // SafetyScore = (NormOccupancy * 0.40) + (NormWALE * 0.40) + (LTVScore * 0.20)
    const normOccupancy = (reit.occupancy / 100) * 100; // occupancy already in %
    const normWALE = (Math.min(reit.wale, 10) / 10) * 100; // capped at 10Y
    const ltvScore = (1 - reit.ltv / 100) * 100; // inverse: lower debt = safer
    const safetyScore = (normOccupancy * 0.40) + (normWALE * 0.40) + (ltvScore * 0.20);

    // Safety audit log
    console.log(`Safety Audit: ${reit.name} Score: ${safetyScore.toFixed(1)} | LTV Impact: ${(ltvScore * 0.2).toFixed(1)}`);

    // GrowthScore = Weighted CAGR (1Y:40%, 3Y:35%, 5Y:25%) with proportional redistribution
    const growthScore = computeWeightedGrowth(reit.growth1Y, reit.growth3Y, reit.growth5Y);

    const pipelineScore = (reit.pipeline / maxPipeline) * 100;

    const totalWeight = weights.yield + weights.safety + weights.value + weights.growth + weights.pipeline;
    if (totalWeight === 0) {
      return {
        ...reit, divScore: r(divScore), valueScore: r(valueScore),
        safetyScore: r(safetyScore), growthScore: r(growthScore),
        pipelineScore: r(pipelineScore), postTaxYield: r(postTaxYield), finalScore: 0, rank: 0,
      };
    }

    const effYield = weights.yield / totalWeight;
    const effGrowth = weights.growth / totalWeight;
    const effValue = weights.value / totalWeight;
    const effSafety = weights.safety / totalWeight;
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
      postTaxYield: r(postTaxYield),
      finalScore: r(finalScore),
      rank: 0,
    };
  });

  scored.sort((a, b) => b.finalScore - a.finalScore);
  scored.forEach((s, i) => { s.rank = i + 1; });

  return scored;
}

function computeWeightedGrowth(g1Y: number, g3Y: number | null, g5Y: number | null): number {
  let w1 = 40, w3 = 35, w5 = 25;
  const has3Y = g3Y !== null && g3Y !== undefined;
  const has5Y = g5Y !== null && g5Y !== undefined;
  if (!has3Y && !has5Y) return g1Y;
  if (!has5Y) { const t = w1 + w3; w1 = (w1 / t) * 100; w3 = (w3 / t) * 100; w5 = 0; }
  else if (!has3Y) { const t = w1 + w5; w1 = (w1 / t) * 100; w5 = (w5 / t) * 100; w3 = 0; }
  return (g1Y * w1 + (g3Y ?? 0) * w3 + (g5Y ?? 0) * w5) / 100;
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
