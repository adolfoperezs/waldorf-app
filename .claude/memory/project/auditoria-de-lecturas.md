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

**Pendiente (Fase 2):** las lecturas de `ninos` pasan por funciones RPC de `public`
que consultan y registran en el mismo paso, llamando a `app.registrar_lectura` por
dentro. Se decidio en la Fase 0 para que la capa de datos naciera asi en vez de
retrofitearla.
