import { BADGES, type BadgeType } from '@/lib/badges'

export default function BadgeHylde({ badges }: { badges: BadgeType[] }) {
  if (badges.length === 0) return null

  return (
    <div className="mb-8">
      <h2 className="text-sm text-gray-500 uppercase tracking-wider mb-3">Badges</h2>
      <div className="flex flex-wrap gap-3">
        {badges.map(id => {
          const b = BADGES[id]
          return (
            <div
              key={id}
              title={b.beskrivelse}
              className={`${b.farve} rounded-xl px-4 py-2.5 flex items-center gap-2.5 cursor-default select-none group relative`}
            >
              <span className="text-xl">{b.emoji}</span>
              <span className="text-white font-semibold text-sm">{b.navn}</span>

              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-gray-900 border border-gray-700 text-gray-300 text-xs px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20 max-w-48 text-center">
                {b.beskrivelse}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
