import { Stack } from "expo-router";
import { SQLiteProvider } from "expo-sqlite";
import { StatusBar } from "expo-status-bar";

import { initDb } from "@/db/init";
import { DB_NAME } from "@/db/migrations";

export default function RootLayout() {
  return (
    <SQLiteProvider databaseName={DB_NAME} onInit={initDb}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="period/[id]"
          options={{ presentation: "modal", headerShown: true }}
        />
      </Stack>
      <StatusBar style="auto" />
    </SQLiteProvider>
  );
}
