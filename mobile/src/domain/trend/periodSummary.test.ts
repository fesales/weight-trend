import { dayRows } from "@/test/series";

import type { TrendPeriod } from "./calories";
import { summarisePeriod, summarisePeriods } from "./periodSummary";
import { toSeries } from "./series";

const PERIOD: TrendPeriod = {
  id: 1,
  label: "Bulk",
  startDate: "2026-09-01",
  endDate: "2026-09-14",
  targetKcal: 2800,
  reason: "start",
};

const sevenAt = (kg: number) => Array<number>(7).fill(kg);

describe("periodSummary.ts", () => {
  describe("GIVEN a closed 14-day period", () => {
    it("SHOULD compare the first and last 7 days over one week", () => {
      const series = toSeries(
        dayRows("2026-09-01", {
          weights: [...sevenAt(80), ...sevenAt(81)],
          calories: [2700, 2900, ...Array<number | null>(12).fill(null)],
        }),
      );

      const result = summarisePeriod(series, PERIOD, "2026-10-11");

      expect(result).toEqual({
        id: 1,
        label: "Bulk",
        startDate: "2026-09-01",
        endDate: "2026-09-14",
        reason: "start",
        targetKcal: 2800,
        avgIntakeKcal: 2800,
        intakeDays: 2,
        startWeightKg: 80,
        endWeightKg: 81,
        rateKgPerWeek: 1,
      });
    });
  });

  describe("GIVEN a period shorter than 14 days", () => {
    it("SHOULD give no weights or rate but still the intake", () => {
      const series = toSeries(
        dayRows("2026-09-01", { weights: sevenAt(80), calories: [2500] }),
      );

      const result = summarisePeriod(
        series,
        { ...PERIOD, endDate: "2026-09-13" },
        "2026-10-11",
      );

      expect(result).toEqual(
        expect.objectContaining({
          avgIntakeKcal: 2500,
          startWeightKg: null,
          endWeightKg: null,
          rateKgPerWeek: null,
        }),
      );
    });
  });

  describe("GIVEN a sparse first week", () => {
    it("SHOULD give no start weight and no rate", () => {
      const series = toSeries(
        dayRows("2026-09-01", {
          weights: [80, null, 80, null, 80, null, null, ...sevenAt(81)],
        }),
      );

      const result = summarisePeriod(series, PERIOD, "2026-10-11");

      expect([
        result.startWeightKg,
        result.endWeightKg,
        result.rateKgPerWeek,
      ]).toEqual([null, 81, null]);
    });
  });

  describe("GIVEN the current, open-ended period", () => {
    const series = toSeries(
      dayRows("2026-09-01", {
        weights: [...sevenAt(80), ...sevenAt(80.5), ...sevenAt(81)],
        calories: [2600, ...Array<number | null>(19).fill(null), 9999],
      }),
    );

    it("SHOULD end at today and measure over the weeks between the windows", () => {
      const result = summarisePeriod(
        series,
        { ...PERIOD, endDate: null },
        "2026-09-21",
      );

      expect([result.startWeightKg, result.endWeightKg]).toEqual([80, 81]);
      expect(result.rateKgPerWeek).toBeCloseTo(0.5, 10);
    });

    it("SHOULD leave today's calories out of the intake", () => {
      const result = summarisePeriod(
        series,
        { ...PERIOD, endDate: null },
        "2026-09-21",
      );

      expect([result.avgIntakeKcal, result.intakeDays]).toEqual([2600, 1]);
    });

    it("SHOULD treat an end date after today like an open end", () => {
      const result = summarisePeriod(
        series,
        { ...PERIOD, endDate: "2026-12-31" },
        "2026-09-21",
      );

      expect([result.endWeightKg, result.endDate]).toEqual([81, "2026-12-31"]);
    });
  });

  describe("GIVEN a period that starts after today", () => {
    it("SHOULD have no numbers", () => {
      const series = toSeries(dayRows("2026-09-01", { weights: sevenAt(80) }));

      const result = summarisePeriod(
        series,
        { ...PERIOD, startDate: "2026-11-01", endDate: null },
        "2026-10-11",
      );

      expect(result).toEqual(
        expect.objectContaining({
          avgIntakeKcal: null,
          intakeDays: 0,
          rateKgPerWeek: null,
        }),
      );
    });
  });

  describe("GIVEN several periods out of order", () => {
    it("SHOULD summarise them oldest first", () => {
      const later = {
        ...PERIOD,
        id: 2,
        label: "Later",
        startDate: "2026-09-15",
        endDate: null,
      };

      const result = summarisePeriods(
        toSeries([]),
        [later, PERIOD],
        "2026-10-11",
      );

      expect(result.map((s) => s.label)).toEqual(["Bulk", "Later"]);
    });
  });
});
