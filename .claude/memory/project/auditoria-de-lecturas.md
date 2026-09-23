# Auditoria de lecturas en niveles Menor y Sensible

**Decidido:** 2026-08-28. Fuente: docs/PRIVACY.md.

docs/PRIVACY.md exige auditar tambien las LECTURAS en los niveles Menor (`ninos`) y
Sensible (`observaciones`, `informes_desarrollo`). Postgres no dispara triggers en
SELECT, asi que hace falta un mecanismo explicito.

**Decision:** existe `app.registrar_lectura(tabla, registro, escuela)`, que escribe
solo metadatos (quien, cuando, sobre que registro) y nunca el contenido. Duplicar el
dato sensible en la bitacora multiplica la exposicion en vez de reducirla.

**No** se expone por RPC: si lo fuera, cualquiera podria ensuciar la bitacora con
lecturas que nunca ocurrieron.

**Implementado (0007, 2026-09-23):** `public.ninos_de_mi_familia(escuela)` y
`public.ninos_de_escuela(escuela)`. Son SECURITY DEFINER (solo asi pueden llamar a
`app.registrar_lectura`, que sigue revocada para `authenticated`), y por saltarse la
RLS filtran EXPLICITAMENTE y mas estrecho que `ninos_select`: la primera solo los hijos
de quien llama, la segunda solo para administracion. Devuelven lo minimo que usa cada
pantalla. La app no lee `ninos` directo en ningun sitio.

Queda un hueco conocido: la tabla sigue legible por la API con la politica
`ninos_select` (incluye a colegio_maestros, discrepancia P1 de docs/MAPA.md), y esas
lecturas directas no se auditan. Cerrarlo es revocar SELECT de la tabla y dejar solo
las funciones; conviene hacerlo junto con P1.
