import { fireEvent, render, screen } from "@testing-library/react-native";
import { router } from "expo-router";

import SettingsScreen from "@/app/(tabs)/settings";
import { listPeriods } from "@/db/caloriePeriods";
import { listEntries } from "@/db/dailyEntries";
import { getSettings, updateSettings } from "@/db/settings";
import type { CaloriePeriod, DailyEntry } from "@/db/types";

// Must be a stable instance, or the focus effect re-runs forever.
jest.mock("expo-sqlite", () => {
  const db = {};
  return { useSQLiteContext: () => db };
});
jest.mock("expo-router", () => {
  const React = jest.requireActual<typeof import("react")>("react");
  return {
    router: { push: jest.fn() },
    useFocusEffect: (effect: () => void | (() => void)) =>
      React.useEffect(effect, [effect]),
  };
});
jest.mock("@/db/settings", () => ({
  getSettings: jest.fn(),
  updateSettings: jest.fn(),
}));
jest.mock("@/db/caloriePeriods", () => ({ listPeriods: jest.fn() }));
jest.mock("@/db/dailyEntries", () => ({ listEntries: jest.fn() }));
jest.mock("@/domain/dates", () => ({
  ...jest.requireActual<typeof import("@/domain/dates")>("@/domain/dates"),
  todayLocal: () => "2026-10-11",
}));

const mockGetSettings = getSettings as jest.Mock;
const mockUpdateSettings = updateSettings as jest.Mock;
const mockListPeriods = listPeriods as jest.Mock;
const mockListEntries = listEntries as jest.Mock;

function weighIn(date: string, weightKg: number): DailyEntry {
  return {
    date,
    weightKg,
    weightSource: "manual",
    caloriesKcal: null,
    caloriesSource: null,
    flags: [],
    note: null,
    createdAt: "",
    updatedAt: "",
  };
}

async function saveTargets(values: {
  targetWeight?: string;
  targetRate?: string;
  tolerance?: string;
}) {
  await screen.findByText("No periods yet.");
  const fields = {
    targetWeight: "Target weight (kg)",
    targetRate: "Target rate (kg/week)",
    tolerance: "Tolerance (kg/week)",
  } as const;
  for (const [key, label] of Object.entries(fields)) {
    const value = values[key as keyof typeof fields];
    if (value !== undefined) {
      await fireEvent.changeText(screen.getByLabelText(label), value);
    }
  }
  await fireEvent.press(screen.getByRole("button", { name: "Save targets" }));
}

function period(overrides: Partial<CaloriePeriod>): CaloriePeriod {
  return {
    id: 1,
    startDate: "2026-08-24",
    endDate: "2026-09-14",
    targetKcal: 2700,
    label: "Bulk",
    reason: null,
    createdAt: "",
    updatedAt: "",
    ...overrides,
  };
}

