import { defineConfig, devices } from '@playwright/test'
import { config as cargarEnv } from 'dotenv'

// Los tests hablan con el mismo Supabase que la app.
cargarEnv({ path: '.env.local', quiet: true })

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  reporter: [['list']],
  use: {
    baseURL: BASE,
    /*
     * El usuario tipico es una maestra o un apoderado en un telefono de gama
     * media. Si algo no funciona en esta ventana, no funciona.
     */
    ...devices['Pixel 7'],
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev',
    url: BASE,
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
