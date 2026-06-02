import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getAdminEmails } from '@/auth.config'
import { execute, queryOne } from '@/lib/turso'
import { getUserByUsername } from '@/lib/sleeper'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.email || !getAdminEmails().includes(session.user.email)) {
    return NextResponse.json({ error: 'Ikke autoriseret' }, { status: 403 })
  }

  const { id } = await params
  const { preferredTypes, displayName, sleeperUsername } = await req.json()

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

  return NextResponse.json({ ok: true })
}
