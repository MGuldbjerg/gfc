import Link from 'next/link'

export default function LogIndFejlPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  return <FejlIndhold searchParams={searchParams} />
}

async function FejlIndhold({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  const besked = beskedFraFejl(error)

  return (
    <div className="form-page">
      <div className="form-card" style={{ textAlign: 'center' }}>
        <div className="kicker-strip" style={{ justifyContent: 'center', marginBottom: 20 }}>
          <span className="dash" />
          <span className="eyebrow">Login fejlede</span>
        </div>
        <h1 className="form-card-title">Noget gik galt</h1>
        <p className="form-card-sub">{besked}</p>
        <Link href="/log-ind" className="btn" style={{ justifyContent: 'center' }}>
          Prøv igen
          <span className="arrow" aria-hidden />
        </Link>
      </div>
    </div>
  )
}

function beskedFraFejl(error?: string): string {
  switch (error) {
    case 'Verification':  return 'Linket er udløbet eller allerede brugt. Bed om et nyt.'
    case 'AccessDenied':  return 'Du har ikke adgang til denne side.'
    default:              return 'Noget gik galt. Prøv at bede om et nyt login-link.'
  }
}
