import { parseDecimal } from "./numbers";

export const TARGET_WEIGHT_MIN = 30;
export const TARGET_WEIGHT_MAX = 300;
export const TARGET_RATE_LIMIT = 2;

export type TargetsInput = { targetWeight: string; targetRate: string };
export type TargetsErrors = Partial<Record<keyof TargetsInput, string>>;
export type TargetsResult =
  | { ok: true; targetWeightKg: number | null; targetRateKgPerWeek: number | null }
  | { ok: false; errors: TargetsErrors };

export function parseTargets(input: TargetsInput): TargetsResult {
  const errors: TargetsErrors = {};

  let targetWeightKg: number | null = null;
  if (input.targetWeight.trim() !== "") {
    targetWeightKg = parseDecimal(input.targetWeight);
    if (targetWeightKg === null || targetWeightKg < TARGET_WEIGHT_MIN || targetWeightKg > TARGET_WEIGHT_MAX) {
      errors.targetWeight = `Number between ${TARGET_WEIGHT_MIN} and ${TARGET_WEIGHT_MAX} kg`;
    }
  }

  let targetRateKgPerWeek: number | null = null;
  if (input.targetRate.trim() !== "") {
    targetRateKgPerWeek = parseDecimal(input.targetRate);
    if (targetRateKgPerWeek === null || Math.abs(targetRateKgPerWeek) > TARGET_RATE_LIMIT) {
      errors.targetRate = `Number between -${TARGET_RATE_LIMIT} and +${TARGET_RATE_LIMIT} kg/week`;
    }
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, targetWeightKg, targetRateKgPerWeek };
}

export function formatRate(rate: number): string {
  return rate > 0 ? `+${rate}` : String(rate);
}
