const CONDITION_COLORS: Record<string, string> = {
  M: 'bg-emerald-100 text-emerald-800',
  NM: 'bg-green-100 text-green-800',
  'VG+': 'bg-lime-100 text-lime-800',
  VG: 'bg-yellow-100 text-yellow-800',
  'G+': 'bg-orange-100 text-orange-800',
  G: 'bg-red-100 text-red-800',
  F: 'bg-red-200 text-red-900',
  P: 'bg-gray-100 text-gray-600'
}

export default function ConditionBadge({ condition }: { condition: string }): React.JSX.Element {
  const color = CONDITION_COLORS[condition] ?? 'bg-gray-100 text-gray-600'
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${color}`}>
      {condition}
    </span>
  )
}
