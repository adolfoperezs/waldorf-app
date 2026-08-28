# Privacidad y cumplimiento

Este sistema maneja datos de niños y observaciones sobre su desarrollo. Es la categoría
de datos más sensible que existe en software educativo. El cumplimiento no es una capa
que se agrega al final: es una restricción de diseño desde la primera migración.

En Chile aplica la **Ley 21.719** sobre protección de datos personales, con entrada en
vigencia en diciembre de 2026. Los datos de menores reciben tratamiento reforzado. Este
documento traduce eso a reglas de implementación. No es asesoría legal — antes de
comercializar, corresponde una revisión jurídica formal.

---

## Clasificación de datos

Cada tabla del sistema declara su nivel. El nivel determina quién accede, qué se audita
y cuánto tiempo se conserva.

| Nivel | Qué incluye | Acceso | Auditoría |
|---|---|---|---|
| **Operacional** | Épocas, eventos, festividades, minutas, comisiones | Cualquier miembro de la escuela | Solo escrituras |
| **Personal** | Perfiles, familias, contactos, membresías | Administración y el propio titular | Escrituras completas |
| **Económico** | Acuerdos de aporte, aportes, morosidad | Administración y la familia titular | Escrituras completas |
| **Menor** | Niños: nombre, fecha de nacimiento, grupo | Administración, maestro del grupo, su familia | Lecturas y escrituras |
| **Sensible** | Observaciones, informes, acuerdos de encuentros | Maestro del grupo, colegio de maestros | Lecturas y escrituras, solo metadatos |

Las tablas de nivel Menor y Sensible auditan también las **lecturas**. Las de nivel
Sensible auditan solo metadatos: quién, cuándo, qué registro. Nunca el contenido de la
observación, porque duplicar el dato sensible en la bitácora multiplica la superficie de
exposición en vez de reducirla.

---

## Minimización

La regla operativa, aplicable a cada campo que alguien proponga agregar:

> ¿Existe una razón pedagógica o legal concreta y actual para guardar esto? Si la
> respuesta es "podría servir después", no se guarda.

Sobre niños guardamos: nombre, fecha de nacimiento, familia, grupo, y lo estrictamente
requerido por la normativa educativa del país. Nada más en el núcleo.

No se almacenan como atributos del niño: diagnósticos, condiciones de salud, temperamentos,
tipologías, evaluaciones psicológicas ni ninguna caracterización permanente. Si una escuela
necesita registrar un antecedente de salud relevante para el cuidado diario, va en un
módulo separado con acceso propio, consentimiento explícito y retención acotada — nunca
mezclado con el registro pedagógico.

---

## Consentimiento

Modelado como dato, no como una casilla en un formulario.

La tabla `consentimientos` registra: familia, tipo, versión del texto aceptado, fecha,
quién lo otorgó, y fecha de revocación si la hubo. Los tipos mínimos son tratamiento de
datos del niño, uso de imagen, comunicación por canales externos, y asistencia de IA en
la redacción de informes.

Un consentimiento revocado detiene el tratamiento hacia adelante; no borra el histórico
que la escuela está legalmente obligada a conservar. Esa distinción tiene que estar
explícita en la UI, no escondida.

---

## Derechos del titular

El sistema debe poder responder a estas solicitudes sin intervención de un desarrollador:

- **Acceso**: la familia ve todo lo que el sistema guarda sobre ella y sus hijos.
- **Rectificación**: puede corregir sus propios datos de contacto directamente.
- **Portabilidad**: exportación completa en formato legible por máquina.
- **Supresión**: eliminación de lo que no esté sujeto a obligación legal de conservación.

Estos cuatro son features del módulo `privacidad`, no scripts de mantenimiento.

---

## Portabilidad de la escuela

Toda escuela puede exportar la totalidad de sus datos en cualquier momento y llevárselos.
Sin fricción, sin trámite comercial, sin degradación del formato.

Esto no es una concesión: en comunidades basadas en confianza es coherencia de valores, y
además es argumento de venta. Un colegio que sabe que puede irse es un colegio que se
atreve a entrar.

---

## Retención

| Dato | Conservación |
|---|---|
| Observaciones | Mientras el niño esté en la escuela, más el período que exija la norma local |
| Informes emitidos | Registro pedagógico permanente de la escuela |
| Datos económicos | Según obligación tributaria del país |
| Auditoría | Cinco años |
| Datos de familias que se retiraron | Anonimización tras el plazo legal, no borrado ciego |

Las reglas de retención son configurables por país en el plugin correspondiente, porque
los plazos cambian entre jurisdicciones.

---

## Seguridad

- Aislamiento entre escuelas por RLS en Postgres, nunca por filtrado en la aplicación.
- La `service_role` key jamás en rutas que atienden peticiones de usuarios.
- Cifrado en tránsito y en reposo (lo provee Supabase; verificar que esté activo).
- Sin datos personales en URLs, parámetros de consulta ni logs.
- Sin datos de producción en entornos de desarrollo. Los seeds usan datos sintéticos.
- Adjuntos en Storage con políticas equivalentes a las de las tablas: un bucket abierto
  anula todo el trabajo de RLS.

---

## IA y datos de niños

- Solo el caso de uso definido en `docs/DOMAIN.md`: asistencia a la redacción de informes.
- Requiere consentimiento vigente de la familia, verificado en tiempo de ejecución.
- Se envía el mínimo contexto necesario; nunca el expediente completo del niño.
- Sin nombres completos en los prompts cuando el seudónimo baste.
- Sin entrenamiento ni retención por parte del proveedor: verificar la configuración de
  retención cero antes de habilitarlo en producción.
- Cada invocación queda registrada en auditoría: quién, cuándo, sobre qué registro.

---

## Checklist antes de cada release

- [ ] Toda tabla nueva tiene `escuela_id`, RLS activado y política explícita.
- [ ] Toda tabla nueva declara su nivel de clasificación en un comentario SQL.
- [ ] Las tablas de nivel Menor y Sensible tienen trigger de auditoría.
- [ ] Ninguna ruta nueva usa la `service_role` key.
- [ ] Ningún dato personal aparece en logs, URLs ni mensajes de error.
- [ ] Los buckets de Storage nuevos tienen política de acceso.
- [ ] Los campos nuevos sobre niños pasan la prueba de minimización.
