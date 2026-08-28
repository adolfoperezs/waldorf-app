# Puesta en marcha

## 1. Crear el proyecto con SaaS Factory

```bash
mkdir waldorf-os && cd waldorf-os
saas-factory
npm install
```

## 2. Copiar estos archivos encima

```
waldorf-os/
├── CLAUDE.md                  ← FUSIONAR con el del factory (ver nota abajo)
├── docs/
│   ├── DOMAIN.md
│   ├── ARCHITECTURE.md
│   ├── PRIVACY.md
│   └── ROADMAP.md
├── supabase/migrations/
│   ├── 0001_tenencia.sql
│   ├── 0002_ritmo.sql
│   └── 0003_comunidad_economia.sql
└── .claude/skills/
    ├── waldorf-domain/SKILL.md
    └── tenancy-guard/SKILL.md
```

**Sobre `CLAUDE.md`:** el factory trae el suyo (el "Factory OS"). No lo reemplaces.
Pega el contenido de este archivo al final del suyo, o guárdalo como `CLAUDE.md` en la
raíz del proyecto y deja el del factory donde está. Lo importante es que Claude Code lea
ambos y que la sección "Reglas no negociables" quede visible.

## 3. Commit inicial antes de tocar nada

```bash
git init
git add .
git commit -m "Cimientos: dominio, arquitectura, privacidad y capa de tenencia"
```

Esto importa: quieres poder volver al estado limpio si una sesión de Claude Code se
desvía.

## 4. Supabase

Crea el proyecto, configura `.env.local`, y aplica las migraciones **en orden**:

```bash
supabase db push
```

Luego corre las tres consultas de verificación de
`.claude/skills/tenancy-guard/SKILL.md`. Las tres deben devolver cero filas.

## 5. Primeros prompts para Claude Code

En este orden, uno por sesión:

**Sesión 1 — verificar cimientos**
```
Lee CLAUDE.md, docs/DOMAIN.md, docs/ARCHITECTURE.md y docs/PRIVACY.md.
Revisa las migraciones 0001 a 0003 contra el patrón de .claude/skills/tenancy-guard.
Reporta inconsistencias, invariantes del dominio que no estén forzadas por la base
de datos, y cualquier tabla sin política de RLS. No cambies nada todavía:
entrégame el reporte primero.
```

**Sesión 2 — memoria del proyecto**
```
Activa memory-manager. Registra en .claude/memory/project/ las decisiones de
arquitectura de docs/ARCHITECTURE.md: las tres capas, el aislamiento por RLS en
Postgres, la configuración pedagógica como dato, y la separación del plugin país.
```

**Sesión 3 — test de aislamiento (antes que cualquier feature)**
```
Escribe el test de aislamiento entre escuelas descrito en tenancy-guard: dos escuelas
con datos, autenticar como miembro de la primera, verificar que no ve nada de la
segunda. Debe devolver cero filas, no un error de permisos.
```

**Sesión 4 — primer PRP**
```
Usa el skill prp para escribir el blueprint de la Fase 1 (Ritmo) según docs/ROADMAP.md.
No implementes nada: quiero revisar el PRP primero.
```

A partir de ahí, el ciclo es siempre el mismo: PRP → revisión humana → migración →
tipos → server actions → UI → registro de la decisión en memoria.

## Una advertencia

No corras Claude Code con permisos amplios sobre este repositorio sin revisar qué hace.
Va a contener datos reales de niños. Revisa los `allowed-tools` de cualquier skill que
instales desde catálogos comunitarios, y en particular no instales hooks de terceros:
ejecutan shell.
