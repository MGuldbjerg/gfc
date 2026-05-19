// Public proxy for Sleeper's /user/{username} endpoint. Used by the
// /profil-setup form for live validation while the user types.

import { NextResponse } from 'next/server'
import { getUserByUsername } from '@/lib/sleeper'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params
  const trimmed = decodeURIComponent(username).trim()

  if (!trimmed) {
    return NextResponse.json({ found: false }, { status: 400 })
  }

  const user = await getUserByUsername(trimmed)
  if (!user) {
    return NextResponse.json({ found: false })
  }

  return NextResponse.json({
    found: true,
    userId: user.user_id,
    username: user.username ?? trimmed,
    displayName: user.display_name ?? trimmed,
    avatar: user.avatar ?? null,
  })
}
