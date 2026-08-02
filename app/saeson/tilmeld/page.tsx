import Link from 'next/link'
import { hentAktuelSæson } from '@/lib/seasonConfig'
import { evaluateSignupGate } from '@/lib/seasonSettings'
import TilmeldForm from './TilmeldForm'

export const dynamic = 'force-dynamic'

export default async function SaesonTilmeldPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string }>
}) {
  const { invite } = await searchParams
  const sæson = await hentAktuelSæson()
  const gate = await evaluateSignupGate(sæson, invite ?? null)

  // Deadline passed and no valid invite → show the closed state instead of the form.
  // (Already-registered users can still adjust their picks via the API; this page
  // is the entry point for new signups.)
  if (gate.closed && !gate.allowed) {
    return (
      <div className="form-page" style={{ alignItems: 'flex-start', paddingTop: 60 }}>
        <div className="form-card" style={{ maxWidth: 480 }}>
          <div className="kicker-strip" style={{ marginBottom: 20 }}>
            <span className="dash" />
            <span className="eyebrow">Tilmelding lukket</span>
          </div>
          <h1 className="form-card-title">GFC {sæson}</h1>
          <p className="form-card-sub">
            Tilmeldingen for denne sæson er lukket — ligaerne er ved at blive fordelt.
            Vil du gerne være med alligevel, så skriv til Mikkel, så finder vi en plads hvis vi kan.
          </p>
          <Link href="/leaderboard" className="btn" style={{ justifyContent: 'center', marginTop: 8 }}>
            Se leaderboardet
            <span className="arrow" aria-hidden />
          </Link>
        </div>
      </div>
    )
  }

  // Pass the invite through so a valid late-entrant link survives the POST gate.
  return <TilmeldForm invite={gate.closed ? invite ?? null : null} sæson={sæson} />
}
