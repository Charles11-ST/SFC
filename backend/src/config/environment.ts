import 'dotenv/config'
import { z } from 'zod'

const environmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4100),
  FRONTEND_ORIGIN: z.string().url().default('http://localhost:3000'),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  WEATHER_API_KEY: z.string().optional(),
})

const result = environmentSchema.safeParse(process.env)
if (!result.success) {
  console.error('Invalid backend environment configuration:', result.error.flatten().fieldErrors)
  throw new Error('Backend environment configuration is invalid.')
}

export const environment = result.data
