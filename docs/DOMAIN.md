# Modelo de dominio — Gestión escolar Waldorf

Este documento es la fuente de verdad del producto. Define el lenguaje ubicuo: los
nombres que usamos aquí son los nombres de las tablas, los tipos y las carpetas.

---

## 1. Por qué el modelo es distinto

El software escolar convencional asume esta cadena:

> alumno → curso anual → asignatura → nota → informe semestral

La pedagogía Waldorf no es esa cadena con otros nombres. Es otra estructura:

> familia → niño → grupo que persiste años → época → observación → informe narrativo

Cuatro diferencias estructurales, y de ellas se deriva casi todo lo demás:

**El eje temporal es la época, no el semestre.** El año se organiza en bloques de tres a
cuatro semanas dedicados a un tema. De la época cuelgan los contenidos, las festividades,
la minuta de alimentación, las jornadas y las campañas. La época es la columna vertebral
del sistema.

**El grupo persiste, el curso no.** Una cohorte acompaña al mismo maestro-guía durante
varios años (idealmente ocho). El grupo es una entidad con vida propia y con historia,
no una etiqueta del año escolar. La historia de un niño se lee longitudinalmente.

**La observación es el átomo, no la nota.** No hay calificaciones. La maestra registra
observaciones breves durante la época; el informe de desarrollo se compone después a
partir de ellas. Esto también es el foso competitivo: tres años de observaciones
acumuladas hacen que ninguna escuela se cambie de plataforma.

**La familia es la unidad, no el apoderado.** La familia aporta, participa en comisiones,
asiste a jornadas, tiene encuentros uno a uno. El niño cuelga de la familia.

Y una quinta que es económica más que pedagógica pero igual de estructural: **el aporte
tiene dos monedas, dinero y horas.** Muchas escuelas Waldorf combinan aporte económico
solidario por tramos con trabajo comunitario de las familias. Un sistema que solo modela
pesos no sirve para gestionar una escuela Waldorf real.

---

## 2. Gobierno y roles

No hay director. El gobierno es colegiado: el colegio de maestros toma decisiones
pedagógicas en conjunto, y la administración ejecuta. Las comisiones (huerto, economía,
construcción, festividades, cultura) son mixtas entre familias y equipo.

El modelo de permisos refleja esto: los roles no forman una jerarquía lineal donde uno
contiene al anterior. Son ámbitos distintos.

| Rol | Alcance |
|---|---|
| `administracion` | Configuración de la escuela, aportes, familias, reportes |
| `colegio_maestros` | Configuración pedagógica: años, épocas, grupos, plantillas de informe |
| `maestro_guia` | Su grupo: observaciones, informes, encuentros, asistencia |
| `maestro_especialidad` | Los grupos donde enseña: observaciones acotadas |
| `comision` | Su comisión: tareas, presupuesto, campañas |
| `familia` | Sus propios hijos, sus aportes, el calendario público |

Una misma persona puede tener varios roles en una escuela, y roles en más de una escuela.
La membresía es la relación entre persona y escuela, y siempre lleva un rol.

---

## 3. Entidades del núcleo

### Capa de tenencia

**`escuelas`** — el tenant. Slug, nombre, país, zona horaria, idioma, moneda.
Todo dato de dominio pertenece a exactamente una escuela.

**`perfiles`** — una persona. Existe una sola vez aunque pertenezca a varias escuelas.
Ligada a `auth.users`.

**`membresias`** — persona + escuela + rol, con vigencia. Es lo que consultan todas las
políticas de seguridad.

### Ritmo

**`anios_escolares`** — el año lectivo de una escuela. Fechas de inicio y fin. Solo uno
activo a la vez.

**`epocas`** — un bloque de tres a cuatro semanas con un tema. Pertenece a un año escolar.
Puede ser de toda la escuela (`grupo_id` nulo) o específica de un grupo. El orden importa:
las épocas se suceden, no se solapan dentro del mismo grupo.

**`festividades`** — las celebraciones del año: San Miguel, Martinmas, Adviento, Pascua de
Resurrección, la fiesta de la primavera. Cada escuela configura las suyas — esto varía
enormemente por hemisferio y por país, y es exactamente el tipo de cosa que nunca se
hardcodea.

