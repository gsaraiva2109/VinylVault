"use client"

import { cn } from "@/lib/utils"
import { useVinylCatalog } from "../context"
import { Disc3, ScanLine, BarChart3, Settings, ChevronLeft, ChevronRight } from "lucide-react"
import { useState } from "react"

const navItems = [
  { id: "collection" as const, label: "Collection", icon: Disc3 },
  { id: "scan" as const, label: "Scan", icon: ScanLine },
  { id: "stats" as const, label: "Stats", icon: BarChart3 },
  { id: "settings" as const, label: "Settings", icon: Settings },
]

export function Sidebar() {
  const { activeScreen, setActiveScreen, records } = useVinylCatalog()
  const [isCollapsed, setIsCollapsed] = useState(false)

  return (
    <aside
      className={cn(
        "flex h-full flex-col border-r border-zinc-200 bg-zinc-50 transition-all duration-300 dark:border-zinc-800 dark:bg-zinc-900",
        isCollapsed ? "w-16" : "w-56"
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-zinc-200 px-4 dark:border-zinc-800">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-900 dark:bg-zinc-100">
          <Disc3 className="h-5 w-5 text-zinc-100 dark:text-zinc-900" />
        </div>
        {!isCollapsed && (
          <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Vinyl</span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col gap-1 p-3">
        {navItems.map((item) => {
          const isActive = activeScreen === item.id
          return (
            <button
              key={item.id}
              onClick={() => setActiveScreen(item.id)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-zinc-900 text-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                  : "text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!isCollapsed && <span>{item.label}</span>}
            </button>
          )
        })}
      </nav>

      {/* Collection Count */}
      {!isCollapsed && (
        <div className="border-t border-zinc-200 p-4 dark:border-zinc-800">
          <div className="rounded-lg bg-zinc-100 p-3 dark:bg-zinc-800">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Total Records
            </p>
            <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {records.length}
            </p>
          </div>
        </div>
      )}

      {/* Collapse Toggle */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="flex h-10 items-center justify-center border-t border-zinc-200 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:border-zinc-800 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
      >
        {isCollapsed ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <ChevronLeft className="h-4 w-4" />
        )}
      </button>
    </aside>
  )
}
