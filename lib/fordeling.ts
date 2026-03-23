// Ligafordelingsalgoritme

export type LeagueType = 'bestball' | 'managed' | 'chopped'

export interface Deltager {
  profileId: string
  displayName: string
  sleeperUsername: string
  registrationId: string
  preferredTypes: LeagueType[]
}

export interface LigaForslag {
  ligaNavn: string    // fx "BB1", "M3"
  type: LeagueType
  deltagere: Deltager[]
}

export interface FordelingsResultat {
  ligaer: LigaForslag[]
  ikkeFordelbare: Deltager[] // ønskede rækker der ikke er plads til
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function genererLigaNavne(type: LeagueType, antal: number): string[] {
  const præfiks = type === 'bestball' ? 'BB' : type === 'managed' ? 'M' : 'C'
  return Array.from({ length: antal }, (_, i) => `${præfiks}${i + 1}`)
}

export function fordelDeltagere(
  deltagere: Deltager[],
  type: LeagueType,
  ligaStørrelse = 12
): LigaForslag[] {
  const relevante = deltagere.filter(d => d.preferredTypes.includes(type))
  if (relevante.length === 0) return []

  const shuffled = shuffle(relevante)
  const antalLigaer = Math.ceil(shuffled.length / ligaStørrelse)
  const navne = genererLigaNavne(type, antalLigaer)

  const ligaer: LigaForslag[] = navne.map(navn => ({
    ligaNavn: navn,
    type,
    deltagere: [],
  }))

  // Fordel jævnt — round-robin så alle ligaer får ca. samme størrelse
  shuffled.forEach((deltager, i) => {
    ligaer[i % antalLigaer].deltagere.push(deltager)
  })

  return ligaer
}

export function beregnFordeling(
  deltagere: Deltager[],
  ligaStørrelse = 12
): FordelingsResultat {
  const bestball = fordelDeltagere(deltagere, 'bestball', ligaStørrelse)
  const managed = fordelDeltagere(deltagere, 'managed', ligaStørrelse)
  const chopped = fordelDeltagere(deltagere, 'chopped', ligaStørrelse)

  return {
    ligaer: [...bestball, ...managed, ...chopped],
    ikkeFordelbare: [],
  }
}