**`eventos`** — jornadas comunitarias, asambleas, encuentros uno a uno, talleres,
reuniones de comisión. Tipado, con inscripción opcional y asistencia.

**`minutas`** — la propuesta de alimentación. Cambia por época y por día de la semana.
Muchas escuelas Waldorf asocian cada día a un cereal y a un ritmo semanal.

### Comunidad y economía

**`grupos`** — la cohorte. Nombre, año de cohorte, etapa. Persiste entre años escolares.

**`grupo_maestros`** — la relación maestro-grupo con vigencia y tipo (guía o especialidad).
Es la relación plurianual que caracteriza a Waldorf.

**`familias`** — la unidad de participación. Una familia tiene miembros (perfiles) y niños.

**`ninos`** — pertenece a una familia y a un grupo. Datos mínimos. Ver `docs/PRIVACY.md`.

**`comisiones`** y **`comision_miembros`** — el trabajo comunitario organizado.

**`acuerdos_aporte`** — el compromiso de una familia para un año escolar: tramo, monto
mensual, horas mensuales comprometidas. Es un acuerdo, no una deuda: el lenguaje importa
y la UI debe reflejarlo.

**`aportes`** — el registro de lo efectivamente aportado, en dinero o en horas. Un aporte
en horas puede vincularse a una comisión o a una campaña.

**`campanas`** — recolección, ayuda o apoyo con una meta en dinero, en horas o en especies,
usualmente anclada a una época o a una festividad.

### Desarrollo del niño (fase 2)

**`observaciones`** — el átomo. Nota breve de un maestro sobre un niño, en una fecha, con
una época asociada. Texto libre más etiquetas configurables por escuela. Dato sensible:
acceso restringido al maestro del grupo y al colegio de maestros.

**`informes_desarrollo`** — el documento narrativo por período, compuesto a partir de las
observaciones. Tiene estados: borrador, en revisión, emitido, compartido con la familia.

**`encuentros`** — la reunión uno a uno maestra–familia, con acuerdos registrados.

---

## 4. Invariantes del dominio

Reglas que el sistema debe hacer cumplir, en la base de datos donde sea posible:

1. Todo dato de dominio pertenece a exactamente una escuela y nunca cruza esa frontera.
2. Las épocas de un mismo grupo no se solapan en el tiempo.
3. Un niño pertenece a exactamente una familia y a lo sumo un grupo por año escolar.
4. Un grupo tiene a lo sumo un maestro-guía vigente en una fecha dada.
5. Un acuerdo de aporte es único por familia y año escolar.
6. Solo un año escolar activo por escuela a la vez.
7. Un informe emitido es inmutable: las correcciones generan una nueva versión.
8. Una observación solo la puede leer un maestro del grupo del niño, el colegio de
   maestros, o la administración. Nunca otra familia.

---

## 5. La IA en el producto

Un solo uso, y bien acotado: **asistencia a la redacción del informe narrativo**.

Redactar informes de desarrollo consume semanas del tiempo de las maestras. El sistema
compone un borrador a partir de las observaciones que la propia maestra registró.

Reglas duras:

- La IA nunca evalúa, diagnostica ni caracteriza a un niño.
- La IA solo reordena y redacta a partir de observaciones ya escritas por un humano.
- La maestra es siempre la autora: el borrador se edita y se aprueba antes de existir.
- Ninguna observación sale de la escuela sin consentimiento explícito y registrado.
- Todo uso queda en la auditoría.

---

## 6. Lo que deliberadamente NO modelamos

- Notas, promedios, rankings o cualquier forma de calificación numérica del niño.
- Perfiles psicológicos, temperamentos o tipologías almacenadas como atributo del niño.
  Es material pedagógico delicado, se presta al etiquetado permanente, y su lugar es la
  observación narrativa contextualizada, no un campo.
- Asistencia como instrumento de control. Si se registra, es para el acompañamiento
  pedagógico, no para sanción.
- Comparaciones entre niños o entre grupos.

Estas ausencias son decisiones de producto, no funcionalidades pendientes.
