# Las tres capas del producto

**Decidido:** 2026-08-28. Fuente: docs/ARCHITECTURE.md.

Es la decision de arquitectura mas importante. Si las capas se mezclan, cada cliente
nuevo se convierte en una rama de codigo y el negocio deja de escalar.

1. **Nucleo universal** (`src/features/`): sirve a cualquier escuela Waldorf del mundo
   sin modificacion. Ritmo, familias, aportes, comisiones, observaciones, informes.
   Prueba: si una escuela alemana no lo puede usar tal cual, no es nucleo.

2. **Plantilla configurable** (`supabase/seed/plantillas/`): todo lo que cada escuela
   hace distinto, expresado como DATO. Una escuela nueva clona una plantilla base en
   el onboarding y la ajusta.

3. **Plugin pais** (`src/features/cl/`): RBD, SEP, subvencion, SII, boletas, formato de
   RUT. Se activa por el campo `pais` de la escuela.
   Regla: ningun import desde `src/features/cl/` hacia el nucleo. La dependencia va en
   un solo sentido.

Ver [configuracion-pedagogica-como-dato] y [correcciones-migraciones-iniciales].
