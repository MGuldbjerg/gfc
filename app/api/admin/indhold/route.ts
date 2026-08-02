// Admin-only: read and edit the site's text — markdown pages and the
// structured strings from content/tekst.ts. See lib/indhold.ts for the
// code-default + DB-override model.

import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { auth } from '@/auth'
import {
  hentSiderTilAdmin,
  hentTekstTilAdmin,
  hentPladsholdere,
  gemSide,
  nulstilSide,
  gemTekst,
  nulstilTekst,
} from '@/lib/indhold'

const SLUG_MØNSTER = /^[a-z0-9]+(-[a-z0-9]+)*$/

async function kræverAdmin() {
  const session = await auth()
  return !!session?.user?.isAdmin
}

export async function GET() {
  if (!(await kræverAdmin())) {
    return NextResponse.json({ error: 'Ikke autoriseret' }, { status: 401 })
  }
  const [sider, tekster, pladsholdere] = await Promise.all([
    hentSiderTilAdmin(),
    hentTekstTilAdmin(),
    hentPladsholdere(),
  ])
  return NextResponse.json({ sider, tekster, pladsholdere })
}

export async function PUT(req: NextRequest) {
  if (!(await kræverAdmin())) {
    return NextResponse.json({ error: 'Ikke autoriseret' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))

  if (body.slags === 'side') {
    const slug = typeof body.slug === 'string' ? body.slug.trim().toLowerCase() : ''
    const title = typeof body.title === 'string' ? body.title.trim() : ''
    const tekstKrop = typeof body.body === 'string' ? body.body : ''

    if (!SLUG_MØNSTER.test(slug)) {
      return NextResponse.json(
        { error: 'Adressen må kun indeholde små bogstaver, tal og bindestreger — fx "praemier-2027"' },
        { status: 400 }
      )
    }
    if (!title) {
      return NextResponse.json({ error: 'Siden skal have en overskrift' }, { status: 400 })
    }

    await gemSide(slug, { title, body: tekstKrop, iMenu: body.iMenu === true })
    // The page and the nav are cached; drop both so the edit is visible now.
    revalidatePath(`/${slug}`)
    revalidatePath('/', 'layout')
    return NextResponse.json({ ok: true })
  }

  if (body.slags === 'tekst') {
    const key = typeof body.key === 'string' ? body.key : ''
    const værdi = typeof body.værdi === 'string' ? body.værdi : ''
    if (!key) return NextResponse.json({ error: 'Mangler tekstnøgle' }, { status: 400 })

    await gemTekst(key, værdi)
    revalidatePath('/', 'layout')
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Ukendt type' }, { status: 400 })
}

// Removes the override so the shipped default takes over again. For a page that
// only ever existed in the database, this deletes the page.
export async function DELETE(req: NextRequest) {
  if (!(await kræverAdmin())) {
    return NextResponse.json({ error: 'Ikke autoriseret' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))

  if (body.slags === 'side' && typeof body.slug === 'string') {
    await nulstilSide(body.slug)
    revalidatePath(`/${body.slug}`)
    revalidatePath('/', 'layout')
    return NextResponse.json({ ok: true })
  }

  if (body.slags === 'tekst' && typeof body.key === 'string') {
    await nulstilTekst(body.key)
    revalidatePath('/', 'layout')
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Ukendt type' }, { status: 400 })
}
