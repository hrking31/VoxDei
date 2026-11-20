# Proyección de imágenes y canciones

> Movido de `CLAUDE.md` el 20 de noviembre de 2026 (el archivo superaba los 150 k caracteres). Texto sin cambios.

**Imágenes**: `ControlImagenes` escribe en `displayImage/${groupId}` (`type: "single" | "carousel"`, `images[]`, `interval` en milisegundos) y `ControlDisplay` lo consume rotando con un `setInterval`. La visibilidad va aparte, en `displayVisibleImagen/${groupId}`, con su propio flag `visibleImagen` en `AppContext`. La imagen ocupa la franja central y **sustituye al texto** mientras está encendida; título y ticker conservan sus propios interruptores.

**La foto de perfil se cambia solo en la ficha propia** (23 de octubre de 2026, a pedido del usuario): `UserProfileCard` monta `MiFoto` en lugar de la imagen cuando `esMiCuenta`, y su `alCambiar` hace que `ViewUsers` recargue la lista, que guarda su propia copia de las fichas. La cabecera de `ViewGestion` muestra la foto pero ya no la cambia; no vuelvas a poner `MiFoto` ahí.

**Toda imagen se comprime antes de subirse** (23 de octubre de 2026) con `comprimirImagen(archivo, ladoMaximo)` de `Components/ComprimirImagen/ComprimirImagen.js`: lado máximo 1920 (`LADO_PROYECCION`) en `ControlImagenes` y 512 (`LADO_PERFIL`) en `MiFoto` y `ViewRegister`. Es canvas puro, sin librerías. Pasa a JPEG al 85 % salvo el PNG, que sigue siendo PNG por la transparencia; GIF, SVG, lo que el navegador no sabe leer (HEIC fuera de Safari) y lo que no adelgaza se suben tal cual. Si se añade otra subida, pásala por ahí.

**Canciones**: una canción es `{ titulo, diapositivas: string[], creadoPor, iglesia }`. Desde el 22 de agosto de 2026 el módulo son **tres pantallas con ruta propia**, no un componente con estados internos:

| Ruta | Componente | Qué hace | ¿Toca la proyección? |
| --- | --- | --- | --- |
| `/ViewCanciones` | `ControlCanciones` | catálogo y lista del día | no |
| `/ViewCancion/:id` | `ControlCancionProyectar` | láminas de una canción | sí |
| `/ViewCancionEditar` y `/ViewCancionEditar/:id` | `ControlCancionEditar` | alta y corrección | no |

Antes todo esto era `ControlCanciones` con `cancionActiva` y `formAbierto`: un ternario decidía qué pintar. **El motivo del cambio no es estético**: sin cambio de ruta, el botón «atrás» del navegador o del teléfono sacaba de la sección entera en vez de volver a la lista, y una recarga perdía la canción abierta. Hubo una versión intermedia en la que el formulario era un modal (`ModalCancion`); se descartó por lo mismo y el componente se borró.

`partirLetra` y `normalizar` se compartieron en **`src/Components/Canciones/UtilesCanciones.js`** para no duplicarlas entre las tres.

**El catálogo no se lista entero** (22 de agosto de 2026). `ControlCanciones` son un buscador y dos recuadros: *Canciones de hoy* (`basis-2/5`) y *Favoritas* (el resto, tope `TOPE_FAVORITAS` = 20). El catálogo completo solo aparece **desplegado bajo el buscador** mientras hay texto, con el título a secas y los cuatro botones al lado (`accionesDe`); se cierra al tocar fuera o con Escape, vaciando `busqueda`.

Hubo una versión que medía el hueco con un `ResizeObserver` para mostrar «las que quepan»; se cambió por el tope fijo con filas más compactas en móvil (una columna) y más grandes en escritorio (dos columnas), que da las mismas veinte en ambos casos.

La lista vive en **`iglesias/{groupId}/repertorio/actual`, campo `favoritas`** (array de ids). **No puede vivir en la canción**: `firestore.rules` solo permite `update` sobre `canciones/{id}` a la iglesia dueña (`resource.data.creadoPor == miGroupId()`), así que marcar una canción ajena fallaría. Va en el mismo documento del repertorio, con `merge: true`, para no gastar una lectura más: ese documento ya se escucha. `guardarEnRepertorio` escribe siempre con `merge` porque ahí conviven dos listas —`canciones` (la de hoy) y `favoritas`— y tocar una no debe borrar la otra.

