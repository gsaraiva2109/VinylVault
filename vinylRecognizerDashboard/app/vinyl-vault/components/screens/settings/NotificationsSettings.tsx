"use client"

import { useState } from "react"
import { SectionHeader, WipBanner, ToggleSetting } from "./shared-components"

export function NotificationsSettings() {
  const [notifications, setNotifications] = useState({
    priceAlerts: true,
    newReleases: false,
    weeklyDigest: true,
    marketTrends: false,
  })

  return (
    <div>
      <SectionHeader title="Notifications" subtitle="Choose what updates you want to receive" />
      <WipBanner description="Notification delivery is not yet implemented. These settings will be saved but no alerts will be sent." />
      <div className="mt-6 space-y-3">
        <ToggleSetting
          label="Price Alerts"
          description="Get notified when records in your collection change in value"
          enabled={notifications.priceAlerts}
          onChange={(v) => setNotifications({ ...notifications, priceAlerts: v })}
        />
        <ToggleSetting
          label="New Releases"
          description="Updates about new releases from your favorite artists"
          enabled={notifications.newReleases}
          onChange={(v) => setNotifications({ ...notifications, newReleases: v })}
        />
        <ToggleSetting
          label="Weekly Digest"
          description="A summary of your collection stats and market trends"
          enabled={notifications.weeklyDigest}
          onChange={(v) => setNotifications({ ...notifications, weeklyDigest: v })}
        />
        <ToggleSetting
          label="Market Trends"
          description="Insights about vinyl market trends and rare finds"
          enabled={notifications.marketTrends}
          onChange={(v) => setNotifications({ ...notifications, marketTrends: v })}
        />
      </div>
    </div>
  )
}
