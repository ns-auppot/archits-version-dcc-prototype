/**
 * findings-status-store.ts
 *
 * Lightweight module-level store for runtime finding-status overrides.
 * The mock data is static, so this lets UI actions update status without
 * mutating the source array. Uses a simple pub/sub pattern so any
 * component can subscribe to changes.
 */

import { useState, useEffect } from "react";
import type { FindingStatus } from "./risk-findings";

// ── Module-level state ────────────────────────────────────────────────────────

const overrides = new Map<string, FindingStatus>();
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

// ── Mutators (safe to call outside React) ─────────────────────────────────────

export function setFindingStatus(id: string, status: FindingStatus): void {
  overrides.set(id, status);
  notify();
}

export function setFindingsStatus(
  ids: Iterable<string>,
  status: FindingStatus
): void {
  for (const id of ids) overrides.set(id, status);
  notify();
}

// ── Pure helpers (safe to call anywhere) ─────────────────────────────────────

export function getEffectiveStatus(
  id: string,
  defaultStatus: FindingStatus
): FindingStatus {
  return overrides.get(id) ?? defaultStatus;
}

// ── React hook ────────────────────────────────────────────────────────────────

/**
 * Returns stable references to the mutators plus a `version` counter that
 * increments whenever any status changes. Use `version` as a dependency in
 * useMemo / useEffect to re-derive derived state after a status update.
 */
export function useFindingStatusStore() {
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const cb = () => setVersion((v) => v + 1);
    listeners.add(cb);
    return () => {
      listeners.delete(cb);
    };
  }, []);

  return {
    setFindingStatus,
    setFindingsStatus,
    getEffectiveStatus,
    version,
  };
}
