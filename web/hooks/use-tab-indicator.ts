import { useState, useRef, useEffect, useCallback } from "react"

interface TabIndicatorStyle {
  left: number
  width: number
  transition: string
}

/**
 * Manages the stretch-snap pill indicator animation for a horizontal tab bar.
 *
 * @param tabs - Array of tab objects with at least an `id` field
 * @param activeTab - The currently active tab id
 * @returns `indicator` style to apply to the floating pill, and `btnRefs` to
 *          attach to each tab button via `ref={(el) => { btnRefs.current[idx] = el }}`
 */
export function useTabIndicator<T extends string>(
  tabs: { id: T }[],
  activeTab: T,
) {
  const btnRefs = useRef<(HTMLButtonElement | null)[]>([])
  const prevTabRef = useRef<T>(activeTab)
  const stretchTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const [indicator, setIndicator] = useState<TabIndicatorStyle>({ left: 0, width: 0, transition: "none" })

  const getRect = useCallback((tabId: T) => {
    const idx = tabs.findIndex((t) => t.id === tabId)
    const btn = btnRefs.current[idx]
    if (!btn) return null
    return { left: btn.offsetLeft, width: btn.offsetWidth }
  }, [tabs])

  // Init pill position on mount
  useEffect(() => {
    const rect = getRect(activeTab)
    if (rect) setIndicator({ ...rect, transition: "none" })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Stretch-snap animation on tab change
  useEffect(() => {
    if (prevTabRef.current === activeTab) return
    const prev = getRect(prevTabRef.current)
    const next = getRect(activeTab)
    prevTabRef.current = activeTab
    if (!prev || !next) return

    const stretchLeft = Math.min(prev.left, next.left)
    const stretchWidth = Math.max(prev.left + prev.width, next.left + next.width) - stretchLeft

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
  }, [activeTab, getRect])

  // Cleanup timer on unmount
  useEffect(() => () => clearTimeout(stretchTimerRef.current), [])

  return { indicator, btnRefs }
}
