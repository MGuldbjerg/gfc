import { createClient } from '@libsql/client'

const tursoUrl = process.env.TURSO_DATABASE_URL
const tursoToken = process.env.TURSO_AUTH_TOKEN

if (!tursoUrl || !tursoToken) {
  throw new Error('TURSO_DATABASE_URL or TURSO_AUTH_TOKEN is not set')
}

export const db = createClient({
  url: tursoUrl,
  authToken: tursoToken,
})

/**
 * Execute a SQL query with parameters (for SELECT, returning data)
 */
export async function query<T = Record<string, unknown>>(
  sql: string,
  params?: unknown[]
): Promise<T[]> {
  try {
    const result = await db.execute({
      sql,
      args: params || [],
    })
    return (result.rows || []) as T[]
  } catch (error) {
    console.error('Query error:', { sql, params, error })
    throw error
  }
}

/**
 * Execute a SQL statement (for INSERT, UPDATE, DELETE)
 */
export async function execute(
  sql: string,
  params?: unknown[]
): Promise<{ rowsAffected: number }> {
  try {
    const result = await db.execute({
      sql,
      args: params || [],
    })
    return { rowsAffected: result.changes || 0 }
  } catch (error) {
    console.error('Execute error:', { sql, params, error })
    throw error
  }
}

/**
 * Get a single row from a query
 */
export async function queryOne<T = Record<string, unknown>>(
  sql: string,
  params?: unknown[]
): Promise<T | null> {
  const results = await query<T>(sql, params)
  return results.length > 0 ? results[0] : null
}
