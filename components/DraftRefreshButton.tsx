'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

export function DraftRefreshButton() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  function refresh() {
    startTransition(() => {
      router.refresh()
      setLastRefresh(new Date())
    })
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <button
        onClick={refresh}
        disabled={pending}
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          color: pending ? 'var(--muted-2)' : 'var(--accent)',
          background: 'none',
          border: '1px solid var(--line)',
          borderRadius: 'var(--r-pill)',
          padding: '6px 14px',
          cursor: pending ? 'default' : 'pointer',
          transition: 'border-color .2s, color .2s',
        }}
      >
        {pending ? 'Opdaterer…' : '↺ Opdater'}
      </button>
      {lastRefresh && (
        <span className="eyebrow">
          Sidst opdateret {lastRefresh.toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' })}
        </span>
      )}
    </div>
  )
}
