import { Stack } from "expo-router";
import { SQLiteProvider } from "expo-sqlite";
import { StatusBar } from "expo-status-bar";

import { DB_NAME, migrate } from "@/db/migrations";

export default function RootLayout() {
  return (
    <SQLiteProvider databaseName={DB_NAME} onInit={migrate}>
      <Stack screenOptions={{ headerShown: false }} />
      <StatusBar style="auto" />
    </SQLiteProvider>
  );
}
