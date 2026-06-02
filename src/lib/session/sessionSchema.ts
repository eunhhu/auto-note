import { z } from 'zod'

import type { Session } from '@/lib/types'

const keySchema = z.string().trim().min(1)
const actionSchema = z.enum(['press', 'release'])

const eventSchema = z.object({
  t_ns: z.number().int().nonnegative(),
  key: keySchema,
  action: actionSchema,
})

const sessionSchema = z.object({
  schema_version: z.literal(2),
  id: z.string().min(1),
  name: z.string().min(1),
  created_at: z.string().min(1),
  updated_at: z.string().min(1),
  keys: z.array(keySchema),
  bpm: z.number().positive(),
  offset_ms: z.number().int(),
  events: z.array(eventSchema),
})

export function parseSession(value: unknown): Session {
  return sessionSchema.parse(value)
}

export function parseSessionJson(value: string): Session {
  const parsed: unknown = JSON.parse(value)
  return parseSession(parsed)
}
