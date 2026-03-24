import { InvITData, InvITScoreBreakdown, computeInvITPostTaxYield } from './invit-types';
import type { StrategyWeights } from './reit-types';

export function calculateInvITScores(
  invits: InvITData[],
  gsecYield: number,
  weights: StrategyWeights,
  taxRate: number = 10
): (InvITData & InvITScoreBreakdown)[] {

  const scored = invits.map(invit => {
    // ── Post-Tax Yield ──
    const postTaxYield = computeInvITPostTaxYield(invit.taxBreakdown, invit.ttmDistribution, invit.cmp, taxRate);

    // ── DivScore: (Post-Tax Yield / G-Sec Yield) * 100 ──
    const divScore = gsecYield > 0 ? (postTaxYield / gsecYield) * 100 : 0;

    // ── ValueScore: ((NAV - CMP) / NAV) * 100 ──
    const valueScore = invit.nav > 0 ? ((invit.nav - invit.cmp) / invit.nav) * 100 : 0;

    // ── SafetyScore (InvIT-specific parity with REIT formula) ──
    // (Availability * 0.40) + (ConcessionLife/30 * 0.40) + ((1 - LTV/100) * 0.20)
    // All components normalized to 0–100 scale
    const availabilityComponent = invit.availability * 0.40;
    const concessionComponent = (Math.min(invit.concessionLife, 30) / 30) * 100 * 0.40;
    const ltvComponent = (1 - Math.min(invit.ltv, 100) / 100) * 100 * 0.20;
    const safetyScore = availabilityComponent + concessionComponent + ltvComponent;

    // ── GrowthScore: Weighted CAGR (1Y: 40%, 3Y: 35%, 5Y: 25%) with redistribution ──
    const growthScore = computeWeightedGrowth(invit.growth1Y, invit.growth3Y, invit.growth5Y);

    // ── Weighted Final Score ──
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

    console.log(`Safety Audit [InvIT]: ${invit.name} Score: ${safetyScore.toFixed(1)} | Avail: ${availabilityComponent.toFixed(1)} | Concession: ${concessionComponent.toFixed(1)} | LTV: ${ltvComponent.toFixed(1)}`);

    return {
      ...invit,
      divScore: r(divScore),
      valueScore: r(valueScore),
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

/**
 * Weighted CAGR: 1Y (40%), 3Y (35%), 5Y (25%)
 * If 3Y or 5Y is N/A, redistribute weight proportionally to available metrics.
 */
function computeWeightedGrowth(g1Y: number, g3Y: number | null, g5Y: number | null): number {
  let w1 = 40, w3 = 35, w5 = 25;
  const has3Y = g3Y !== null && g3Y !== undefined;
  const has5Y = g5Y !== null && g5Y !== undefined;

  if (!has3Y && !has5Y) {
    // Only 1Y available — use it fully
    return g1Y;
  } else if (!has5Y) {
    // Redistribute 5Y weight to 1Y and 3Y proportionally
    const total = w1 + w3;
    w1 = (w1 / total) * 100;
    w3 = (w3 / total) * 100;
    w5 = 0;
  } else if (!has3Y) {
    // Redistribute 3Y weight to 1Y and 5Y proportionally
    const total = w1 + w5;
    w1 = (w1 / total) * 100;
    w5 = (w5 / total) * 100;
    w3 = 0;
  }

  return (g1Y * w1 + (g3Y ?? 0) * w3 + (g5Y ?? 0) * w5) / 100;
}

function r(v: number): number {
  return Math.round(v * 10) / 10;
}
