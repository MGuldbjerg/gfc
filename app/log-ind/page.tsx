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
    <main className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-2xl p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <div className="text-4xl mb-2">🏈</div>
          <h1 className="text-2xl font-bold text-white">Log ind på GFC</h1>
          <p className="text-gray-500 text-sm mt-1">
            Vi sender et magisk link til din e-mail — ingen adgangskode at huske.
          </p>
        </div>

        <form action={logInd} className="flex flex-col gap-4">
          <input type="hidden" name="retur" value={safeRetur} />
          <div>
            <label className="text-sm text-gray-400 mb-1 block">E-mail</label>
            <input
              name="email"
              type="email"
              required
              autoFocus
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-indigo-500"
              placeholder="din@email.dk"
            />
          </div>
          <button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-lg transition-colors"
          >
            Send mig et link
          </button>
        </form>

        <p className="text-gray-600 text-xs mt-6 text-center">
          Første gang? Linket opretter også din konto.
        </p>
      </div>
    </main>
  )
}
