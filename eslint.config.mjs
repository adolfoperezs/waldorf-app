import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'

/**
 * Next.js 16 ya no corre el linter en `next build` ni trae `next lint`: se
 * corre con `npm run lint`. Configuracion recomendada de
 * node_modules/next/dist/docs/01-app/03-api-reference/05-config/03-eslint.md.
 */
const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Convencion del proyecto: las server actions reciben (previo, formData)
      // aunque no los usen, y se marcan con _ para decirlo.
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    'playwright-report/**',
    'test-results/**',
    // Generado por `supabase gen types`: no se edita a mano.
    'src/shared/supabase/tipos.ts',
  ]),
])

export default eslintConfig
