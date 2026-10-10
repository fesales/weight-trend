import { renderRouter, screen } from "expo-router/testing-library";
import { Text } from "react-native";

import TabsLayout from "@/app/(tabs)/_layout";

describe("_layout.tsx", () => {
  describe("GIVEN the tab layout", () => {
    it("SHOULD show the Today, History and Settings tabs", async () => {
      await renderRouter(
        {
          _layout: () => <TabsLayout />,
          index: () => <Text>Today body</Text>,
          history: () => <Text>History body</Text>,
          settings: () => <Text>Settings body</Text>,
        },
        { initialUrl: "/" },
      );

      expect(
        screen.getByRole("button", { name: /^Today, tab/ }),
      ).toBeOnTheScreen();
      expect(
        screen.getByRole("button", { name: /^History, tab/ }),
      ).toBeOnTheScreen();
      expect(
        screen.getByRole("button", { name: /^Settings, tab/ }),
      ).toBeOnTheScreen();
    });
  });
});
