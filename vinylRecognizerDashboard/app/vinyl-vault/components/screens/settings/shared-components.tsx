"use client"

export function WipTag() {
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
      style={{
        background: "rgba(245,158,11,0.12)",
        color: "#f59e0b",
        border: "1px solid rgba(245,158,11,0.25)",
      }}
    >
      WIP
    </span>
  )
}

export function WipBanner({ description }: { description: string }) {
  return (
    <div
      className="mt-4 flex items-start gap-2.5 rounded-xl p-3.5"
      style={{
        background: "rgba(245,158,11,0.06)",
        border: "1px solid rgba(245,158,11,0.20)",
      }}
    >
      <span className="mt-0.5 shrink-0 text-[13px]">🚧</span>
      <div>
        <p className="text-xs font-semibold" style={{ color: "#f59e0b" }}>Work in Progress</p>
        <p className="mt-0.5 text-xs" style={{ color: "rgba(245,158,11,0.75)" }}>{description}</p>
      </div>
    </div>
  )
}

export function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h2 className="text-lg font-semibold" style={{ color: "var(--app-text-1)" }}>{title}</h2>
      <p className="mt-1 text-sm" style={{ color: "var(--app-text-3)" }}>{subtitle}</p>
    </div>
  )
}

export function ToggleSetting({
  label,
  description,
  enabled,
  onChange,
}: {
  label: string
  description: string
  enabled: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <div
      className="flex items-center justify-between rounded-xl p-4"
      style={{ background: "var(--app-surface-3)", border: "1px solid var(--app-border)" }}
    >
      <div className="mr-4">
        <h3 className="text-sm font-medium" style={{ color: "var(--app-text-1)" }}>{label}</h3>
        <p className="mt-0.5 text-xs" style={{ color: "var(--app-text-3)" }}>{description}</p>
      </div>
      <button
        onClick={() => onChange(!enabled)}
        className="relative shrink-0 rounded-full cursor-pointer outline-none"
        style={{
          width: "50px",
          height: "30px",
          border: enabled ? "1px solid var(--app-green)" : "1px solid var(--app-border)",
          background: enabled ? "var(--app-green)" : "var(--app-surface-3)",
          transition: "background .4s ease, border-color .4s ease",
          WebkitTapHighlightColor: "transparent",
        }}
      >
        <span
          className="absolute block rounded-full bg-white"
          style={{
            height: "28px",
            width: "28px",
            top: "0px",
            left: enabled ? "20px" : "0px",
            boxShadow:
              "0 0 0 1px hsla(0, 0%, 0%, 0.1), 0 4px 0px 0 hsla(0, 0%, 0%, .04), 0 4px 9px hsla(0, 0%, 0%, .13), 0 3px 3px hsla(0, 0%, 0%, .05)",
            transition: "left .35s cubic-bezier(.54, 1.60, .5, 1)",
          }}
        />
      </button>
    </div>
  )
}
