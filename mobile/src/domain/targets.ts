import { parseDecimal } from "./numbers";
import { checkRateDirection } from "./trend/goal";

export const TARGET_WEIGHT_MIN = 30;
export const TARGET_WEIGHT_MAX = 300;
export const TARGET_RATE_LIMIT = 2;
export const TOLERANCE_MIN = 0.01;
export const TOLERANCE_MAX = 1;

export type TargetsInput = {
  targetWeight: string;
  targetRate: string;
  tolerance: string;
};
export type TargetsErrors = Partial<Record<keyof TargetsInput, string>>;
export type TargetsResult =
  | {
      ok: true;
      targetWeightKg: number | null;
      targetRateKgPerWeek: number | null;
      rateToleranceKgPerWeek: number;
    }
  | { ok: false; errors: TargetsErrors };

export function parseTargets(
  input: TargetsInput,
  currentWeightKg: number | null = null,
): TargetsResult {
  const errors: TargetsErrors = {};

  let targetWeightKg: number | null = null;
  if (input.targetWeight.trim() !== "") {
    targetWeightKg = parseDecimal(input.targetWeight);
    if (
      targetWeightKg === null ||
      targetWeightKg < TARGET_WEIGHT_MIN ||
      targetWeightKg > TARGET_WEIGHT_MAX
    ) {
      errors.targetWeight = `Number between ${TARGET_WEIGHT_MIN} and ${TARGET_WEIGHT_MAX} kg`;
    }
  }

  let targetRateKgPerWeek: number | null = null;
  if (input.targetRate.trim() !== "") {
    targetRateKgPerWeek = parseDecimal(input.targetRate);
    if (
      targetRateKgPerWeek === null ||
      Math.abs(targetRateKgPerWeek) > TARGET_RATE_LIMIT
    ) {
      errors.targetRate = `Number between -${TARGET_RATE_LIMIT} and +${TARGET_RATE_LIMIT} kg/week`;
    }
  }

  const rateToleranceKgPerWeek = parseDecimal(input.tolerance);
  if (
    rateToleranceKgPerWeek === null ||
    rateToleranceKgPerWeek < TOLERANCE_MIN ||
    rateToleranceKgPerWeek > TOLERANCE_MAX
  ) {
    errors.tolerance = `Number between ${TOLERANCE_MIN} and ${TOLERANCE_MAX} kg/week`;
  }

  if (!errors.targetWeight && !errors.targetRate) {
    const directionError = checkRateDirection(
      currentWeightKg,
      targetWeightKg,
      targetRateKgPerWeek,
    );
    if (directionError) errors.targetRate = directionError;
  }

  if (Object.keys(errors).length > 0 || rateToleranceKgPerWeek === null) {
    return { ok: false, errors };
  }
  return {
    ok: true,
    targetWeightKg,
    targetRateKgPerWeek,
    rateToleranceKgPerWeek,
  };
}

export function formatRate(rate: number): string {
  return rate > 0 ? `+${rate}` : String(rate);
}