Hubo una versión intermedia que las calculaba solas contando usos (campo `usos`, un mapa que subía al agregar al repertorio); se cambió por la marca manual el mismo día.

Las tres pantallas miden `h-svh` con `overflow-hidden`: **la página no se desplaza**, solo los bloques por dentro (`flex-1 min-h-0` + `overflow-y-auto`). En el catálogo el reparto es 40/60 (`basis-2/5` para la lista de hoy). Al tocar estos componentes, cuidado con quitar los `min-h-0`: sin ellos el contenido empuja el alto y reaparece el desplazamiento de página.

**El costo en Firebase del buscador está analizado en [`docs/BuscadorCanciones.md`](docs/BuscadorCanciones.md)**, con las optimizaciones pendientes (caché en disco, dejar de escuchar en vivo, paginar). Nada de eso está aplicado aún.

Reglas que sobreviven al reparto: solo la pantalla de proyección escribe en RTDB y solo ella deja lista la del templo (título apagado, texto y ticker encendidos) al montarse; `ControlCancionEditar` comprueba `creadoPor === groupId` antes de dejar corregir, porque el catálogo es común pero cada iglesia solo edita lo suyo. La letra se pega entera y se parte por renglones en blanco (`partirLetra`, un `split` sobre `/\n\s*\n+/`). Al proyectar una lámina no se usa un canal nuevo: se escribe el texto en `displayMessage` con `display: "mensaje"`, de modo que `ControlDisplay` no necesitó cambios y los interruptores de visibilidad ya funcionan.

**Las canciones no proyectan título** (22 de agosto de 2026). Antes `proyectarDiapositiva` escribía también `displayTitulo` con `display: "titulo"`, y ahí estaba el fallo: `display` es un único estado en `ControlDisplay` y **los dos listeners lo pisan** (`setDisplay(data.display)` tanto en el de `displayMessage` como en el de `displayTitulo`). Como el título se escribía de segundo, ganaba siempre y dejaba `display` en `"titulo"`, valor con el que el bloque central no pinta nada: la letra llegaba a RTDB pero la pantalla la descartaba. Regla general: **nunca escribas dos canales con `display` distinto en la misma acción**; `display` decide qué ocupa el centro y solo admite un valor.

**`ControlCanciones` tiene dos caras y hay que respetarlas**: con `cancionActiva` en `null` es la **lista**, que solo gestiona —buscar, crear, editar, armar el repertorio— y **no debe tocar la proyección**; con una canción abierta es el **proyector**, con sus láminas. De ahí dos reglas:

- Los interruptores de visibilidad (los tres botones en línea en escritorio y `ModalVisibilidad` en móvil) se pintan **solo si hay `cancionActiva`**.
- La barra de la canción abierta lleva solo **Ver lista** y los interruptores, ambos de `w-20 h-8` para que midan igual (el botón de `ModalVisibilidad` es `w-full h-full`, así que se le da el tamaño desde un contenedor). **`Salida` se pinta solo en la lista** (`!cancionActiva`), y no hay botones de avance: se proyecta tocando la lámina o con las flechas del teclado, que siguen atadas a `siguiente` / `anterior`. La cuenta de láminas vive en el encabezado, entre el título y los botones.
- El efecto que deja la pantalla lista —apaga `visibleTitulo`, enciende `visibleTexto` y `visibleTicker`, en el contexto y en RTDB— se dispara **al abrir una canción**, no al montar la vista. Encender `visibleTexto` ahí no es un adorno: si el operador llega con el texto apagado, es lo único que evita que la letra no se vea.

Hubo una versión intermedia que preparaba la pantalla al entrar a la sección y que quitaba `ModalVisibilidad` del todo; ambas cosas se corrigieron al aclararse que la lista es solo gestión. `ModalVisibilidad` **omite la opción cuyo `onClick` no le llegue** (`.filter((opcion) => opcion.onClick)`), así que basta con no pasarle `toggleVisibleTitulo`; las demás vistas lo siguen recibiendo y no cambian.
