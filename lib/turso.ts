import { createClient, type InValue } from '@libsql/client'

const tursoUrl = process.env.TURSO_DATABASE_URL
const tursoToken = process.env.TURSO_AUTH_TOKEN

if (!tursoUrl || !tursoToken) {
  throw new Error('TURSO_DATABASE_URL or TURSO_AUTH_TOKEN is not set')
}

export const db = createClient({
  url: tursoUrl,
  authToken: tursoToken,
})

export type SqlParam = InValue

export async function query<T = Record<string, unknown>>(
  sql: string,
  params?: SqlParam[]
): Promise<T[]> {
  try {
    const result = await db.execute({ sql, args: params ?? [] })
    return (result.rows || []) as unknown as T[]
  } catch (error) {
    console.error('Query error:', { sql, params, error })
    throw error
  }
}

export async function execute(
  sql: string,
  params?: SqlParam[]
): Promise<{ rowsAffected: number }> {
  try {
    const result = await db.execute({ sql, args: params ?? [] })
    return { rowsAffected: Number(result.rowsAffected ?? 0) }
  } catch (error) {
    console.error('Execute error:', { sql, params, error })
    throw error
  }
}

export async function queryOne<T = Record<string, unknown>>(
  sql: string,
  params?: SqlParam[]
): Promise<T | null> {
  const results = await query<T>(sql, params)
  return results.length > 0 ? results[0] : null
}
