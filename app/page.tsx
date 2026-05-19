import Link from 'next/link'
import { tekst, t } from '@/content/tekst'

export default function HomePage() {
  return (
    <main className="bg-gray-950 text-white">
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/40 via-gray-950 to-gray-950 pointer-events-none" />
        <div className="relative max-w-5xl mx-auto px-6 pt-16 pb-20 sm:pt-24 sm:pb-28 text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-indigo-400 mb-4">
            {t(tekst.landing.kicker)}
          </p>
          <h1 className="text-4xl sm:text-6xl font-bold leading-tight tracking-tight">
            {tekst.landing.titel}
          </h1>
          <p className="mt-6 text-lg text-gray-300 max-w-2xl mx-auto leading-relaxed">
            {tekst.landing.intro}
          </p>

          <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center items-center">
            <Link
              href="/tilmeld"
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-8 py-4 rounded-full text-base shadow-lg shadow-indigo-900/40 transition-colors"
            >
              {t(tekst.landing.primaerCta)}
            </Link>
            <Link
              href="/leaderboard"
              className="border border-gray-700 hover:border-gray-500 text-white font-medium px-8 py-4 rounded-full text-base transition-colors"
            >
              {tekst.landing.sekundaerCta}
            </Link>
          </div>

          <div className="mt-14 grid grid-cols-3 gap-4 max-w-2xl mx-auto">
            {tekst.landing.hojdepunkter.map(h => (
              <div key={h.label}>
                <p className="text-3xl sm:text-4xl font-bold text-white">{h.tal}</p>
                <p className="mt-1 text-xs sm:text-sm text-gray-500 uppercase tracking-wider">{h.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 py-16">
        <h2 className="text-2xl sm:text-3xl font-bold mb-2">{tekst.landing.raekkerTitel}</h2>
        <p className="text-gray-400 mb-10">{tekst.landing.raekkerUndertitel}</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {tekst.landing.raekker.map(r => (
            <div key={r.navn} className="bg-gray-900/60 border border-gray-800 rounded-2xl p-6">
              <div className="text-3xl mb-3">{r.emoji}</div>
              <h3 className="text-xl font-semibold mb-2">{r.navn}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{r.beskrivelse}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-gray-900/40 border-y border-gray-800/60">
        <div className="max-w-5xl mx-auto px-6 py-16">
          <h2 className="text-2xl sm:text-3xl font-bold mb-10">{tekst.landing.tidslinjeTitel}</h2>
          <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {tekst.landing.tidslinje.map((trin, i) => (
              <li key={trin.tid} className="bg-gray-950/70 border border-gray-800 rounded-xl p-5">
                <div className="text-indigo-400 text-xs font-semibold uppercase tracking-wider">Trin {i + 1}</div>
                <div className="mt-2 text-white font-semibold">{trin.tid}</div>
                <div className="mt-1 text-gray-400 text-sm">{trin.hvad}</div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 py-16">
        <div className="bg-gradient-to-br from-indigo-950/60 to-gray-900/60 border border-indigo-900/40 rounded-3xl p-10 sm:p-14 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-3">{tekst.landing.finalCtaTitel}</h2>
          <p className="text-gray-300 mb-8 max-w-xl mx-auto">{tekst.landing.finalCtaTekst}</p>
          <Link
            href="/tilmeld"
            className="inline-block bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-8 py-4 rounded-full text-base shadow-lg shadow-indigo-900/40 transition-colors"
          >
            {t(tekst.landing.finalCta)}
          </Link>
        </div>
      </section>
    </main>
  )
}
