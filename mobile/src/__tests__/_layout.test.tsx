import { renderRouter, screen } from "expo-router/testing-library";
import { SQLiteProvider } from "expo-sqlite";
import { Text } from "react-native";

import RootLayout from "@/app/_layout";
import { initDb } from "@/db/init";

jest.mock("expo-sqlite", () => {
  const React = jest.requireActual<typeof import("react")>("react");
  return {
    SQLiteProvider: jest.fn(({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
    ),
  };
});
jest.mock("@/db/init", () => ({ initDb: jest.fn() }));

// The native stack doesn't render a header in tests, only this config view.
function headerConfig(): Record<string, unknown> | undefined {
  type Node = { type: string; props: Record<string, unknown>; children: (Node | string)[] | null };
  const found: Node[] = [];
  const walk = (node: Node | Node[] | string | null) => {
    if (node === null || typeof node === "string") return;
    if (Array.isArray(node)) return node.forEach(walk);
    if (node.type === "RNSScreenStackHeaderConfig") found.push(node);
    node.children?.forEach(walk);
  };
  walk(screen.toJSON() as Node | Node[] | null);
  return found.at(-1)?.props;
}

describe("_layout.tsx (root)", () => {
  describe("GIVEN the root layout", () => {
    it("SHOULD open the database with initDb as the startup hook", async () => {
      await renderRouter(
        { _layout: () => <RootLayout />, "(tabs)/index": () => <Text>Today body</Text> },
        { initialUrl: "/" },
      );

      expect(screen.getByText("Today body")).toBeOnTheScreen();
      expect(SQLiteProvider).toHaveBeenCalledWith(
        expect.objectContaining({ databaseName: "weight-trend.db", onInit: initDb }),
        undefined,
      );
    });

    it("SHOULD show the period editor with a header", async () => {
      await renderRouter(
        {
          _layout: () => <RootLayout />,
          "(tabs)/index": () => <Text>Today body</Text>,
          "period/[id]": () => <Text>Period editor</Text>,
        },
        { initialUrl: "/period/new" },
      );

      expect(screen.getByText("Period editor")).toBeOnTheScreen();
      expect(headerConfig()?.hidden).toBeFalsy();
    });

    it("SHOULD hide the header on the tabs", async () => {
      await renderRouter(
        { _layout: () => <RootLayout />, "(tabs)/index": () => <Text>Today body</Text> },
        { initialUrl: "/" },
      );

      expect(headerConfig()?.hidden).toBe(true);
    });
  });
});
