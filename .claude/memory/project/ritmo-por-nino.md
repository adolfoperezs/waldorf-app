# El ritmo de cada nino (PRP-002, migracion 0007)

**Decidido:** 2026-09-23. Origen: `docs/lineamientos/2026-09-especificacion-ux-kimun.md`,
un documento de la escuela con su propio modelo de datos (User/Student/Course/Rhythm).

**Regla aplicada:** del lineamiento se toma la INTENCION, no el modelo. Donde choca con
docs/DOMAIN.md gana el dominio. La tabla completa de reconciliacion esta en
`.claude/PRPs/PRP-002-ritmo-por-nino.md`. Lo esencial:

- **Ciclos son tabla, no enum.** `ciclos.nombre` es dato ("Grupo Semilla", "Basica").
  Lo unico fijo es `modalidad_ciclo` (`jardin` | `escolar`): la diferencia pedagogica
  real (primer septenio sin epocas ni materias) que decide que campos muestra la UI.
  `acento` es un nombre de token de color con CHECK, no un color libre.
- **`grupos.etapa` se elimino** (texto libre sin uso) a favor de `grupos.ciclo_id`.
- **Nada de `Student.guardian_id`**: la familia es la unidad. Dos apoderados = dos
  `familia_miembros`, cada uno con su propio enlace de invitacion.
- **Ritmo semanal** = `ritmos_semanales` (grupo + lunes) + `ritmo_dias`. Columnas
  explicitas, no JSONB. `tema` sirve a los dos ciclos (cuento en jardin, tema de clase
  principal en escolar). El cereal sale de `minutas` salvo que el dia lo sobrescriba.
- **Estado de la epoca derivado de fechas**, nunca guardado.
- **"Notificacion inmediata" = texto para WhatsApp** al publicar. No hay push ni SMTP.

**Patron RLS nuevo:** `ritmo_dias_select` usa `exists (select 1 from ritmos_semanales
...)`. El subquery corre con la RLS de quien consulta, asi que el dia hereda la
visibilidad de su semana sin duplicar la logica. Para escribir, el `exists` agrega
`app.puede_editar_ritmo`, que exige `es_miembro` ademas de `es_maestro_de_grupo`: sin
eso una maestra dada de baja seguiria editando.

**Why:** el lineamiento lo pidio una escuela real (socio de diseno); ignorarlo pierde al
cliente, copiarlo rompe las reglas 5 y 6 de CLAUDE.md.

**How to apply:** si llega otro lineamiento de UI, mismo metodo: guardarlo tal cual en
`docs/lineamientos/`, escribir un PRP con la tabla "lineamiento → decision → por que",
y construir la intencion sobre el modelo existente. Relacionado: [[configuracion-pedagogica-como-dato]],
[[auditoria-de-lecturas]], [[invitaciones-por-enlace]].
