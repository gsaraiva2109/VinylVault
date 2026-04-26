"use client"

import { useState } from "react"
import { SectionHeader, WipBanner, ToggleSetting } from "./shared-components"

export function PrivacySettings() {
  const [privacy, setPrivacy] = useState({
    publicProfile: false,
    shareCollection: false,
    analytics: true,
  })

  return (
    <div>
      <SectionHeader title="Privacy" subtitle="Control your data and privacy settings" />
      <WipBanner description="Privacy controls and public profile sharing are not yet implemented." />
      <div className="mt-6 space-y-3">
        <ToggleSetting
          label="Public Profile"
          description="Allow others to view your profile and collection stats"
          enabled={privacy.publicProfile}
          onChange={(v) => setPrivacy({ ...privacy, publicProfile: v })}
        />
        <ToggleSetting
          label="Share Collection"
          description="Allow others to view your full collection"
          enabled={privacy.shareCollection}
          onChange={(v) => setPrivacy({ ...privacy, shareCollection: v })}
        />
        <ToggleSetting
          label="Usage Analytics"
          description="Help improve the app by sharing anonymous usage data"
          enabled={privacy.analytics}
          onChange={(v) => setPrivacy({ ...privacy, analytics: v })}
        />
      </div>
    </div>
  )
}
