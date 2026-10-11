import { dayRows } from "@/test/series";

import { calorieAverage7, periodOn, type TrendPeriod } from "./calories";
import { toSeries } from "./series";

const BULK: TrendPeriod = {
  id: 1,
  label: "Bulk",
  startDate: "2026-09-01",
  endDate: "2026-10-10",
  targetKcal: 2800,
  reason: null,
};
const NEXT: TrendPeriod = {
  id: 2,
  label: "Bulk 2",
  startDate: "2026-10-11",
  endDate: null,
  targetKcal: 2900,
  reason: "stalled",
};

describe("calories.ts", () => {
  describe("GIVEN periods and a date", () => {
    it.each([
      ["2026-09-01", BULK],
      ["2026-10-10", BULK],
      ["2026-10-11", NEXT],
      ["2030-01-01", NEXT],
      ["2026-08-31", null],
    ])("SHOULD place %s in the right period", (date, expected) => {
      const result = periodOn(date, [BULK, NEXT]);

      expect(result).toBe(expected);
    });

    it("SHOULD find no period in a gap", () => {
      const result = periodOn("2026-10-11", [BULK]);

      expect(result).toBeNull();
    });
  });

  describe("GIVEN calories for the 7 days before today", () => {
    it("SHOULD average D-7 to D-1, ignoring today and earlier days", () => {
      const series = toSeries(
        dayRows("2026-10-03", {
          calories: [9999, 2600, 2700, null, 2800, null, 2900, null, 9999],
        }),
      );

      const result = calorieAverage7(series, [BULK, NEXT], "2026-10-11");

      expect(result).toEqual({
        averageKcal: 2750,
        daysWithCalories: 4,
        period: BULK,
      });
    });

    it("SHOULD return no average with only 3 days, but keep the count", () => {
      const series = toSeries(
        dayRows("2026-10-04", {
          calories: [2600, null, 2700, null, null, 2800],
        }),
      );

      const result = calorieAverage7(series, [BULK], "2026-10-11");

      expect(result).toEqual({
        averageKcal: null,
        daysWithCalories: 3,
        period: BULK,
      });
    });

    it("SHOULD use the period containing yesterday", () => {
      const series = toSeries(dayRows("2026-10-04", { calories: [] }));

      const result = calorieAverage7(series, [BULK, NEXT], "2026-10-12");

      expect(result.period).toBe(NEXT);
    });

    it("SHOULD have no period when yesterday is outside all periods", () => {
      const series = toSeries(dayRows("2026-10-04", { calories: [] }));

      const result = calorieAverage7(series, [BULK], "2026-10-12");

      expect(result.period).toBeNull();
    });
  });
});
