import type { Config } from 'drizzle-kit'

export default {
  schema: './src/db/schema.ts',
  out: './drizzle/migrations',
  dialect: 'sqlite',
  dbCredentials: {
    url: 'file:.wrangler/state/v3/d1/miniflare-D1DatabaseObject/be8fc967107d562340aa6bc47a19a0b8dc2ace74791bc8a07f763688e48e9db7.sqlite',
  },
} satisfies Config
