import { fireEvent, render, screen } from "@testing-library/react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Alert, type AlertButton } from "react-native";

import PeriodScreen from "@/app/period/[id]";
import {
  deletePeriod,
  getPeriod,
  insertPeriod,
  insertPeriodClosingPrevious,
  listPeriods,
  updatePeriod,
} from "@/db/caloriePeriods";
import type { CaloriePeriod } from "@/db/types";

jest.mock("expo-sqlite", () => {
  const db = {};
  return { useSQLiteContext: () => db };
});
jest.mock("expo-router", () => ({
  router: { back: jest.fn() },
  Stack: { Screen: () => null },
  useLocalSearchParams: jest.fn(),
}));
jest.mock("@/db/caloriePeriods", () => ({
  deletePeriod: jest.fn(),
  getPeriod: jest.fn(),
  insertPeriod: jest.fn(),
  insertPeriodClosingPrevious: jest.fn(),
  listPeriods: jest.fn(),
  updatePeriod: jest.fn(),
}));
jest.mock("@/domain/dates", () => ({
  ...jest.requireActual<typeof import("@/domain/dates")>("@/domain/dates"),
  todayLocal: () => "2026-10-07",
}));
jest.mock("@react-native-community/datetimepicker", () => ({
  DateTimePickerAndroid: { open: jest.fn() },
}));

const mockParams = useLocalSearchParams as jest.Mock;
const mockListPeriods = listPeriods as jest.Mock;
const mockGetPeriod = getPeriod as jest.Mock;

const CURRENT: CaloriePeriod = {
  id: 2,
  startDate: "2026-09-15",
  endDate: null,
  targetKcal: 2850,
  label: "Bulk 2",
  reason: "rate stalled",
  createdAt: "",
  updatedAt: "",
};
const PAST: CaloriePeriod = { ...CURRENT, id: 1, startDate: "2026-08-24", endDate: "2026-09-14", label: "Bulk", reason: null };

function answerAlertWith(buttonText: string) {
  jest.spyOn(Alert, "alert").mockImplementation((_title, _message, buttons?: AlertButton[]) => {
    buttons?.find((button) => button.text === buttonText)?.onPress?.();
  });
}

async function fillNewPeriod(label: string, kcal: string) {
  await fireEvent.changeText(await screen.findByLabelText("Label"), label);
  await fireEvent.changeText(screen.getByLabelText("Target (kcal/day)"), kcal);
}

