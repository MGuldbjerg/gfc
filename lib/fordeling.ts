export type LeagueType = 'bestball' | 'managed' | 'chopped'

export interface Deltager {
  profileId: string
  displayName: string
  sleeperUsername: string
  registrationId: string
  // Ordered list of preferred types — index 0 = top priority.
  // Priority matters when a type is oversubscribed: people with fewer total
  // preferences sort first (less flexibility → higher priority), tiebroken by
  // their personal rank of that type (lower index = higher priority).
  preferredTypes: LeagueType[]
  erAmerikanskVip?: boolean       // admin-set: this person is a US industry guest
  undgaaAmerikanskVip?: boolean   // user preference: don't place in same league as US VIP
  pinned?: boolean                // set in results for VIP-pinned people
}

export interface Pin {
  profileId: string
  ligaNavn: string  // e.g. "BB1", "M2"
}

export interface LigaForslag {
  ligaNavn: string
  type: LeagueType
  deltagere: Deltager[]
}

export interface FordelingsResultat {
  ligaer: LigaForslag[]
  // People who wanted at least one type but got zero leagues.
  // This only happens in the edge case where more "single-preference" people
  // exist than a full league can hold for that type. The admin handles these manually.
  ikkeFordelbare: Deltager[]
}

const TYPES: LeagueType[] = ['bestball', 'managed', 'chopped']

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function typeForNavn(navn: string): LeagueType | null {
  if (navn.startsWith('BB')) return 'bestball'
  if (navn.startsWith('M')) return 'managed'
  if (navn.startsWith('C')) return 'chopped'
  return null
}

function næsteNavn(type: LeagueType, existing: Set<string>): string {
  const præfiks = type === 'bestball' ? 'BB' : type === 'managed' ? 'M' : 'C'
  let i = 1
  while (existing.has(`${præfiks}${i}`)) i++
  return `${præfiks}${i}`
}

// Tracks which leagues contain an American VIP or someone who wants to avoid one.
// Used to enforce the compatibility constraint during distribution.
const ligaHarAmerikanskVip = new Map<string, boolean>()
const ligaHarUndgaaAmerikanskVip = new Map<string, boolean>()

function isCompatible(ligaNavn: string, d: Deltager): boolean {
  if (d.erAmerikanskVip && ligaHarUndgaaAmerikanskVip.get(ligaNavn)) return false
  if (d.undgaaAmerikanskVip && ligaHarAmerikanskVip.get(ligaNavn)) return false
  return true
}

// Fills `people` into leagues of `type`. Uses existing VIP-seeded leagues first
// (least-full first for even distribution), then creates new leagues as needed.
function distributeIntoLeagues(
  people: Deltager[],
  type: LeagueType,
  ligaMap: Map<string, LigaForslag>,
  ligaStørrelse: number
): void {
  if (people.length === 0) return

  const existing = () => [...ligaMap.values()].filter(l => l.type === type)

  for (const d of shuffle(people)) {
    const candidates = existing()
      .filter(l => l.deltagere.length < ligaStørrelse && isCompatible(l.ligaNavn, d))
      .sort((a, b) => a.deltagere.length - b.deltagere.length)

    const target = candidates[0]

    if (target) {
      target.deltagere.push(d)
      if (d.erAmerikanskVip) ligaHarAmerikanskVip.set(target.ligaNavn, true)
      if (d.undgaaAmerikanskVip) ligaHarUndgaaAmerikanskVip.set(target.ligaNavn, true)
    } else {
      // No compatible league with room — create a new one
      const navn = næsteNavn(type, new Set(ligaMap.keys()))
      const ny: LigaForslag = { ligaNavn: navn, type, deltagere: [d] }
      ligaMap.set(navn, ny)
      if (d.erAmerikanskVip) ligaHarAmerikanskVip.set(navn, true)
      if (d.undgaaAmerikanskVip) ligaHarUndgaaAmerikanskVip.set(navn, true)
    }
  }
}

