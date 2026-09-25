// Facebook-opslag via Meta Graph API — udgiver ugeresuméet på GFC's Facebook-SIDE.
//
// Vigtigt: Graph API kan KUN skrive til Sider. Facebook-GRUPPER kan ikke længere
// tilgås programmatisk (Groups API blev fjernet af Meta i april 2024), så gruppen
// bliver ved med at være copy-paste. Se lib/ugeresume.ts for teksten.
//
// Kræver to env-variabler:
//   FACEBOOK_PAGE_ID           — sidens numeriske ID
//   FACEBOOK_PAGE_ACCESS_TOKEN — langtidsholdbart Side-token (udløber ikke)

const GRAPH_VERSION = 'v25.0'
const GRAPH = `https://graph.facebook.com/${GRAPH_VERSION}`

// Meta kræver mindst 10 minutter frem for planlagte opslag; vi lægger lidt luft på.
const MIN_PLANLAEG_MINUTTER = 15

export type OpslagsTilstand =
  | 'udgiv'    // offentliggøres straks
  | 'planlaeg' // planlægges — kan nås at redigeres/aflyses i Meta Business Suite
  | 'kladde'   // gemmes som ikke-udgivet; du udgiver selv med et klik

export interface OpslagsResultat {
  id: string
  tilstand: OpslagsTilstand
  permalink: string
  planlagtTil?: string // ISO — kun ved 'planlaeg'
}

export interface SideStatus {
  konfigureret: boolean
  ok: boolean
  sideId?: string
  sideNavn?: string
  fejl?: string
}

function konfiguration() {
  const sideId = process.env.FACEBOOK_PAGE_ID?.trim()
  const token = process.env.FACEBOOK_PAGE_ACCESS_TOKEN?.trim()
  return { sideId, token, konfigureret: Boolean(sideId && token) }
}

// Graph svarer med struktureret fejl i { error: { message, type, code } }.
async function graphKald(
  sti: string,
  init: RequestInit & { form?: Record<string, string> } = {}
): Promise<Record<string, unknown>> {
  const { form, ...rest } = init
  const svar = await fetch(`${GRAPH}${sti}`, {
    ...rest,
    ...(form
      ? {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams(form).toString(),
        }
      : {}),
    cache: 'no-store',
  })

  const data = (await svar.json().catch(() => ({}))) as Record<string, unknown>

  if (!svar.ok) {
    const fejl = data.error as { message?: string; code?: number } | undefined
    throw new Error(
      fejl?.message
        ? `Facebook afviste kaldet: ${fejl.message}${fejl.code ? ` (kode ${fejl.code})` : ''}`
        : `Facebook svarede ${svar.status}`
    )
  }

  return data
}

// Tjekker at token virker og hører til den rigtige side. Bruges af admin-UI'et,
// så et udløbet/tilbagekaldt token opdages FØR man forsøger at slå op.
export async function tjekSideAdgang(): Promise<SideStatus> {
  const { sideId, token, konfigureret } = konfiguration()
  if (!konfigureret) {
    return {
      konfigureret: false,
      ok: false,
      fejl: 'FACEBOOK_PAGE_ID og FACEBOOK_PAGE_ACCESS_TOKEN mangler i miljøet.',
    }
  }

  try {
    const data = await graphKald(
      `/${sideId}?fields=id,name&access_token=${encodeURIComponent(token!)}`
    )
    return {
      konfigureret: true,
      ok: true,
      sideId: String(data.id ?? sideId),
      sideNavn: typeof data.name === 'string' ? data.name : undefined,
    }
  } catch (err) {
    return {
      konfigureret: true,
      ok: false,
      sideId,
      fejl: err instanceof Error ? err.message : 'Ukendt fejl',
    }
  }
}

// Slår en ren tekst op på siden. Returnerer opslagets ID + direkte link.
export async function slaaOpPaaSiden(
  besked: string,
  tilstand: OpslagsTilstand = 'udgiv',
  planlaegMinutter = 60
): Promise<OpslagsResultat> {
  const { sideId, token, konfigureret } = konfiguration()
  if (!konfigureret) {
    throw new Error(
      'Facebook er ikke sat op: FACEBOOK_PAGE_ID og FACEBOOK_PAGE_ACCESS_TOKEN mangler i miljøet.'
    )
  }
  if (!besked.trim()) {
    throw new Error('Tom tekst — der er intet at slå op.')
  }

  const form: Record<string, string> = {
    message: besked,
    access_token: token!,
  }

  let planlagtTil: string | undefined

  if (tilstand === 'udgiv') {
    form.published = 'true'
  } else {
    form.published = 'false'
    if (tilstand === 'planlaeg') {
      const minutter = Math.max(MIN_PLANLAEG_MINUTTER, Math.round(planlaegMinutter))
      const tidspunkt = new Date(Date.now() + minutter * 60_000)
      form.scheduled_publish_time = String(Math.floor(tidspunkt.getTime() / 1000))
      planlagtTil = tidspunkt.toISOString()
    }
  }

  const data = await graphKald(`/${sideId}/feed`, { form })
  const id = String(data.id ?? '')

  return {
    id,
    tilstand,
    // Graph returnerer "{sideId}_{opslagId}" — permalinket bruger den fulde streng.
    permalink: `https://www.facebook.com/${id.replace('_', '/posts/')}`,
    planlagtTil,
  }
}
