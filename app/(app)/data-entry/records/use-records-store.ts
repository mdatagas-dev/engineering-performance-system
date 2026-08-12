"use client";

import { useSyncExternalStore } from "react";
import type { MockProductionRecord } from "@/lib/mocks/records";
import type { RecordsStore } from "@/lib/records/state";

// Bind store (lib/records/state.ts) ke React: satu sumber kebenaran —
// form, quick-entry, tabel, total row & KPI semua baca dari sini.
export function useRecordsStore(store: RecordsStore): MockProductionRecord[] {
  return useSyncExternalStore(store.subscribe, store.getRecords, store.getRecords);
}