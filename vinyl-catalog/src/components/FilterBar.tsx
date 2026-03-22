type Props = {
  search: string
  onSearchChange: (v: string) => void
}

export default function FilterBar({ search, onSearchChange }: Props): React.JSX.Element {
  return (
    <div className="flex items-center gap-3 px-6 py-3 border-b border-border">
      <input
        type="text"
        placeholder="Search by artist, title, or label…"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        className="flex-1 max-w-sm px-3 py-1.5 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
      />
    </div>
  )
}
