# Stack y sistema de diseno

**Decidido:** 2026-08-28.

## Tailwind v4, no v3

La plantilla SaaS Factory venia **rota**: `package.json` pedia Tailwind v3,
`postcss.config.js` era sintaxis v3, pero `globals.css` usaba `@import 'tailwindcss'`,
que es v4.

Se eligio v4 porque encaja con lo que pide docs/ARCHITECTURE.md ("los tokens se
exponen como variables CSS"): el bloque `@theme` genera una variable CSS por token
automaticamente. No hay `tailwind.config.ts` y no debe volver a haberlo.

`src/shared/design/waldorf.ts` **referencia** las variables (`var(--color-...)`), no
duplica los valores hex. Dos fuentes de verdad se desincronizan a la primera.

## Estetica

Ninguno de los cinco design systems del SaaS Factory sirve: neobrutalism, neumorphism
y liquid glass son lenguaje visual de startup y la comunidad Waldorf los lee como
ajenos. Base: paleta del Welcome Kit de Kimun. Cremas, marrones calidos, tierras.
Serif (Lora) solo para titulos; el cuerpo va en fuentes del sistema para no descargar
una segunda webfont.

Movil primero y accesibilidad alta no son acabado: el usuario tipico es una maestra o
un apoderado en un telefono de gama media con conexion irregular en la costa.

## Otros

- La plantilla **no traia** proteccion de rutas ni refresco de sesion. Vive en
  `src/proxy.ts` (Next.js 16 deprecio la convencion `middleware.ts`).
- La comprobacion de MEMBRESIA no esta en `proxy.ts` sino en el layout de `[slug]`:
  ahi hay acceso a la base con la RLS activa. Ver [aislamiento-rls].
- El CLAUDE.md del factory quedo en `.claude/FACTORY_OS.md`, subordinado: entra en
  conflicto con el del proyecto en identificadores y en flujo de trabajo.
