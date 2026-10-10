import { fireEvent, render, screen } from "@testing-library/react-native";

import { Field } from "./Field";

describe("Field.tsx", () => {
  describe("GIVEN a labelled field", () => {
    it("SHOULD show the label, value and hint", async () => {
      await render(
        <Field
          label="Target weight (kg)"
          value="82"
          hint="Blank = not set"
          onChangeText={jest.fn()}
        />,
      );

      expect(screen.getByText("Target weight (kg)")).toBeOnTheScreen();
      expect(screen.getByLabelText("Target weight (kg)")).toHaveDisplayValue(
        "82",
      );
      expect(screen.getByText("Blank = not set")).toBeOnTheScreen();
    });

    it("SHOULD report typed text", async () => {
      const onChangeText = jest.fn();
      await render(
        <Field label="Label" value="" onChangeText={onChangeText} />,
      );

      await fireEvent.changeText(screen.getByLabelText("Label"), "Bulk");

      expect(onChangeText).toHaveBeenCalledWith("Bulk");
    });
  });

  describe("GIVEN a field with an error", () => {
    it("SHOULD show the error instead of the hint", async () => {
      await render(
        <Field
          label="Rate"
          value="9"
          hint="the hint"
          error="Too big"
          onChangeText={jest.fn()}
        />,
      );

      expect(screen.getByText("Too big")).toBeOnTheScreen();
      expect(screen.queryByText("the hint")).not.toBeOnTheScreen();
    });
  });
});
