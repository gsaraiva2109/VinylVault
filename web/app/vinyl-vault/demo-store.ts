"use client"

import type { VinylRecord } from "./types"

const STORAGE_KEY = "vinyl_vault_demo_records_v1"
const DEMO_ID_PREFIX = "demo-local-"

interface DemoStoreV1 {
  version: 1
  records: VinylRecord[]
  updatedAt: number
}

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined"
}

export function isDemoLocalId(id: string): boolean {
  return typeof id === "string" && id.startsWith(DEMO_ID_PREFIX)
}

/**
 * Three-way discriminator for mutation handlers that need to branch on demo state.
 *
 * - `'handled'`     — id is a demo-local record; caller should apply the demo action and return
 * - `'blocked'`     — user is in demo mode but the record is a real shared record; caller should throw DemoReadOnlyError
 * - `'passthrough'` — normal authenticated user; caller should proceed with the API call
 *
 * Usage in context mutation callbacks:
 *   const demo = checkDemoMutation(id, isDemo)
 *   if (demo === 'blocked') throw new DemoReadOnlyError()
 *   if (demo === 'handled') { ...apply demo-store action...; return }
 *   // ...API path
 */
export type DemoMutationOutcome = 'handled' | 'blocked' | 'passthrough'

export function checkDemoMutation(id: string, isDemo: boolean): DemoMutationOutcome {
  if (isDemoLocalId(id)) return 'handled'
  if (isDemo) return 'blocked'
  return 'passthrough'
}

export function makeDemoId(): string {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`
  return `${DEMO_ID_PREFIX}${random}`
}

export function readDemoRecords(): VinylRecord[] {
  if (!isBrowser()) return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as DemoStoreV1
    if (parsed?.version !== 1 || !Array.isArray(parsed.records)) {
      console.warn("[demo-store] unknown store version, ignoring")
      return []
    }
    return parsed.records
  } catch (err) {
    console.warn("[demo-store] read failed:", err)
    return []
  }
}

export function writeDemoRecords(records: VinylRecord[]): void {
  if (!isBrowser()) return
  const payload: DemoStoreV1 = {
    version: 1,
    records,
    updatedAt: Date.now(),
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch (err) {
    console.error("[demo-store] write failed (quota?):", err)
  }
}

export function addDemoRecord(
  record: Omit<VinylRecord, "id"> & { id?: string }
): VinylRecord {
  const records = readDemoRecords()
  const id = record.id && isDemoLocalId(record.id) ? record.id : makeDemoId()
  const newRecord: VinylRecord = { ...record, id } as VinylRecord
  records.unshift(newRecord)
  writeDemoRecords(records)
  return newRecord
}

export function updateDemoRecord(
  id: string,
  patch: Partial<VinylRecord>
): VinylRecord | null {
  if (!isDemoLocalId(id)) return null
  const records = readDemoRecords()
  const idx = records.findIndex((r) => r.id === id)
  if (idx === -1) return null
  const updated = { ...records[idx], ...patch, id } as VinylRecord
  records[idx] = updated
  writeDemoRecords(records)
  return updated
}

export function deleteDemoRecord(id: string): boolean {
  if (!isDemoLocalId(id)) return false
  const records = readDemoRecords()
  const next = records.filter((r) => r.id !== id)
  if (next.length === records.length) return false
  writeDemoRecords(next)
  return true
}

export function clearAllDemoRecords(): void {
  if (!isBrowser()) return
  window.localStorage.removeItem(STORAGE_KEY)
}
