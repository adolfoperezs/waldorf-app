# Escollos al probar la aplicacion

**Escrito:** 2026-08-30.

## Un UPDATE de Supabase que no encuentra la fila NO da error

`supabase.from('x').update({...}).eq('id', y)` sin `.select()` devuelve 204 y
`error: null` aunque no haya tocado ninguna fila. Con RLS de por medio eso pasa cada
vez que la politica filtra la fila, y la accion informa de un exito que no ocurrio.

**Regla: todo UPDATE de una server action lleva `.select()` y comprueba que volvio
alguna fila.** Ver `actualizarEpoca` en `src/features/ritmo/actions/epoca.ts`.

## Playwright: `.click()` en un enlace no espera a que la pagina cambie

Costo mas de una hora de diagnostico. El sintoma era absurdo: la accion decia
"Epoca guardada", la traza del servidor mostraba que se llamaba con el id correcto, y
la base no cambiaba.

La causa: `page.getByRole('link', ...).click()` dispara el clic y sigue. Los `fill`
siguientes encontraban las mismas etiquetas en el formulario "Nueva epoca" de la
pagina de LISTA, escribian ahi, y despues la navegacion terminaba y se enviaba el
formulario de DETALLE con sus valores por defecto.

**Regla: despues de un clic que navega, esperar el destino antes de escribir.** El
helper `abrirEpoca` de `tests/ritmo.spec.ts` lo hace con `toHaveURL` mas un elemento
que solo exista en el destino.

Sintoma que delata este error: el formulario se envia con TODOS los valores por
defecto, no con algunos cambiados.

## Diagnosticar una server action

`console.error` dentro de la accion sale por la salida del servidor de desarrollo. Si
Playwright lo arranca solo, esa salida no se ve. Levantar el servidor aparte
(`npm run dev > /tmp/dev.log 2>&1 &`) y dejar que los tests lo reutilicen
(`reuseExistingServer: true`) hace visible la traza.
