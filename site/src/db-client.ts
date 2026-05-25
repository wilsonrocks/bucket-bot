import '@tanstack/react-start/server-only'
import { Kysely, PostgresDialect } from 'kysely'
import { Pool } from 'pg'
import type { DB } from './db'

export const db = new Kysely<DB>({
  dialect: new PostgresDialect({
    pool: new Pool({
      connectionString: process.env.DATABASE_URL,
    }),
  }),
  log: (event) => {
    if (!process.env.DEBUG_SQL) return
    if (event.level === 'query') {
      console.log('SQL:', event.query.sql)
      console.log('PARAMS:', event.query.parameters)
    }
  },
})
