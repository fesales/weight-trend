import { render, screen } from "@testing-library/react-native";

import SettingsScreen from "@/app/(tabs)/settings";

describe("settings.tsx", () => {
  describe("GIVEN the settings screen", () => {
    it("SHOULD show the Settings title", async () => {
      await render(<SettingsScreen />);

      expect(screen.getByText("Settings")).toBeOnTheScreen();
    });
  });
});
