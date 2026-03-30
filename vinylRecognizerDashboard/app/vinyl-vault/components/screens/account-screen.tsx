"use client"

import { useState, useEffect, type ReactNode } from "react"
import { useTauriAuth } from "@/lib/tauri-auth"
import { User, LogOut, Mail, Shield, Camera } from "lucide-react"

export function AccountScreen() {
  const { user, signOut } = useTauriAuth()
  const [isEditingProfile, setIsEditingProfile] = useState(false)

  const userName = user?.name ?? "Unknown"
  const userEmail = user?.email ?? ""
  const userAvatar = user?.image
  const userInitial = userName.charAt(0).toUpperCase()

  const [displayName, setDisplayName] = useState(userName)
  const [editEmail, setEditEmail] = useState(userEmail)

  // Sync state when user object loads/changes
  useEffect(() => {
    if (user) {
      setDisplayName(user.name)
      setEditEmail(user.email)
    }
  }, [user])

  return (
    <div className="flex flex-col items-center overflow-auto px-6 py-10">
      <div className="w-full max-w-md">
        {/* Avatar + name */}
        <div className="mb-7 flex flex-col items-center gap-3">
          <div className="relative">
            <div
              className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full text-2xl font-bold text-black/80"
              style={{
                background: userAvatar ? undefined : "#28d768",
                backgroundImage: userAvatar ? `url(${userAvatar})` : undefined,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            >
              {!userAvatar && userInitial}
            </div>
          </div>
          <div className="text-center">
            <h1 className="text-xl font-semibold text-white/90">{userName}</h1>
            <p className="text-sm text-white/40">{userEmail}</p>
          </div>
        </div>

        {/* Info card */}
        <div
          className="mb-3 overflow-hidden rounded-xl"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <InfoRow icon={<User className="h-4 w-4" />} label="Name" value={userName} />
          <Divider />
          <InfoRow icon={<Mail className="h-4 w-4" />} label="Email" value={userEmail || "—"} />
          <Divider />
          <InfoRow icon={<Shield className="h-4 w-4" />} label="Auth" value="Authentik OIDC" />
        </div>

        {/* Edit Profile toggle */}
        <button
          onClick={() => setIsEditingProfile(!isEditingProfile)}
          className="mb-3 w-full rounded-xl px-4 py-3 text-sm font-medium transition-all cursor-pointer text-left"
          style={{
            background: isEditingProfile
              ? "rgba(40,215,104,0.08)"
              : "rgba(255,255,255,0.04)",
            border: isEditingProfile
              ? "1px solid rgba(40,215,104,0.22)"
              : "1px solid rgba(255,255,255,0.07)",
            color: isEditingProfile ? "#28d768" : "rgba(255,255,255,0.65)",
          }}
        >
          {isEditingProfile ? "▾  Edit Profile" : "▸  Edit Profile"}
        </button>

        {/* Inline profile edit form */}
        {isEditingProfile && (
          <div
            className="mb-3 rounded-xl p-5"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.07)",
            }}
          >
            {/* Avatar change */}
            <div className="mb-5 flex items-center gap-4">
              <div
                className="flex h-14 w-14 items-center justify-center rounded-full text-lg font-bold text-black/80"
                style={{ background: "#28d768" }}
              >
                {userInitial}
              </div>
              <button
                className="flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-medium text-white/55 transition-colors cursor-pointer"
                style={{ border: "1px solid rgba(255,255,255,0.09)" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.85)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.55)")}
              >
                <Camera className="h-3.5 w-3.5" />
                Change Avatar
              </button>
            </div>

            {/* Fields */}
            <div className="space-y-3.5">
              <ProfileField
                id="display-name"
                name="name"
                label="Display Name"
                value={displayName}
                onChange={setDisplayName}
                autoComplete="name"
              />
              <ProfileField
                id="email"
                name="email"
                label="Email"
                value={editEmail}
                onChange={setEditEmail}
                type="email"
                autoComplete="email"
              />
            </div>

            {/* Save */}
            <button
              className="mt-5 rounded-lg px-5 py-2 text-sm font-semibold transition-colors cursor-pointer"
              style={{ background: "#28d768", color: "#0a0a0a" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#22c55e")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "#28d768")}
            >
              Save Changes
            </button>
          </div>
        )}

        {/* Sign out */}
        <button
          onClick={() => void signOut()}
          className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition-colors cursor-pointer"
          style={{
            background: "rgba(245, 47, 18, 0.10)",
            border: "1px solid rgba(245, 47, 18, 0.20)",
            color: "#f52f12",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(245, 47, 18, 0.16)"
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(245, 47, 18, 0.10)"
          }}
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </div>
  )
}

function InfoRow({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <span className="text-white/25">{icon}</span>
      <span className="w-12 shrink-0 text-xs font-medium uppercase tracking-[0.07em] text-white/30">
        {label}
      </span>
      <span className="flex-1 truncate text-sm text-white/70">{value}</span>
    </div>
  )
}

function Divider() {
  return <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }} />
}

function ProfileField({
  id,
  name,
  label,
  value,
  onChange,
  type = "text",
  autoComplete,
}: {
  id: string
  name: string
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  autoComplete?: string
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-medium text-white/45">{label}</label>
      <input
        id={id}
        name={name}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        className="h-9 w-full rounded-lg px-3 text-sm text-white/85 placeholder-white/25 outline-none transition-colors"
        style={{
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
        onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(40,215,104,0.40)")}
        onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)")}
      />
    </div>
  )
}
