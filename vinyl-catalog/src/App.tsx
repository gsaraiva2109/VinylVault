import { useState } from 'react'
import AppShell from './components/AppShell'

export type Screen = 'collection' | 'scan' | 'stats' | 'settings'

export default function App(): React.JSX.Element {
  const [screen, setScreen] = useState<Screen>('collection')
  return <AppShell screen={screen} onNavigate={setScreen} />
}