export function beregnFordeling(
  alleDeltagere: Deltager[],
  ligaStørrelse = 12,
  pins: Pin[] = [],
  choppedStørrelse = 18
): FordelingsResultat {
  // Reset per-call tracking state
  ligaHarAmerikanskVip.clear()
  ligaHarUndgaaAmerikanskVip.clear()

  const deltagerMap = new Map(alleDeltagere.map(d => [d.profileId, d]))
  const ligaMap = new Map<string, LigaForslag>()

  // Step 1: Place VIP-pinned people into their designated leagues.
  // A person can have at most one VIP pin (the first valid one wins).
  const vipPinnedType = new Map<string, LeagueType>() // profileId → which type they're pinned to

  for (const pin of pins) {
    const type = typeForNavn(pin.ligaNavn)
    if (!type) continue
    const d = deltagerMap.get(pin.profileId)
    if (!d || vipPinnedType.has(pin.profileId)) continue  // skip unknown or already-pinned people

    if (!ligaMap.has(pin.ligaNavn)) {
      ligaMap.set(pin.ligaNavn, { ligaNavn: pin.ligaNavn, type, deltagere: [] })
    }
    const pinned = { ...d, pinned: true }
    ligaMap.get(pin.ligaNavn)!.deltagere.push(pinned)
    if (pinned.erAmerikanskVip) ligaHarAmerikanskVip.set(pin.ligaNavn, true)
    if (pinned.undgaaAmerikanskVip) ligaHarUndgaaAmerikanskVip.set(pin.ligaNavn, true)
    vipPinnedType.set(pin.profileId, type)
  }

  // Track who ended up in each type (start with VIP assignments)
  const inType = new Map<LeagueType, Set<string>>()
  for (const type of TYPES) inType.set(type, new Set())
  for (const [profileId, type] of vipPinnedType) inType.get(type)!.add(profileId)

  // Step 2: For each type independently, assign the regular (non-VIP) pool.
  for (const type of TYPES) {
    const størrelse = type === 'chopped' ? choppedStørrelse : ligaStørrelse
    const vipCount = inType.get(type)!.size

    // Everyone who wants this type and is NOT already VIP-pinned into it
    const candidates = alleDeltagere.filter(
      d => d.preferredTypes.includes(type) && !vipPinnedType.has(d.profileId)
    )

    // Sort so that people with fewer total preferences come first.
    // Within the same flexibility tier, the one who ranked this type higher wins.
    candidates.sort((a, b) => {
      const byFlexibility = a.preferredTypes.length - b.preferredTypes.length
      if (byFlexibility !== 0) return byFlexibility
      return a.preferredTypes.indexOf(type) - b.preferredTypes.indexOf(type)
    })

    // Capacity: floor((VIPs + regular candidates) / størrelse) leagues in total.
    // VIPs always get their spots; the floor applies to the regular pool around them.
    const totalWanting = vipCount + candidates.length
    const totalLeagues = Math.floor(totalWanting / størrelse)
    const regularCapacity = Math.max(0, totalLeagues * størrelse - vipCount)

    // Randomly shuffle within each priority tier so placement is fair among equals.
    // The sort above is stable, so we shuffle within tiers by re-sorting after per-tier shuffle.
    const tiered = shuffleWithinTiers(candidates, type)
    const toAssign = tiered.slice(0, regularCapacity)
    // tiered[regularCapacity..] are bumped from this type — they may still play other types.

    distributeIntoLeagues(toAssign, type, ligaMap, størrelse)
    for (const d of toAssign) inType.get(type)!.add(d.profileId)
  }

  // ikkeFordelbare: had preferences but got zero leagues (extreme edge case)
  const ikkeFordelbare = alleDeltagere.filter(d => {
    if (d.preferredTypes.length === 0) return false  // no preferences = not expected to be placed
    return !TYPES.some(type => inType.get(type)!.has(d.profileId))
  })

  const typeOrder: Record<LeagueType, number> = { bestball: 0, managed: 1, chopped: 2 }
  const ligaer = [...ligaMap.values()].sort((a, b) => {
    const td = typeOrder[a.type] - typeOrder[b.type]
    return td !== 0 ? td : a.ligaNavn.localeCompare(b.ligaNavn, undefined, { numeric: true })
  })

  return { ligaer, ikkeFordelbare }
}

// Shuffles people within their priority tiers so equal-priority candidates are
// randomly ordered while the overall sort (fewer preferences first) is preserved.
function shuffleWithinTiers(candidates: Deltager[], type: LeagueType): Deltager[] {
  if (candidates.length === 0) return []

  const result: Deltager[] = []
  let tierStart = 0

  while (tierStart < candidates.length) {
    const a = candidates[tierStart]
    let tierEnd = tierStart + 1
    while (
      tierEnd < candidates.length &&
      candidates[tierEnd].preferredTypes.length === a.preferredTypes.length &&
      candidates[tierEnd].preferredTypes.indexOf(type) === a.preferredTypes.indexOf(type)
    ) {
      tierEnd++
    }
    result.push(...shuffle(candidates.slice(tierStart, tierEnd)))
    tierStart = tierEnd
  }

  return result
}
