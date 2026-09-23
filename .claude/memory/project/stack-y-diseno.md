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
ajenos.

**Desde 2026-09-23 los valores son los del lineamiento de Kimun** ("Digital Organico",
`docs/lineamientos/`): lienzo #FAF7F2, primario #8C5A3C, titulos #6B4C35, acentos de
ciclo salvia #5E7A5E / ocre #D99B43 / terracota #B85B43. Tipografia: Lora para titulos y
**Plus Jakarta Sans** para la interfaz (antes era fuente del sistema; el lineamiento la
pide y next/font la sirve del propio dominio con `swap`). Los acentos de ciclo tienen
100/300/500/700: el 500 no da contraste de texto sobre claro, para texto va el 700.
Las clases por acento estan escritas enteras en `src/shared/design/acentos.ts`:
Tailwind no genera clases armadas con plantillas de texto.

**Formularios en panel lateral** (`src/shared/ui/panel-lateral.tsx`, un `<dialog>`
nativo), no fijos en la pagina. `useCerrarAlCompletar(estado)` lo cierra al guardar.
Los que muestran un enlace de una sola vez (invitaciones) NO se cierran.

**React 19 vacia los formularios** con `<form action>` al terminar la accion, aunque
vuelva con errores. En formularios largos usar `useEnvioConservando`
(`src/shared/ui/envio-conservando.ts`): `onSubmit` que despacha en una transicion y
deja `action` para cuando no hay JavaScript.

Movil primero y accesibilidad alta no son acabado: el usuario tipico es una maestra o
un apoderado en un telefono de gama media con conexion irregular en la costa.

## Otros

- La plantilla **no traia** proteccion de rutas ni refresco de sesion. Vive en
  `src/proxy.ts` (Next.js 16 deprecio la convencion `middleware.ts`).
- La comprobacion de MEMBRESIA no esta en `proxy.ts` sino en el layout de `[slug]`:
  ahi hay acceso a la base con la RLS activa. Ver [aislamiento-rls].
- El CLAUDE.md del factory quedo en `.claude/FACTORY_OS.md`, subordinado: entra en
  conflicto con el del proyecto en identificadores y en flujo de trabajo.
