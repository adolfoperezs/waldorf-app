import { defineConfig } from '@playwright/test'
import { config as cargarEnv } from 'dotenv'

// Los tests hablan con el mismo Supabase que la app.
cargarEnv({ path: '.env.local', quiet: true })

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  reporter: [['list']],
  // El test de aislamiento no abre navegador: habla con la API de Supabase
  // como lo haria la app. Se apoya en el stack local (`npm run db:start`).
  use: { baseURL: process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000' },
})
