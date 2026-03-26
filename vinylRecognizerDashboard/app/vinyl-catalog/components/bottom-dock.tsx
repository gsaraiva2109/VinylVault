"use client"

import { useRef, useEffect, useState, useCallback, type ElementType } from "react"
import { useVinylCatalog } from "../context"
import { Disc3, ScanLine, BarChart3, Settings, User } from "lucide-react"

type Screen = "collection" | "scan" | "stats" | "settings" | "account"

const NAV_ITEMS: { id: Screen; label: string; icon: ElementType }[] = [
  { id: "collection", label: "Collection", icon: Disc3 },
  { id: "scan", label: "Scan", icon: ScanLine },
  { id: "stats", label: "Stats", icon: BarChart3 },
  { id: "settings", label: "Settings", icon: Settings },
  { id: "account", label: "Account", icon: User },
]

interface IndicatorStyle {
  left: number
  width: number
  transition: string
}

export function BottomDock() {
  const { activeScreen, setActiveScreen } = useVinylCatalog()

  const btnRefs = useRef<(HTMLButtonElement | null)[]>([])
  const prevScreenRef = useRef<Screen>(activeScreen)
  const stretchTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const [indicator, setIndicator] = useState<IndicatorStyle>({
    left: 0,
    width: 0,
    transition: "none",
  })

  const getRect = useCallback((screenId: Screen) => {
    const idx = NAV_ITEMS.findIndex((i) => i.id === screenId)
    const btn = btnRefs.current[idx]
    if (!btn) return null
    return { left: btn.offsetLeft, width: btn.offsetWidth }
  }, [])

  useEffect(() => {
    const rect = getRect(activeScreen)
    if (rect) setIndicator({ ...rect, transition: "none" })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (prevScreenRef.current === activeScreen) return

    const prev = getRect(prevScreenRef.current)
    const next = getRect(activeScreen)
    prevScreenRef.current = activeScreen

    if (!prev || !next) return

    const stretchLeft = Math.min(prev.left, next.left)
    const stretchWidth =
      Math.max(prev.left + prev.width, next.left + next.width) - stretchLeft

    setIndicator({
      left: stretchLeft,
      width: stretchWidth,
      transition: "left 100ms cubic-bezier(0.16, 1, 0.3, 1), width 100ms cubic-bezier(0.16, 1, 0.3, 1)",
    })

    stretchTimerRef.current = setTimeout(() => {
      setIndicator({
        left: next.left,
        width: next.width,
        transition: "left 300ms cubic-bezier(0.16, 1, 0.3, 1), width 220ms cubic-bezier(0.16, 1, 0.3, 1)",
      })
    }, 90)
  }, [activeScreen, getRect])

  useEffect(() => {
    return () => clearTimeout(stretchTimerRef.current)
  }, [])

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex items-end justify-center pb-5">
      <nav
        className="pointer-events-auto relative flex items-center gap-1 rounded-[22px] px-3 py-2"
        style={{
          background: "var(--app-glass)",
          backdropFilter: "blur(28px) saturate(200%)",
          WebkitBackdropFilter: "blur(28px) saturate(200%)",
          border: "1px solid var(--app-glass-border)",
          boxShadow: "var(--app-dock-shadow)",
        }}
      >
        {/* Stretch indicator pill */}
        <div
          aria-hidden
          className="absolute bottom-2 top-2 rounded-[14px]"
          style={{
            left: indicator.left,
            width: indicator.width,
            transition: indicator.transition,
            background: "var(--app-green-bg)",
            boxShadow: `inset 0 0 0 1px var(--app-green-border)`,
          }}
        />

        {NAV_ITEMS.map((item, idx) => {
          const isActive = activeScreen === item.id
          return (
            <button
              key={item.id}
              ref={(el) => { btnRefs.current[idx] = el }}
              onClick={() => setActiveScreen(item.id)}
              title={item.label}
              className="relative z-10 flex h-11 w-11 items-center justify-center rounded-[14px] outline-none cursor-pointer"
            >
              <item.icon
                className="h-5 w-5 transition-colors duration-200"
                style={{
                  color: isActive ? "var(--app-green)" : "var(--app-text-3)",
                  strokeWidth: isActive ? 2.25 : 1.75,
                }}
              />
            </button>
          )
        })}
      </nav>
    </div>
  )
}
