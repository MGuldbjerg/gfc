import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getAdminEmails } from '@/auth.config'
import { execute, queryOne } from '@/lib/turso'
import { getUserByUsername } from '@/lib/sleeper'

const EMAIL_MØNSTER = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.email || !getAdminEmails().includes(session.user.email)) {
    return NextResponse.json({ error: 'Ikke autoriseret' }, { status: 403 })
  }

  const { id } = await params
  const { preferredTypes, displayName, sleeperUsername, email } = await req.json()

  // Resolve the profile_id for this registration.
  const reg = await queryOne<{ profile_id: string }>(
    'SELECT profile_id FROM registrations WHERE id = ?',
    [id]
  )
  if (!reg) return NextResponse.json({ error: 'Tilmelding ikke fundet' }, { status: 404 })

  // Update preferred_types on the registration.
  if (Array.isArray(preferredTypes)) {
    await execute(
      'UPDATE registrations SET preferred_types = ? WHERE id = ?',
      [JSON.stringify(preferredTypes), id]
    )
  }

  // Update profile fields.
  if (displayName?.trim()) {
    await execute(
      'UPDATE profiles SET display_name = ?, updated_at = datetime(\'now\') WHERE id = ?',
      [displayName.trim(), reg.profile_id]
    )
  }

  if (sleeperUsername?.trim()) {
    const sleeperUser = await getUserByUsername(sleeperUsername.trim())
    if (!sleeperUser) {
      return NextResponse.json(
        { error: `Sleeper-brugernavnet "${sleeperUsername.trim()}" blev ikke fundet.` },
        { status: 400 }
      )
    }
    // Check it's not already taken by another profile.
    const conflict = await queryOne<{ id: string }>(
      'SELECT id FROM profiles WHERE username = ? AND id <> ?',
      [sleeperUsername.trim(), reg.profile_id]
    )
    if (conflict) {
      return NextResponse.json(
        { error: 'Det Sleeper-brugernavn er allerede registreret på en anden profil.' },
        { status: 409 }
      )
    }
    await execute(
      'UPDATE profiles SET username = ?, sleeper_user_id = ?, updated_at = datetime(\'now\') WHERE id = ?',
      [sleeperUsername.trim(), sleeperUser.user_id, reg.profile_id]
    )
  }

  // Set or change the login email. The Auth.js user shares the profile id, so a
  // profile added without an email gets its login account created here. An empty
  // value means "leave as is" — logins are never revoked by accident.
  if (typeof email === 'string' && email.trim()) {
    const nyEmail = email.trim().toLowerCase()
    if (!EMAIL_MØNSTER.test(nyEmail)) {
      return NextResponse.json({ error: 'E-mailadressen ser ikke gyldig ud.' }, { status: 400 })
    }
    const optaget = await queryOne<{ id: string }>(
      'SELECT id FROM authjs_user WHERE email = ? AND id <> ?',
      [nyEmail, reg.profile_id]
    )
    if (optaget) {
      return NextResponse.json(
        { error: 'Den e-mail hører allerede til en anden bruger.' },
        { status: 409 }
      )
    }
    const eksisterende = await queryOne<{ id: string }>(
      'SELECT id FROM authjs_user WHERE id = ?',
      [reg.profile_id]
    )
    if (eksisterende) {
      await execute('UPDATE authjs_user SET email = ? WHERE id = ?', [nyEmail, reg.profile_id])
    } else {
      await execute(
        'INSERT INTO authjs_user (id, email, name) VALUES (?, ?, ?)',
        [reg.profile_id, nyEmail, displayName?.trim() || null]
      )
    }
  }

  return NextResponse.json({ ok: true })
}
