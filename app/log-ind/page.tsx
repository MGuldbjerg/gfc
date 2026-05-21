import { redirect } from 'next/navigation'
import { auth, signIn } from '@/auth'

export const dynamic = 'force-dynamic'

export default async function LogIndPage({
  searchParams,
}: {
  searchParams: Promise<{ retur?: string }>
}) {
  const session = await auth()
  const { retur } = await searchParams
  const safeRetur = retur && retur.startsWith('/') ? retur : '/min-side'
  if (session?.user) redirect(safeRetur)

  async function logInd(formData: FormData) {
    'use server'
    const email = formData.get('email')
    const retur = formData.get('retur')
    await signIn('email', {
      email,
      redirectTo: typeof retur === 'string' && retur.startsWith('/') ? retur : '/min-side',
    })
  }

  return (
    <div className="form-page">
      <div className="form-card">
        <div className="kicker-strip" style={{ marginBottom: 20 }}>
          <span className="dash" />
          <span className="eyebrow">GFC</span>
        </div>
        <h1 className="form-card-title">Log ind</h1>
        <p className="form-card-sub">Vi sender et magisk link til din e-mail — ingen adgangskode.</p>

        <form action={logInd} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <input type="hidden" name="retur" value={safeRetur} />
          <div>
            <label className="gfc-label" htmlFor="email">E-mail</label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoFocus
              className="gfc-input"
              placeholder="din@email.dk"
            />
          </div>
          <button type="submit" className="btn" style={{ justifyContent: 'center' }}>
            Send mig et link
            <span className="arrow" aria-hidden />
          </button>
        </form>

        <p className="eyebrow" style={{ marginTop: 20, textAlign: 'center' }}>
          Første gang? Linket opretter også din konto.
        </p>
      </div>
    </div>
  )
}
