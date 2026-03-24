import { InvITData, InvITScoreBreakdown, computeInvITPostTaxYield } from './invit-types';
import type { StrategyWeights } from './reit-types';

export function calculateInvITScores(
  invits: InvITData[],
  gsecYield: number,
  weights: StrategyWeights,
  taxRate: number = 10
): (InvITData & InvITScoreBreakdown)[] {
  const maxGrowth1Y = Math.max(...invits.map(i => Math.abs(i.growth1Y)), 1);

  const scored = invits.map(invit => {
    const postTaxYield = computeInvITPostTaxYield(invit.taxBreakdown, invit.ttmDistribution, invit.cmp, taxRate);
    const divScore = (postTaxYield / gsecYield) * 100;

    // ValueScore = ((NAV - CMP) / NAV) * 100
    const valueScore = invit.nav > 0 ? ((invit.nav - invit.cmp) / invit.nav) * 100 : 0;

    // Safety Score = (Availability % * 0.5) + (min(ConcessionLife, 30) * 1.66)
    const safetyScore = (invit.availability * 0.5) + (Math.min(invit.concessionLife, 30) * 1.66);

    // Growth Score: higher for Road/Toll (WPI-linked), lower for Transmission (fixed annuity)
    const sectorMultiplier = (invit.sector === 'Road/Toll') ? 1.2 : 0.8;
    const growthScore = (invit.growth1Y / maxGrowth1Y) * 100 * sectorMultiplier;

    // Weighted final score (include value weight if available)
    const valueWeight = weights.value || 0;
    const totalWeight = weights.yield + weights.safety + weights.growth + valueWeight;
    if (totalWeight === 0) {
      return {
        ...invit, divScore: r(divScore), valueScore: r(valueScore), safetyScore: r(safetyScore),
        growthScore: r(growthScore), postTaxYield: r(postTaxYield), finalScore: 0, rank: 0,
      };
    }

    const effYield = weights.yield / totalWeight;
    const effSafety = weights.safety / totalWeight;
    const effGrowth = weights.growth / totalWeight;
    const effValue = valueWeight / totalWeight;

    const finalScore =
      divScore * effYield +
      valueScore * effValue +
      safetyScore * effSafety +
      growthScore * effGrowth;

    console.log(`Safety Audit [InvIT]: ${invit.name} Score: ${safetyScore.toFixed(1)} | Availability: ${invit.availability}% | Concession: ${invit.concessionLife}Y`);

    return {
      ...invit,
      divScore: r(divScore),
      safetyScore: r(safetyScore),
      growthScore: r(growthScore),
      postTaxYield: r(postTaxYield),
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
