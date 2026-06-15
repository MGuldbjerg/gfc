'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

function diff(deadlineMs: number) {
  const ms = deadlineMs - Date.now()
  if (ms <= 0) return null
  const total = Math.floor(ms / 1000)
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  }
}

// Live countdown to the signup deadline. The server only renders this when the
// deadline is within ~30 days, so it's always a near-term, low-double-digit
// day count. When it reaches zero it flips to the "lukket" state.
export default function SignupCountdown({ deadline }: { deadline: string }) {
  const deadlineMs = new Date(deadline).getTime()
  const [left, setLeft] = useState(() => diff(deadlineMs))

  useEffect(() => {
    const id = setInterval(() => setLeft(diff(deadlineMs)), 1000)
    return () => clearInterval(id)
  }, [deadlineMs])

  if (!left) {
    return (
      <section className="section">
        <div className="container">
          <div className="kicker-strip" style={{ marginBottom: 12 }}>
            <span className="dash" />
            <span className="eyebrow">Tilmelding lukket</span>
          </div>
          <p className="lede" style={{ maxWidth: '44ch' }}>
            Tilmeldingen er lukket — ligaerne fordeles nu. Vi ses til næste sæson.
          </p>
        </div>
      </section>
    )
  }

  const cells: [number, string][] = [
    [left.days, 'dage'],
    [left.hours, 'timer'],
    [left.minutes, 'min'],
    [left.seconds, 'sek'],
  ]

  return (
    <section className="section">
      <div className="container">
        <div className="kicker-strip" style={{ marginBottom: 16 }}>
          <span className="dash" />
          <span className="eyebrow">Tilmelding lukker snart</span>
        </div>
        <div
          style={{
            display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div className="stat-blocks" style={{ gridTemplateColumns: 'repeat(4, auto)', gap: 20 }}>
            {cells.map(([value, label]) => (
              <div key={label} className="stat-block">
                <div className="stat-num" style={{ fontSize: 44, fontVariantNumeric: 'tabular-nums' }}>
                  {String(value).padStart(2, '0')}
                </div>
                <div className="stat-label">{label}</div>
              </div>
            ))}
          </div>
          <Link href="/log-ind" className="btn">
            Tilmeld dig nu
            <span className="arrow" aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  )
}
