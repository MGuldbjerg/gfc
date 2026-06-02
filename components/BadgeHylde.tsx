import { BADGES, type BadgeType } from '@/lib/badges'

export default function BadgeHylde({
  badges,
  tooltipOverrides,
}: {
  badges: BadgeType[]
  tooltipOverrides?: Partial<Record<BadgeType, string>>
}) {
  if (badges.length === 0) return null

  return (
    <div style={{ marginBottom: 32 }}>
      <p className="eyebrow" style={{ marginBottom: 12 }}>Badges</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        {badges.map(id => {
          const b = BADGES[id]
          return (
            <div
              key={id}
              className={b.farve}
              style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 'var(--r-pill)', cursor: 'default', userSelect: 'none' }}
            >
              <span style={{ fontSize: 18 }}>{b.emoji}</span>
              <span style={{ color: '#fff', fontWeight: 600, fontSize: 13, fontFamily: 'var(--font-display)', letterSpacing: '-0.005em' }}>{b.navn}</span>

              {/* Tooltip */}
              <span style={{
                position: 'absolute',
                bottom: 'calc(100% + 8px)',
                left: '50%',
                transform: 'translateX(-50%)',
                width: 200,
                background: 'var(--ink)',
                color: 'var(--bg)',
                fontSize: 12,
                lineHeight: 1.5,
                padding: '8px 12px',
                borderRadius: 'var(--r-sm)',
                textAlign: 'center',
                pointerEvents: 'none',
                whiteSpace: 'normal',
                zIndex: 30,
                opacity: 0,
                transition: 'opacity .15s',
                fontFamily: 'var(--font-sans)',
                fontWeight: 400,
              }}
              className="badge-tip"
              >
                {tooltipOverrides?.[id] ?? b.beskrivelse}
              </span>
            </div>
          )
        })}
      </div>

      <style>{`
        div:hover > .badge-tip { opacity: 1 !important; }
      `}</style>
    </div>
  )
}
