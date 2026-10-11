import { SAMPLE_HISTORY } from "@/test/sampleHistory";

import type { TrendPeriod } from "./calories";
import { computeSnapshot, type TrendSettings } from "./snapshot";

const BULK: TrendPeriod = {
  id: 1,
  label: "Bulk",
  startDate: "2026-08-24",
  endDate: "2026-09-14",
  targetKcal: 2700,
  reason: "start",
};
const BULK_2: TrendPeriod = {
  id: 2,
  label: "Bulk 2",
  startDate: "2026-09-15",
  endDate: null,
  targetKcal: 2850,
  reason: "stalled",
};
const SETTINGS: TrendSettings = {
  targetWeightKg: 82,
  targetRateKgPerWeek: 0.25,
  rateToleranceKgPerWeek: 0.1,
};

describe("snapshot.ts", () => {
  describe("GIVEN the 35-day sample history on its last day", () => {
    const snapshot = computeSnapshot({
      rows: SAMPLE_HISTORY,
      periods: [BULK_2, BULK],
      settings: SETTINGS,
      today: "2026-09-30",
    });

    it("SHOULD compute the current weight and rates", () => {
      const { avg7Kg, currentWeightKg, rates } = snapshot;

      expect(avg7Kg).toBeCloseTo(79.2857, 4);
      expect(currentWeightKg).toBeCloseTo(79.2857, 4);
      expect(rates.weeklyKgPerWeek).toBeCloseTo(0.3024, 4);
      expect(rates.rate14KgPerWeek).toBeCloseTo(0.1679, 4);
      expect(rates.rate21KgPerWeek).toBeCloseTo(0.2397, 4);
    });

    it("SHOULD call it gaining and on track", () => {
      const { trend, status } = snapshot;

      expect([trend, status]).toEqual(["gaining", "on_track"]);
    });

    it("SHOULD measure the distance and weeks to target", () => {
      const { target } = snapshot;

      expect(target.weightKg).toBe(82);
      expect(target.rateKgPerWeek).toBe(0.25);
      expect(target.toleranceKgPerWeek).toBe(0.1);
      expect(target.distanceKg).toBeCloseTo(2.7143, 4);
      expect(target.weeksToTarget).toBeCloseTo(16.1702, 4);
    });

    it("SHOULD average the last 7 days of calories against the current period", () => {
      const { calories, currentPeriod } = snapshot;

      expect(calories.averageKcal).toBeCloseTo(2654.29, 2);
      expect(calories.daysWithCalories).toBe(7);
      expect(calories.period).toBe(BULK_2);
      expect(currentPeriod).toBe(BULK_2);
    });

    it("SHOULD summarise both periods", () => {
      const [bulk, bulk2] = snapshot.periodSummaries;

      expect(bulk.label).toBe("Bulk");
      expect(bulk.avgIntakeKcal).toBeCloseTo(2716.67, 2);
      expect(bulk.intakeDays).toBe(18);
      expect(bulk.startWeightKg).toBeCloseTo(78.2333, 4);
      expect(bulk.endWeightKg).toBeCloseTo(78.725, 4);
      expect(bulk.rateKgPerWeek).toBeCloseTo(0.2294, 4);
      expect(bulk2.label).toBe("Bulk 2");
      expect(bulk2.avgIntakeKcal).toBeCloseTo(2675.71, 2);
      expect(bulk2.intakeDays).toBe(14);
      expect(bulk2.startWeightKg).toBeCloseTo(78.95, 4);
      expect(bulk2.endWeightKg).toBeCloseTo(79.2857, 4);
      expect(bulk2.rateKgPerWeek).toBeCloseTo(0.2611, 4);
    });

    it("SHOULD give six calendar weeks with their counts", () => {
      const weeks = snapshot.weeklyAverages.map((w) => [
        w.weekStart,
        w.weighIns,
        w.calorieDays,
      ]);

      expect(weeks).toEqual([
        ["2026-08-24", 6, 7],
        ["2026-08-31", 6, 6],
        ["2026-09-07", 5, 5],
        ["2026-09-14", 6, 5],
        ["2026-09-21", 6, 7],
        ["2026-09-28", 3, 3],
      ]);
      expect(snapshot.weeklyAverages[5].avgWeightKg).toBeCloseTo(79.5333, 4);
      expect(snapshot.weeklyAverages[0].avgCaloriesKcal).toBeCloseTo(
        2718.57,
        2,
      );
    });
  });

  describe("GIVEN no history and no targets", () => {
    it("SHOULD return nulls and not_enough_data rather than made-up numbers", () => {
      const result = computeSnapshot({
        rows: [],
        periods: [],
        settings: {
          targetWeightKg: null,
          targetRateKgPerWeek: null,
          rateToleranceKgPerWeek: 0.1,
        },
        today: "2026-10-11",
      });

      expect(result).toEqual({
        today: "2026-10-11",
        avg7Kg: null,
        currentWeightKg: null,
        rates: {
          weeklyKgPerWeek: null,
          rate14KgPerWeek: null,
          rate21KgPerWeek: null,
        },
        trend: null,
        status: "not_enough_data",
        target: {
          weightKg: null,
          rateKgPerWeek: null,
          toleranceKgPerWeek: 0.1,
          distanceKg: null,
          weeksToTarget: null,
        },
        calories: { averageKcal: null, daysWithCalories: 0, period: null },
        currentPeriod: null,
        weeklyAverages: [],
        periodSummaries: [],
      });
    });
  });
});
