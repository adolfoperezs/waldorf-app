# El usuario prueba en el sitio, no en local

**Pedido por el usuario:** 2026-09-23 ("no probemos nada local, vamos directo a commit en
github y pruebo directo en el sitio web"). Repetido al entregar el lineamiento de UX.

**Why:** no quiere esperar pruebas locales ni levantar Docker; prefiere ver el cambio
desplegado en https://waldorf-app-three.vercel.app y probarlo el mismo.

**How to apply:**
- No levantar servidores de desarrollo ni correr Playwright salvo que lo pida.
- SI correr `tsc`, `lint` y `next build` antes del push: no son "probar", evitan que
  Vercel falle y que el usuario pruebe un sitio roto.
- Las migraciones se ensayan contra produccion dentro de `begin ... rollback` (ver
  [[verificacion]]) antes del `db push`: probar en el sitio no alcanza para la RLS.
- Al terminar, decir exactamente que probar y en que orden, con los casos negativos.
- Hacer las tareas operativas uno mismo (variables de entorno, migraciones, deploy):
  "no me pidas agregarlas a mi".
