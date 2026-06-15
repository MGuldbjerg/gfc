// GFC user-facing text.
//
// Edit any string in this file to change what appears on the site.
// Vercel will automatically deploy the change when you push to GitHub.
//
// The placeholder {sæson} is replaced with the current season (e.g. 2026).
// To bump the year for all text at once, change CURRENT_SEASON in lib/leagues.ts.

import { CURRENT_SEASON } from '@/lib/leagues'

export const tekst = {
  nav: {
    leaderboard: 'Leaderboard',
    tilmeld: 'Tilmeld',
    historie: 'Historie',
    draftstatistik: 'Draftstatistik',
    regler: 'Regler',
    sponsorer: 'Sponsorer',
    tilmeldCta: 'Tilmeld {sæson}',
  },

  landing: {
    kicker: 'Guldbjergs Fantasy Challenge {sæson}',
    titel: 'Danmarks største fantasy football-konkurrence',
    intro: 'Drag dit hold gennem hele NFL-sæsonen. Spil mod over hundrede andre danske entusiaster i bestball, managed eller chopped — og kæmp om præmier til sæsonens skarpeste.',
    primaerCta: 'Tilmeld dig GFC {sæson} →',
    sekundaerCta: 'Se leaderboardet',

    hojdepunkter: [
      { tal: '2', label: 'Sæsoner kørt' },
      { tal: '120+', label: 'Deltagere i 2025' },
      { tal: '11', label: 'Sleeper-ligaer' },
    ],

    raekkerTitel: 'Vælg din spillestil',
    raekkerUndertitel: 'Tilmeld dig én række — eller alle tre.',
    raekker: [
      {
        emoji: '🎯',
        navn: 'Bestball',
        beskrivelse: 'Automatiske startere — du drafter et hold og lader systemet vælge dine bedste hver uge. Sat-og-glem-format.',
      },
      {
        emoji: '⚙️',
        navn: 'Managed',
        beskrivelse: 'Klassisk fantasy. Sæt dit hold hver uge, lav byttehandler og match dig op mod resten af ligaen.',
      },
      {
        emoji: '🔪',
        navn: 'Chopped',
        beskrivelse: 'Guillotine-format. Lavest scorende deltager ryger ud hver uge — sidste mand står tilbage.',
      },
    ],

    tidslinjeTitel: 'Sådan ser sæsonen ud',
    tidslinje: [
      { tid: 'Maj–juni', hvad: 'Tilmelding åben' },
      { tid: '4. juli', hvad: 'Slow drafts starter' },
      { tid: 'September', hvad: 'NFL-sæsonen starter' },
      { tid: 'Uge 15–17', hvad: 'Slutspil og finale' },
    ],

    finalCtaTitel: 'Klar til at spille med?',
    finalCtaTekst: 'Slow drafts starter 4. juli. Tilmeld dig nu, vælg dine rækker, og lad os fordele dig i en liga.',
    finalCta: 'Tilmeld dig GFC {sæson}',
  },

  tilmeld: {
    titel: 'Tilmeld GFC {sæson}',
    trinKonto: 'Opret din konto',
    trinProfil: 'Fortæl os lidt om dig',

    emailLabel: 'E-mail',
    emailPlaceholder: 'din@email.dk',
    kodeLabel: 'Adgangskode',
    kodePlaceholder: 'Mindst 8 tegn',
    knapOpretterKonto: 'Opretter konto...',
    knapFortsaet: 'Fortsæt',

    navnLabel: 'Dit navn (vises på leaderboard)',
    navnPlaceholder: 'fx Thomas Hansen',
    sleeperLabel: 'Sleeper-brugernavn',
    sleeperPlaceholder: 'dit sleeper-brugernavn',
    sleeperHint: 'Find det i Sleeper-appen under din profil',

    raekkerLabel: 'Hvilke rækker vil du gerne med i?',
    raekker: [
      { id: 'bestball', label: 'Bestball', desc: 'Automatiske startere — sat-og-glem' },
      { id: 'managed', label: 'Managed', desc: 'Klassisk fantasy — sæt dit hold hver uge' },
      { id: 'chopped', label: 'Chopped', desc: 'Guillotine-format — én ryger ud om ugen' },
    ],

    privatlivLabel: 'Privatliv og kommunikation',
    privatliv: [
      {
        id: 'visSleeper',
        label: 'Vis Sleeper-brugernavn på min profil',
        desc: 'Andre kan se hvilket Sleeper-brugernavn dit hold tilhører.',
      },
      {
        id: 'visBadges',
        label: 'Vis mine badges',
        desc: 'OG-mærket og andre badges vises på din offentlige profil.',
      },
      {
        id: 'nyhedsbrev',
        label: 'Send mig nyhedsbrev',
        desc: 'Ugentlige highlights og opdateringer i indbakken.',
      },
    ],

    knapGemmer: 'Gemmer...',
    knapTilmeld: 'Tilmeld mig',

    bekraeftTitel: 'Tjek din e-mail',
    bekraeftTekst: 'Vi har sendt en bekræftelsesmail til {email}. Klik på linket i mailen for at aktivere din konto.',
    bekraeftSpam: 'Kan du ikke finde den? Tjek spam-mappen.',
  },
} as const

// Replaces {sæson} with the current season number (and other simple placeholders).
export function t(s: string, ekstra?: Record<string, string>): string {
  let out = s.replace(/\{sæson\}/g, CURRENT_SEASON)
  if (ekstra) {
    for (const [key, value] of Object.entries(ekstra)) {
      out = out.replace(new RegExp(`\\{${key}\\}`, 'g'), value)
    }
  }
  return out
}