describe("[id].tsx", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
    mockListPeriods.mockResolvedValue([PAST, CURRENT]);
    mockGetPeriod.mockResolvedValue(null);
  });

  describe("GIVEN a new period", () => {
    beforeEach(() => {
      mockParams.mockReturnValue({ id: "new" });
    });

    it("SHOULD start today and be ongoing, with no delete button", async () => {
      await render(<PeriodScreen />);

      expect(await screen.findByLabelText("Start: 2026-10-07")).toBeOnTheScreen();
      expect(screen.getByLabelText("End ongoing")).toHaveProp("value", true);
      expect(screen.queryByRole("button", { name: "Delete period" })).not.toBeOnTheScreen();
    });

    it("SHOULD show field errors and not save an invalid period", async () => {
      await render(<PeriodScreen />);
      await fillNewPeriod("  ", "2800.5");

      await fireEvent.press(screen.getByRole("button", { name: "Save" }));

      expect(screen.getByText("Give it a label")).toBeOnTheScreen();
      expect(screen.getByText("Whole number between 500 and 10000")).toBeOnTheScreen();
      expect(insertPeriod).not.toHaveBeenCalled();
      expect(insertPeriodClosingPrevious).not.toHaveBeenCalled();
    });

    it("SHOULD close the current period and save both after confirming", async () => {
      answerAlertWith("Continue");
      await render(<PeriodScreen />);
      await fillNewPeriod(" Bulk 3 ", "2900");
      await fireEvent.changeText(screen.getByLabelText("Reason (optional)"), "  gaining too slowly ");

      await fireEvent.press(screen.getByRole("button", { name: "Save" }));

      expect(Alert.alert).toHaveBeenCalledWith(
        "End the current period?",
        'This will end "Bulk 2" on 2026-10-06, the day before this one starts.',
        expect.any(Array),
      );
      expect(insertPeriodClosingPrevious).toHaveBeenCalledWith(expect.anything(), { id: 2, endDate: "2026-10-06" }, {
        startDate: "2026-10-07",
        endDate: null,
        targetKcal: 2900,
        label: "Bulk 3",
        reason: "gaining too slowly",
      });
      expect(router.back).toHaveBeenCalled();
    });

    it("SHOULD save nothing when the close prompt is cancelled", async () => {
      answerAlertWith("Cancel");
      await render(<PeriodScreen />);
      await fillNewPeriod("Bulk 3", "2900");

      await fireEvent.press(screen.getByRole("button", { name: "Save" }));

      expect(insertPeriodClosingPrevious).not.toHaveBeenCalled();
      expect(insertPeriod).not.toHaveBeenCalled();
      expect(router.back).not.toHaveBeenCalled();
    });

    it("SHOULD insert directly when there is no open period", async () => {
      mockListPeriods.mockResolvedValue([PAST]);
      await render(<PeriodScreen />);
      await fillNewPeriod("Cut", "2400");

      await fireEvent.press(screen.getByRole("button", { name: "Save" }));

      expect(insertPeriod).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ label: "Cut", targetKcal: 2400 }));
      expect(router.back).toHaveBeenCalled();
    });
  });

  describe("GIVEN an existing period", () => {
    beforeEach(() => {
      mockParams.mockReturnValue({ id: "1" });
      mockGetPeriod.mockResolvedValue(PAST);
    });

    it("SHOULD load its values", async () => {
      await render(<PeriodScreen />);

      expect(await screen.findByDisplayValue("Bulk")).toBeOnTheScreen();
      expect(screen.getByLabelText("Target (kcal/day)")).toHaveDisplayValue("2850");
      expect(screen.getByLabelText("Start: 2026-08-24")).toBeOnTheScreen();
      expect(screen.getByLabelText("End: 2026-09-14")).toBeOnTheScreen();
      expect(mockGetPeriod).toHaveBeenCalledWith(expect.anything(), 1);
    });

    it("SHOULD save changes as an update", async () => {
      await render(<PeriodScreen />);
      await fireEvent.changeText(await screen.findByLabelText("Target (kcal/day)"), "2750");

      await fireEvent.press(screen.getByRole("button", { name: "Save" }));

      expect(updatePeriod).toHaveBeenCalledWith(expect.anything(), 1, {
        startDate: "2026-08-24",
        endDate: "2026-09-14",
        targetKcal: 2750,
        label: "Bulk",
        reason: null,
      });
      expect(router.back).toHaveBeenCalled();
    });

    it("SHOULD block an overlap and name the clashing period", async () => {
      await render(<PeriodScreen />);
      await fireEvent(await screen.findByLabelText("End ongoing"), "valueChange", true);

      await fireEvent.press(screen.getByRole("button", { name: "Save" }));

      expect(
        screen.getByText('Overlaps "Bulk 2" (2026-09-15 → ongoing). Change the dates or edit that period first.'),
      ).toBeOnTheScreen();
      expect(updatePeriod).not.toHaveBeenCalled();
    });

    it("SHOULD delete after confirming", async () => {
      answerAlertWith("Delete");
      await render(<PeriodScreen />);

      await fireEvent.press(await screen.findByRole("button", { name: "Delete period" }));

      expect(deletePeriod).toHaveBeenCalledWith(expect.anything(), 1);
      expect(router.back).toHaveBeenCalled();
    });

    it("SHOULD keep the period when delete is cancelled", async () => {
      answerAlertWith("Cancel");
      await render(<PeriodScreen />);

      await fireEvent.press(await screen.findByRole("button", { name: "Delete period" }));

      expect(deletePeriod).not.toHaveBeenCalled();
      expect(router.back).not.toHaveBeenCalled();
    });
  });

  describe("GIVEN a period id that no longer exists", () => {
    it("SHOULD say so", async () => {
      mockParams.mockReturnValue({ id: "99" });

      await render(<PeriodScreen />);

      expect(await screen.findByText("This period no longer exists.")).toBeOnTheScreen();
    });
  });
});
