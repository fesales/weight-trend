import { toSeries, type DayRow } from "./series";
import { weeklyAverages } from "./weekly";

function row(
  date: string,
  weightKg: number | null,
  caloriesKcal: number | null,
): DayRow {
  return { date, weightKg, caloriesKcal };
}

describe("weekly.ts", () => {
  describe("GIVEN days around a Sunday to Monday change", () => {
    it("SHOULD split them into Monday-start weeks", () => {
      const series = toSeries([
        row("2026-10-05", 80, 2600),
        row("2026-10-11", 81, 2800),
        row("2026-10-12", 82, null),
      ]);

      const result = weeklyAverages(series);

      expect(result).toEqual([
        {
          weekStart: "2026-10-05",
          avgWeightKg: 80.5,
          weighIns: 2,
          avgCaloriesKcal: 2700,
          calorieDays: 2,
        },
        {
          weekStart: "2026-10-12",
          avgWeightKg: 82,
          weighIns: 1,
          avgCaloriesKcal: null,
          calorieDays: 0,
        },
      ]);
    });
  });

  describe("GIVEN a week spanning the new year", () => {
    it("SHOULD keep it as one week starting in December", () => {
      const series = toSeries([
        row("2027-01-03", 80, null),
        row("2026-12-29", 79, null),
      ]);

      const result = weeklyAverages(series);

      expect(result).toEqual([
        {
          weekStart: "2026-12-28",
          avgWeightKg: 79.5,
          weighIns: 2,
          avgCaloriesKcal: null,
          calorieDays: 0,
        },
      ]);
    });
  });

  describe("GIVEN a week with only calories and a week with no data", () => {
    it("SHOULD keep the calorie week and skip the empty one", () => {
      const series = toSeries([
        row("2026-09-01", null, 2500),
        row("2026-09-17", 80, null),
      ]);

      const result = weeklyAverages(series);

      expect(
        result.map((w) => [w.weekStart, w.avgWeightKg, w.avgCaloriesKcal]),
      ).toEqual([
        ["2026-08-31", null, 2500],
        ["2026-09-14", 80, null],
      ]);
    });
  });

  describe("GIVEN no data", () => {
    it("SHOULD return no weeks", () => {
      const result = weeklyAverages(toSeries([]));

      expect(result).toEqual([]);
    });
  });
});
