// Custom Auth.js v5 adapter backed by Turso (libSQL).
// Implements the minimum surface needed for email magic-link auth with JWT
// sessions. No OAuth account table, no DB session table.

import type { Adapter, AdapterUser, VerificationToken } from '@auth/core/adapters'
import { randomUUID } from 'node:crypto'
import { execute, query, queryOne } from './turso'

type UserRow = {
  id: string
  email: string
  email_verified: string | null
  name: string | null
  image: string | null
}

function rowToUser(row: UserRow | null): AdapterUser | null {
  if (!row) return null
  return {
    id: row.id,
    email: row.email,
    emailVerified: row.email_verified ? new Date(row.email_verified) : null,
    name: row.name,
    image: row.image,
  }
}

export const tursoAdapter: Adapter = {
  async createUser(user) {
    const id = randomUUID()
    const verified = user.emailVerified ? user.emailVerified.toISOString() : null
    await execute(
      `INSERT INTO authjs_user (id, email, email_verified, name, image) VALUES (?, ?, ?, ?, ?)`,
      [id, user.email!, verified, user.name ?? null, user.image ?? null]
    )
    return {
      id,
      email: user.email!,
      emailVerified: user.emailVerified ?? null,
      name: user.name ?? null,
      image: user.image ?? null,
    }
  },

  async getUser(id) {
    const row = await queryOne<UserRow>('SELECT * FROM authjs_user WHERE id = ?', [id])
    return rowToUser(row)
  },

  async getUserByEmail(email) {
    const row = await queryOne<UserRow>('SELECT * FROM authjs_user WHERE email = ?', [email])
    return rowToUser(row)
  },

  // No OAuth accounts — email-only auth.
  async getUserByAccount() {
    return null
  },

  async updateUser(user) {
    const current = await queryOne<UserRow>('SELECT * FROM authjs_user WHERE id = ?', [user.id!])
    if (!current) throw new Error(`User ${user.id} not found`)

    const email = user.email ?? current.email
    const verified = user.emailVerified === undefined
      ? current.email_verified
      : user.emailVerified === null
        ? null
        : user.emailVerified.toISOString()
    const name = user.name === undefined ? current.name : user.name
    const image = user.image === undefined ? current.image : user.image

    await execute(
      `UPDATE authjs_user SET email = ?, email_verified = ?, name = ?, image = ? WHERE id = ?`,
      [email, verified, name, image, user.id!]
    )

    return {
      id: user.id!,
      email,
      emailVerified: verified ? new Date(verified) : null,
      name,
      image,
    }
  },

  async deleteUser(userId) {
    await execute('DELETE FROM authjs_user WHERE id = ?', [userId])
  },

  // No-ops for email-only auth.
  async linkAccount() {
    return undefined
  },
  async unlinkAccount() {
    return undefined
  },

  async createVerificationToken(token) {
    await execute(
      `INSERT INTO authjs_verification_token (identifier, token, expires) VALUES (?, ?, ?)`,
      [token.identifier, token.token, token.expires.toISOString()]
    )
    return token
  },

  async useVerificationToken({ identifier, token }) {
    const row = await queryOne<{ identifier: string; token: string; expires: string }>(
      `SELECT * FROM authjs_verification_token WHERE identifier = ? AND token = ?`,
      [identifier, token]
    )
    if (!row) return null

    await execute(
      `DELETE FROM authjs_verification_token WHERE identifier = ? AND token = ?`,
      [identifier, token]
    )

    return {
      identifier: row.identifier,
      token: row.token,
      expires: new Date(row.expires),
    } satisfies VerificationToken
  },
}

// Silence unused-import warning if `query` becomes unused after future edits.
void query
