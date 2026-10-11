export type Trend = "gaining" | "losing" | "stable";

export type Status =
  "too_fast" | "on_track" | "too_slow" | "wrong_direction" | "not_enough_data";

// Keeps e.g. 0.35 - 0.25 (0.09999…) and 0.1000…1 on the same side of a 0.1 tolerance.
const EPSILON = 1e-9;

export function computeTrend(
  rate: number | null,
  tolerance: number,
): Trend | null {
  if (rate === null) return null;
  if (rate > tolerance + EPSILON) return "gaining";
  if (rate < -tolerance - EPSILON) return "losing";
  return "stable";
}

export function computeStatus(
  rate: number | null,
  targetRate: number | null,
  tolerance: number,
): Status {
  if (rate === null || targetRate === null) return "not_enough_data";
  if (Math.abs(rate - targetRate) <= tolerance + EPSILON) return "on_track";
  if (targetRate === 0) return "too_fast";
  if (rate !== 0 && Math.sign(rate) !== Math.sign(targetRate)) {
    return "wrong_direction";
  }
  return Math.abs(rate) > Math.abs(targetRate) ? "too_fast" : "too_slow";
}
