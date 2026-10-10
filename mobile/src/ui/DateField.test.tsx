import { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { fireEvent, render, screen } from "@testing-library/react-native";

import { DateField } from "./DateField";

jest.mock("@react-native-community/datetimepicker", () => ({
  DateTimePickerAndroid: { open: jest.fn() },
}));

const open = DateTimePickerAndroid.open as jest.Mock;

type PickerParams = {
  value: Date;
  onChange: (event: { type: string }, date?: Date) => void;
};

function lastPickerParams(): PickerParams {
  return open.mock.calls[open.mock.calls.length - 1][0];
}

describe("DateField.tsx", () => {
  beforeEach(() => {
    open.mockReset();
  });

  describe("GIVEN a date field with a value", () => {
    it("SHOULD open the picker on that date", async () => {
      await render(
        <DateField label="Start" value="2026-09-15" onChange={jest.fn()} />,
      );

      await fireEvent.press(screen.getByLabelText("Start: 2026-09-15"));

      const { value } = lastPickerParams();
      expect([value.getFullYear(), value.getMonth(), value.getDate()]).toEqual([
        2026, 8, 15,
      ]);
    });

    it("SHOULD report the picked day as YYYY-MM-DD", async () => {
      const onChange = jest.fn();
      await render(
        <DateField label="Start" value="2026-09-15" onChange={onChange} />,
      );
      await fireEvent.press(screen.getByLabelText("Start: 2026-09-15"));

      lastPickerParams().onChange(
        { type: "set" },
        new Date(2026, 9, 1, 23, 30),
      );

      expect(onChange).toHaveBeenCalledWith("2026-10-01");
    });

    it("SHOULD ignore a dismissed picker", async () => {
      const onChange = jest.fn();
      await render(
        <DateField label="Start" value="2026-09-15" onChange={onChange} />,
      );
      await fireEvent.press(screen.getByLabelText("Start: 2026-09-15"));

      lastPickerParams().onChange({ type: "dismissed" }, new Date(2026, 9, 1));

      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe("GIVEN an empty date field with a default", () => {
    it("SHOULD open the picker on the default date", async () => {
      await render(
        <DateField
          label="End"
          value={null}
          defaultDate="2026-10-07"
          onChange={jest.fn()}
        />,
      );

      await fireEvent.press(screen.getByLabelText("End: not set"));

      expect(lastPickerParams().value.getDate()).toBe(7);
    });
  });

  describe("GIVEN a field that allows ongoing", () => {
    it("SHOULD hide the date button while ongoing", async () => {
      await render(
        <DateField
          label="End"
          value={null}
          allowOngoing
          onChange={jest.fn()}
        />,
      );

      expect(screen.getByLabelText("End ongoing")).toHaveProp("value", true);
      expect(
        screen.queryByRole("button", { name: /End:/ }),
      ).not.toBeOnTheScreen();
    });

    it("SHOULD clear the date when switched to ongoing", async () => {
      const onChange = jest.fn();
      await render(
        <DateField
          label="End"
          value="2026-09-30"
          allowOngoing
          onChange={onChange}
        />,
      );

      await fireEvent(
        screen.getByLabelText("End ongoing"),
        "valueChange",
        true,
      );

      expect(onChange).toHaveBeenCalledWith(null);
    });

    it("SHOULD fall back to the default date when ongoing is switched off", async () => {
      const onChange = jest.fn();
      await render(
        <DateField
          label="End"
          value={null}
          allowOngoing
          defaultDate="2026-10-07"
          onChange={onChange}
        />,
      );

      await fireEvent(
        screen.getByLabelText("End ongoing"),
        "valueChange",
        false,
      );

      expect(onChange).toHaveBeenCalledWith("2026-10-07");
    });
  });

  describe("GIVEN a field with an error", () => {
    it("SHOULD show it", async () => {
      await render(
        <DateField
          label="End"
          value="2026-01-01"
          error="End date is before the start"
          onChange={jest.fn()}
        />,
      );

      expect(
        screen.getByText("End date is before the start"),
      ).toBeOnTheScreen();
    });
  });
});