describe("settings.tsx", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSettings.mockResolvedValue({
      targetWeightKg: null,
      targetRateKgPerWeek: null,
      rateToleranceKgPerWeek: 0.1,
      updatedAt: "",
    });
    mockListPeriods.mockResolvedValue([]);
    mockListEntries.mockResolvedValue([]);
    mockUpdateSettings.mockResolvedValue(undefined);
  });

  describe("GIVEN stored targets", () => {
    it("SHOULD show them, with the rate signed", async () => {
      mockGetSettings.mockResolvedValue({
        targetWeightKg: 82,
        targetRateKgPerWeek: 0.25,
        rateToleranceKgPerWeek: 0.15,
        updatedAt: "",
      });

      await render(<SettingsScreen />);

      expect(await screen.findByDisplayValue("82")).toBeOnTheScreen();
      expect(screen.getByLabelText("Target rate (kg/week)")).toHaveDisplayValue(
        "+0.25",
      );
      expect(screen.getByLabelText("Tolerance (kg/week)")).toHaveDisplayValue(
        "0.15",
      );
    });
  });

  describe("GIVEN no targets set", () => {
    it("SHOULD show empty fields and no periods", async () => {
      await render(<SettingsScreen />);

      expect(await screen.findByText("No periods yet.")).toBeOnTheScreen();
      expect(screen.getByLabelText("Target weight (kg)")).toHaveDisplayValue(
        "",
      );
    });
  });

  describe("GIVEN valid targets typed in", () => {
    it("SHOULD save them and confirm", async () => {
      await render(<SettingsScreen />);
      await screen.findByText("No periods yet.");
      await fireEvent.changeText(
        screen.getByLabelText("Target weight (kg)"),
        "82,5",
      );
      await fireEvent.changeText(
        screen.getByLabelText("Target rate (kg/week)"),
        "-0.5",
      );

      await fireEvent.press(
        screen.getByRole("button", { name: "Save targets" }),
      );

      expect(await screen.findByText("Saved")).toBeOnTheScreen();
      expect(mockUpdateSettings).toHaveBeenCalledWith(expect.anything(), {
        targetWeightKg: 82.5,
        targetRateKgPerWeek: -0.5,
        rateToleranceKgPerWeek: 0.1,
      });
    });
  });

  describe("GIVEN invalid targets typed in", () => {
    it("SHOULD show the errors and not save", async () => {
      await render(<SettingsScreen />);
      await screen.findByText("No periods yet.");
      await fireEvent.changeText(
        screen.getByLabelText("Target weight (kg)"),
        "820",
      );
      await fireEvent.changeText(
        screen.getByLabelText("Target rate (kg/week)"),
        "fast",
      );

      await fireEvent.press(
        screen.getByRole("button", { name: "Save targets" }),
      );

      expect(
        await screen.findByText("Number between 30 and 300 kg"),
      ).toBeOnTheScreen();
      expect(
        screen.getByText("Number between -2 and +2 kg/week"),
      ).toBeOnTheScreen();
      expect(mockUpdateSettings).not.toHaveBeenCalled();
    });
  });

  describe("GIVEN a tolerance typed in", () => {
    it("SHOULD save a valid one", async () => {
      await render(<SettingsScreen />);

      await saveTargets({ tolerance: "0,2" });

      expect(await screen.findByText("Saved")).toBeOnTheScreen();
      expect(mockUpdateSettings).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ rateToleranceKgPerWeek: 0.2 }),
      );
    });

    it("SHOULD reject one out of range", async () => {
      await render(<SettingsScreen />);

      await saveTargets({ tolerance: "0" });

      expect(
        await screen.findByText("Number between 0.01 and 1 kg/week"),
      ).toBeOnTheScreen();
      expect(mockUpdateSettings).not.toHaveBeenCalled();
    });
  });

  describe("GIVEN recent weigh-ins below the target weight", () => {
    beforeEach(() => {
      mockListEntries.mockResolvedValue(
        ["2026-10-08", "2026-10-09", "2026-10-10", "2026-10-11"].map((date) =>
          weighIn(date, 79.4),
        ),
      );
    });

    it("SHOULD reject a negative rate", async () => {
      await render(<SettingsScreen />);

      await saveTargets({ targetWeight: "82", targetRate: "-0.25" });

      expect(
        await screen.findByText(
          "Target 82 kg is above your current 79.4 kg, so the rate should be positive.",
        ),
      ).toBeOnTheScreen();
      expect(mockUpdateSettings).not.toHaveBeenCalled();
    });

    it.each(["+0.25", "0"])("SHOULD save a rate of %s", async (targetRate) => {
      await render(<SettingsScreen />);

      await saveTargets({ targetWeight: "82", targetRate });

      expect(await screen.findByText("Saved")).toBeOnTheScreen();
    });
  });

  describe("GIVEN no weigh-ins", () => {
    it("SHOULD skip the direction check", async () => {
      await render(<SettingsScreen />);

      await saveTargets({ targetWeight: "82", targetRate: "-0.25" });

      expect(await screen.findByText("Saved")).toBeOnTheScreen();
    });
  });

  describe("GIVEN stored calorie periods", () => {
    it("SHOULD list them newest first with their details", async () => {
      mockListPeriods.mockResolvedValue([
        period({
          id: 1,
          label: "Bulk",
          startDate: "2026-08-24",
          endDate: "2026-09-14",
          reason: "start",
        }),
        period({
          id: 2,
          label: "Bulk 2",
          startDate: "2026-09-15",
          endDate: null,
          targetKcal: 2850,
        }),
      ]);

      await render(<SettingsScreen />);

      const rows = await screen.findAllByRole("button", { name: /^Edit / });
      expect(rows.map((row) => row.props.accessibilityLabel)).toEqual([
        "Edit Bulk 2",
        "Edit Bulk",
      ]);
      expect(screen.getByText("Bulk 2 · 2,850 kcal")).toBeOnTheScreen();
      expect(screen.getByText("2026-09-15 → ongoing")).toBeOnTheScreen();
      expect(screen.getByText("start")).toBeOnTheScreen();
    });

    it("SHOULD open the editor for a tapped period", async () => {
      mockListPeriods.mockResolvedValue([period({ id: 7 })]);
      await render(<SettingsScreen />);

      await fireEvent.press(
        await screen.findByRole("button", { name: "Edit Bulk" }),
      );

      expect(router.push).toHaveBeenCalledWith("/period/7");
    });
  });

  describe("GIVEN the add period button", () => {
    it("SHOULD open the editor for a new period", async () => {
      await render(<SettingsScreen />);
      await screen.findByText("No periods yet.");

      await fireEvent.press(screen.getByRole("button", { name: "Add period" }));

      expect(router.push).toHaveBeenCalledWith("/period/new");
    });
  });
});
