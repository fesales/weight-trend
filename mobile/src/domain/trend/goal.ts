export function distanceToTarget(
  currentWeightKg: number | null,
  targetWeightKg: number | null,
): number | null {
  if (currentWeightKg === null || targetWeightKg === null) return null;
  return targetWeightKg - currentWeightKg;
}

export function weeksToTarget(
  distanceKg: number | null,
  rateKgPerWeek: number | null,
): number | null {
  if (distanceKg === null || rateKgPerWeek === null) return null;
  if (distanceKg === 0) return 0;
  if (
    rateKgPerWeek === 0 ||
    Math.sign(rateKgPerWeek) !== Math.sign(distanceKg)
  ) {
    return null;
  }
  return distanceKg / rateKgPerWeek;
}

export function checkRateDirection(
  currentWeightKg: number | null,
  targetWeightKg: number | null,
  targetRateKgPerWeek: number | null,
): string | null {
  if (
    currentWeightKg === null ||
    targetWeightKg === null ||
    targetRateKgPerWeek === null ||
    targetRateKgPerWeek === 0 ||
    targetWeightKg === currentWeightKg
  ) {
    return null;
  }
  const above = targetWeightKg > currentWeightKg;
  if (above === targetRateKgPerWeek > 0) return null;
  const current = currentWeightKg.toFixed(1);
  return above
    ? `Target ${targetWeightKg} kg is above your current ${current} kg, so the rate should be positive.`
    : `Target ${targetWeightKg} kg is below your current ${current} kg, so the rate should be negative.`;
}
