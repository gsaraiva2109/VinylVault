import type { Screen } from '../App'
import VinylGrid from './VinylGrid'
import RecognitionCamera from './RecognitionCamera'
import CollectionStats from './CollectionStats'
import RecognitionSettings from './settings/RecognitionSettings'

type Props = {
  screen: Screen
  onNavigate: (screen: Screen) => void
}

const NAV_ITEMS: { id: Screen; label: string; icon: string }[] = [
  { id: 'collection', label: 'Collection', icon: '🎵' },
  { id: 'scan', label: 'Scan', icon: '📷' },
  { id: 'stats', label: 'Stats', icon: '📊' },
  { id: 'settings', label: 'Settings', icon: '⚙️' }
]

export default function AppShell({ screen, onNavigate }: Props): React.JSX.Element {
  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-56 border-r border-border flex flex-col py-4 px-3 shrink-0">
        <div className="mb-6 px-2">
          <h1 className="text-lg font-semibold tracking-tight">Vinyl Catalog</h1>
        </div>
        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                screen === item.id
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {screen === 'collection' && <VinylGrid />}
        {screen === 'scan' && <RecognitionCamera />}
        {screen === 'stats' && <CollectionStats />}
        {screen === 'settings' && <RecognitionSettings />}
      </main>
    </div>
  )
}
