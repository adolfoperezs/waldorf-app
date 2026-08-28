# Roadmap

## Principio de corte

Se construye primero lo que se usa **todos los meses**, no lo que se usa una vez al año.

Los aportes se mueven mensualmente y son el dolor real de la administración. Los informes
de desarrollo se escriben una o dos veces al año y requieren adopción de las maestras, que
es una venta más difícil. Por eso el orden es economía primero, informes después: cuando
llegue la fase 2, las maestras ya están dentro del sistema por el calendario.

---

## Fase 0 — Cimientos

- [x] Migración `0001_tenencia` aplicada y verificada con las tres consultas de
      `tenancy-guard` — las tres devuelven cero filas
- [x] Test de aislamiento entre dos escuelas pasando — `tests/aislamiento.spec.ts`
- [x] Auth con email y contraseña (nada de OAuth todavía)
- [x] Onboarding de escuela: crear tenant, primer administrador, clonar plantilla
      — la clonación cubre hoy las comisiones; épocas, festividades, tramos y minuta
      cuelgan de un año escolar y se materializan en la Fase 1
- [x] Tokens de diseño Waldorf en `src/shared/design/waldorf.ts`
- [x] Layout base con la escuela en la ruta y selector para quien pertenece a varias

Criterio de salida: dos escuelas coexisten en la base y ninguna ve datos de la otra.

**Cumplido el 2026-08-28.** Además se corrigieron cuatro defectos bloqueantes de las
migraciones antes del primer `db push`; ver
`.claude/memory/project/correcciones-migraciones-iniciales.md`.

## Fase 1 — Ritmo

- [ ] Migración `0002_ritmo`
- [ ] Año escolar: crear, activar, cerrar
- [ ] Épocas: crear, ordenar, validar solapamiento
- [ ] Festividades y calendario anual
- [ ] Eventos con inscripción y asistencia
- [ ] Minuta por época y día
- [ ] Vista de calendario para familias, móvil primero
- [ ] Exportación a texto para pegar en WhatsApp

Criterio de salida: Kimün planifica su año completo en el sistema.

## Fase 2 — Comunidad y economía

- [ ] Migración `0003_comunidad_economia`
- [ ] Familias, miembros y niños
- [ ] Grupos y relación plurianual con maestros
- [ ] Comisiones y sus integrantes
- [ ] Tramos y acuerdos de aporte
- [ ] Registro de aportes en dinero y en horas
- [ ] Panel de la familia: su acuerdo, lo aportado, lo pendiente
- [ ] Panel de la comisión de economía: agregados, brechas, proyección
- [ ] Campañas ancladas a época o festividad

Criterio de salida: la Comisión de Economía deja de usar planillas.

## Fase 3 — Privacidad y cumplimiento

- [ ] Consentimientos: modelo, captura, revocación
- [ ] Panel de derechos del titular: acceso, rectificación, portabilidad, supresión
- [ ] Exportación completa de la escuela
- [ ] Reglas de retención configurables por país
- [ ] Visor de auditoría para administración
- [ ] Revisión jurídica externa antes de comercializar

Esta fase no es opcional ni postergable más allá de aquí: es requisito para vender a la
segunda escuela.

## Fase 4 — Desarrollo del niño

- [ ] Observaciones con etiquetas configurables
- [ ] Composición asistida del informe narrativo
- [ ] Estados del informe y versionado (un informe emitido es inmutable)
- [ ] Encuentros uno a uno con acuerdos
- [ ] Vista longitudinal: la biografía escolar del niño a través de los años

Es la funcionalidad que hace el producto irremplazable. Llega cuarta a propósito.

## Fase 5 — Escala multi-cliente

- [ ] Plantillas pedagógicas por región y hemisferio
- [ ] Internacionalización completa de la interfaz
- [ ] Plugin Chile: RBD, SEP, subvención, documentos tributarios
- [ ] Onboarding autoservicio
- [ ] Landing y material para los seminarios Waldorf

---

## Fuera de alcance, con intención

| Qué | Por qué |
|---|---|
| Libro de clases oficial | Alcance regulatorio enorme, específico por país, poco diferenciador |
| Contabilidad completa | Se integra con lo que la escuela ya usa; no competimos con software contable |
| Mensajería en tiempo real | Las escuelas viven en WhatsApp y no lo van a dejar. Integramos, no competimos |
| App móvil nativa | Web bien hecha y móvil primero cubre el caso. Nativo cuando haya demanda real |
| Notas y calificaciones | Contradice el modelo pedagógico. No es una omisión, es el producto |
| Pasarela de pago propia | Fase posterior, y probablemente vía integración local |

Cuando una escuela pida algo de esta lista, la conversación es de producto, no un ticket.
