# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Comandos

```bash
npm run dev          # Vite en modo desarrollo (host 0.0.0.0, accesible desde la red local)
npm run build        # Build de producción a dist/
npm run preview      # Sirve el build de dist/
npm run lint         # ESLint sobre src/ y functions/ (dist/ ignorado)
npm test             # Vitest, una pasada, con 2 procesos como máximo

# Cloud Functions (desde functions/)
npm run serve        # Emulador solo de functions
npm run logs         # Logs de las funciones desplegadas
npm run deploy       # firebase deploy --only functions

# Despliegue del frontend (proyecto voxdei-ec499)
npm run build && firebase deploy --only hosting
```

### Pruebas (desde el 9 de noviembre de 2026)

**Vitest** + **Testing Library** + **jsdom**, configurados en la sección `test` de `vite.config.js`. El usuario pidió (9 de noviembre de 2026) que **todo lo que se haga lleve su prueba**: cada componente o función nueva o tocada se prueba antes de darla por terminada.

- **Nunca más de 3 procesos**: este PC se apagó con pantalla azul el 22 de octubre de 2026 por unas pruebas sin límite. Está en **2** (`maxWorkers: 2`, `pool: "threads"`): con 3, cargar jsdom en paralelo saturaba el PC, los hilos no alcanzaban a arrancar y tardaba 98 s; con 2, unos 15 s y sin fallos. No corras `vitest` a pelo sin `--maxWorkers`; usa `npm test`.
- Los archivos van junto al código: `Nombre.test.js(x)`. Sin `globals`: cada prueba importa `describe`, `it`, `expect`, `vi` de `vitest`.
- Para montar componentes con sesión, contexto y enrutador falsos está `montar()` en `Components/Navegacion/pruebas.utils.jsx` (por defecto: pastor con sesión lista, en computador, que confirma todo). También registra el `cleanup` de Testing Library, que sin `globals` no corre solo.
- Vite **incrusta como `data:`** los SVG de menos de 4 KB (el símbolo): para comprobar una imagen, compárala con el `import` del archivo, no con su nombre.
- Los 18 casos del cronograma que se probaron a mano el 23 de octubre **aún no están en Vitest**.
- Los espejos del servidor tienen guardia: `Roles.test.js` compara `functions/roles.js` con `Roles.js`, y `Validaciones.test.js` compara `LARGO_MINIMO_CLAVE` y `SIMBOLOS_CLAVE` de `functions/index.js` con los de la app. Si cambias uno y no el otro, fallan.

**Antes de correr `npm run dev` en un clon nuevo**: `src/Components/Firebase/FirebaseConfig.js` está en `.gitignore` y no se versiona. Debe existir exportando por defecto el objeto de configuración de Firebase (`apiKey`, `authDomain`, `databaseURL`, `projectId`, `storageBucket`, `messagingSenderId`, `appId`); sin él la app no arranca.

## Arquitectura

VOXDEI es una app de proyección para iglesias: un panel de control (móvil/escritorio) envía contenido en tiempo real a una pantalla de proyección abierta en otra ventana.

### Los dos canales de datos

La distinción más importante del proyecto:

- **Firestore (`db`)** guarda el **contenido persistente**: `users`, `biblia`, `predicas`, `tickers`, `messages`, `imagenes`.
- **Realtime Database (`database`)** guarda el **estado efímero de proyección**: qué se está mostrando ahora mismo y qué secciones están visibles.

Todos los nodos de RTDB se escriben bajo `<nodo>/${userData.groupId}`:
`displayTitulo`, `displayMessage`, `displayVersiculo`, `displayTicker`, `displayImage`, `displayVideo`, `displayVisible*`, `displayEspera`, `pantallaTemplo` (presencia, con un hijo por ventana), `speedTicker`, `turnoEnsayo`. Cualquier nodo nuevo debe seguir el mismo patrón o romperá el aislamiento entre iglesias, y tiene que sumarse **a la vez** a la expresión de `database.rules.json` y a `NODOS_PROYECCION` de `functions/index.js`. **`src/NodosProyeccion.test.js` lo vigila**: busca en `src/` cada `ref(database, \`<nodo>/${…}\`)` y falla si el nodo falta en cualquiera de las dos listas, o si las listas no coinciden.

### Aislamiento multi-iglesia: `groupId`

`ViewRegister` crea al pastor y usa **su propio `uid` como `groupId`**. Todos los usuarios que ese pastor cree después (`ViewUsers`) heredan ese `groupId` y `churchName`. Es la clave de partición de todos los datos por iglesia: consultas de imágenes, rutas de Storage (`imagenes/${groupId}/...`) y todos los nodos de RTDB.

### Flujo de proyección

1. Los componentes `Control*` (`ControlTicker`, `ControlMessage`, `ControlVersiculo`, `ControlPredica`) escriben en RTDB con `set`/`update`.
2. `ControlDisplay` (ruta `/VOXDEI`, que `ViewSelector` abre con `window.open` en ventana aparte) se suscribe con `onValue` y renderiza. Cada suscripción lleva el callback de error `alCortarse`: RTDB se reconecta sola tras un corte de red, pero una suscripción **cancelada** (permiso denegado) no vuelve. `alCortarse` programa un único reintento a los 5 s (una ref impide que seis cancelaciones simultáneas disparen seis) que sube `reintento`, dependencia de todos los efectos. Toda suscripción nueva en esa vista debe llevar `alCortarse` y `[groupId, reintento, alCortarse]`.
3. El campo `display` decide qué bloque se muestra: `"titulo"`, `"mensaje"`, `"mensajePredica"`, `"versiculo"`.
4. Los flags `visibleTitulo` / `visibleTexto` / `visibleTicker` controlan qué secciones aparecen, y viven duplicados: en el contexto de React (respuesta inmediata en el panel) y en RTDB (sincronía con la pantalla).

### Contextos y arranque

`main.jsx` → `CapturaErrores` → `AuthProvider` → `BrowserRouter` → `App` → `AppProvider`. Consecuencia práctica: `useAuth()` está disponible en todas partes; `useAppContext()` solo dentro de `App`.

`CapturaErrores` (15 de octubre de 2026) es el *error boundary* de toda la app: sin él, un fallo al dibujar dejaba la pantalla en blanco. Es de clase porque React no tiene hook para esto, y como está por fuera del router y de los contextos navega con `window.location`.

Cada contexto está partido en dos archivos (15 de agosto de 2026), porque el refresco en caliente de Vite exige que un archivo exporte solo componentes:

| Archivo | Contiene | Se importa desde |
| --- | --- | --- |
| `Context/AppContext.js` | `AppContext` + `useAppContext` | los componentes que consumen el estado |
| `Context/AppProvider.jsx` | `AppProvider` | `App.jsx` |
| `Context/AuthContext.js` | `AuthContext` + `useAuth` | los componentes que consumen la sesión |
| `Context/AuthProvider.jsx` | `AuthProvider` | `main.jsx` |

Los imports de hooks van **sin extensión** (`from "../Context/AuthContext"`): antes muchos escribían `AuthContext.jsx` y habrían apuntado a un archivo que ya no existe. No vuelvas a poner el hook y el proveedor en el mismo archivo.

- **`AuthContext`**: sesión de Firebase Auth (`user`) más el documento `users/{uid}` de Firestore (`userData`, con `role`, `groupId`, `churchName`, `photo`). Expone `signup`, `login`, `logout`, `loading`, `errorPerfil` y `recargarPerfil`.

  Reglas del arranque (15 de octubre de 2026):
  - **`user` y `userData` llegan juntos.** Al iniciar sesión, `onAuthStateChanged` pone `loading` en `true`, lee la ficha y solo después fija `user`. Antes `user` llegaba primero y, en ese hueco, `ProtectedRoutes` veía una sesión sin rol y mandaba a `/VistaNoAutorizada`.
  - **La lectura de la ficha nunca deja `loading` colgado.** Si falla (sin internet), `errorPerfil` pasa a `true`. Antes la excepción escapaba y la app se quedaba para siempre en "Procesando usuario...".
  - **Sesión sin ficha → `PerfilNoDisponible`**, desde `ProtectedRoutes`. Con `errorPerfil` ofrece *Reintentar* (`recargarPerfil`); sin él es un registro a medias y ofrece *Terminar registro*. Ese botón **navega primero y cierra sesión después**: al revés, `ProtectedRoutes` ve la sesión cerrada antes que la navegación y manda a `/ViewLogin` (pasó en la prueba del 15 de octubre de 2026).
  - **El registro se puede retomar.** Son tres pasos no atómicos (cuenta, foto, ficha). Si el correo ya existe, `ViewRegister.obtenerCuenta` inicia sesión con esa contraseña y, si no hay ficha, sigue desde ahí; si la hay, cierra sesión y responde "correo ya registrado". Así un corte de red no deja cuentas zombis sin salida.
  - **`ProtectedRoutes` manda al login con `state.from`** y `ViewLogin` redirige ahí en cuanto hay sesión. Es lo que recupera la ventana del proyector: si se cierra sesión en el panel, `/VOXDEI` cae al login; al volver a entrar, la sesión se comparte entre ventanas y regresa sola.
  - **Todos verifican su correo** (el dueño desde el 15 de octubre de 2026; todo el equipo desde el 23). `ViewRegister` llama a `sendEmailVerification` al terminar, y `ProtectedRoutes` muestra `VerificarCorreo` en vez de cualquier ruta protegida mientras `!correoVerificado`. Se extendió al equipo porque un correo mal escrito por el pastor dejaba una cuenta cuyo «¿Olvidaste tu contraseña?» llegaba a un buzón ajeno; así la persona no puede entrar y el error salta a la vista. A quien crea `crearUsuarioAdmin` no le llega ningún correo (el SDK de administrador no los envía), así que `VerificarCorreo` le muestra primero «Enviarme el enlace» (`enviado` arranca en `false` salvo para el dueño). `correoVerificado` es una copia en estado de `user.emailVerified`, porque `reload()` muta el mismo objeto y React no se entera; `comprobarVerificacion` hace `reload()` y, si ya está verificado, `getIdToken(true)`, porque **el servidor mira `email_verified` en el token**: `crearUsuarioAdmin` rechaza a cualquier pastor sin verificar. `/EliminarCuenta` es pública y sigue a su alcance. Los correos de Firebase salen en español por `auth.languageCode = "es"` en `Firebase.js`.
  - **Contraseñas nuevas: 12 caracteres, mayúscula, minúscula, número y símbolo** (23 de octubre de 2026; antes, solo 8 caracteres). Las reglas viven en `REQUISITOS_CLAVE` / `claveValida` de `Components/Validaciones/Validaciones.js`, con su espejo en `functions/index.js`, y **tienen que coincidir con la política de contraseñas de Firebase Auth** (consola → Authentication → Configuración: modo *Exigir* y **actualización forzada al iniciar sesión**). Si la app aceptara algo que Firebase rechaza, la cuenta quedaría bloqueada en su siguiente inicio de sesión, y `crearUsuarioAdmin` es el punto delicado: el SDK de administrador se salta la política. Firebase cuenta mayúsculas y minúsculas solo en `A-Z`/`a-z` (la Ñ y las tildes no cuentan) y acepta como símbolo solo los de `allowedNonAlphanumericCharacters`, que se consultan en `https://identitytoolkit.googleapis.com/v2/passwordPolicy?key=<apiKey>` (no están `+`, `=` ni el espacio). Se comprueba en `ViewRegister`, `ViewUsers` (con la lista en vivo `RequisitosClave`) y `crearUsuarioAdmin`; nunca en el login. Quien tenga una contraseña anterior recibe `auth/password-does-not-meet-requirements` al entrar, y **a propósito no se traduce**: ve el error genérico del login. Decisión del usuario (23 de octubre de 2026): nada de mensajes ni vistas para la transición; con una sola iglesia, de prueba, si algo no cumple se elimina y se vuelve a crear. Si la app ya tuviera iglesias reales, conviene reconsiderarlo.
  - **`CampoClave`** (23 de octubre de 2026) es el único campo de contraseña de la app: lleva el botón de ojo para mostrarla, **momentáneo y no interruptor** (pedido del usuario): se ve solo mientras se mantiene pulsado, con eventos de puntero más Espacio/Enter para el teclado. **El ojo va fuera del campo, a su derecha**, no superpuesto dentro: los gestores de contraseñas pintan su logo en el borde derecho interior y lo tapaban (lo reportó el usuario). Pásale siempre `autoComplete` (`current-password` / `new-password`); sin él, Chrome rellenaba la contraseña guardada del pastor al crear a otra persona en `ViewUsers`.
- **`AppContext`**: estado compartido del panel (items de ticker/mensajes, flags de visibilidad, velocidad del ticker) y el sistema de notificaciones.
- **`InicializarEstados`**: componente sin UI montado en `App`. Centraliza las suscripciones globales (`onSnapshot` de tickers y mensajes, los nodos de visibilidad y velocidad). Espera a que `userData.groupId` exista antes de suscribirse. Las suscripciones globales van aquí, no en las vistas.

### Notificaciones y confirmaciones

No se usa `alert` ni `confirm`. `AppContext` expone:

- `showNotif(type, message, duracion = 4000)` — tipos `success` | `error` | `warning` | `info`; se cierra sola a los `duracion` ms (4 s de fábrica; los avisos de la pantalla del templo usan 2 s). Cada aviso nuevo reinicia la cuenta.
- `confirmAction(message)` — devuelve una promesa que resuelve `true`/`false` según lo que pulse el usuario. Siempre con `await`. Como hay un solo recuadro, **si otro aviso u otra pregunta tapa una pregunta pendiente, esta se resuelve `false`** (`preguntaPendiente` en `AppProvider`, 23 de octubre de 2026). Antes la promesa quedaba sin resolver y la acción colgada.

**`Notificaciones` es el único componente que puede pintar avisos** (unificado el 15 de agosto de 2026). Está montado una sola vez en `App.jsx`, dentro de `AppProvider`, así que cubre todas las rutas, incluidas login, registro y recuperación de contraseña. Se muestra **centrado en la parte inferior** (`bottom-6`, ancho `max-w-md`), con el mismo tamaño para todos los tipos.

Reglas al escribir una vista:

- Ninguna vista declara estados tipo `error` / `mensaje` para pintar texto de aviso. Antes lo hacían `ViewLogin`, `ViewRegister`, `ViewResetPassword`, `ViewUsers`, `ControlVersiculo` y `ControlImagenes`, cada una con su propio tamaño y color, y varias los pintaban dentro de un formulario concreto: los fallos ocurridos en otra pestaña de la misma vista quedaban mudos.
- El texto no lleva emoji al principio (`✅`, `❌`, `🚫`…). El componente ya pone su icono según el tipo y el emoji descuadraba la altura.
- El centrado se hace con una franja fija (`inset-x-0 … flex justify-center`) y la tarjeta dentro. No uses `-translate-x-1/2` en la tarjeta: framer-motion escribe su propio `transform` y lo pisa.

Excepción deliberada (10 de noviembre de 2026): los cambios de la pantalla del templo los pinta `AvisoPantalla`, con mini pantalla animada y en otra ubicación (ver *Pantalla de entrada y presencia*). No uses `showNotif` para ellos.

Otra excepción deliberada: los scripts de carga masiva `Upload/CargarBiblia` y `Upload/CargarVesiculos` conservan su propio `mensaje` en pantalla. No es un aviso sino un **progreso** que se reescribe en cada capítulo ("Subiendo: Génesis capítulo 3"); como notificación dispararía cientos de avisos seguidos. Además están comentados en `ViewDisplay` y no se montan.

### Modelos de datos

**Biblia**: `biblia/{SIGLA}_{capitulo}` (p. ej. `GEN_1`) con `sigla`, `libro`, `capitulo`, `versiculos` (mapa `"1"` → texto) y `chapter_html`. Se consulta con `obtenerVersiculo(sigla, capitulo, numero, tipo, showNotif)` en `FuncionesControlPredica`. `LibrosBiblia.js` es el catálogo estático (`librosAntiguo`, `librosNuevo`) e incluye el número de versículos de cada capítulo en campos `capitulo1`, `capitulo2`, …, que alimentan los modales de selección. Los componentes de `Upload/` son scripts de carga masiva de un solo uso, normalmente comentados en `ViewDisplay`.

**Prédicas** (sin límite desde el 10 de noviembre de 2026; antes, 5 slots fijos): un documento por prédica en `iglesias/{groupId}/predicas/{id}` = `{ titulo, fecha: "AAAA-MM-DD" | "", serie, base, numeracion, estado: "borrador" | "terminada" | "predicada", piezas[], creado, actualizado }`. Cada pieza conserva la forma de los antiguos `items`: `{ id, tipo, contenido }` con `tipo` `titulo` (un «punto») | `mensaje` | `versiculo` (`contenido` = `{ cita, texto }`). **Las 5 antiguas** (`predica1`..`predica5`, con `items` y sin título) se leen igual (`normalizarPredica`: «Prédica guardada N») y pasan a la forma nueva la primera vez que se guardan (`guardarPredica` escribe sin `merge`). Ya no existe `slots` en el contexto ni su carga en `InicializarEstados`. Ver *Prédica* más abajo.

**Tickers y mensajes**: máximo 6 documentos (`ticker1`..`ticker6`, `message1`..`message6`) con campo `num`. Desde el 22 de agosto de 2026 esa lista **es el recuadro de Favoritos** y se puede borrar, así que quedan huecos: al guardar, `numeroDestino()` toma el `num` que se está corrigiendo, si no el **primer hueco libre de 1..6**, y solo si están los seis ocupados sobrescribe el de `timestamp` más antiguo reutilizando su `num`. No vuelvas a calcular el número con `items.length + 1`: con un hueco en medio, eso pisa un documento existente.

Las dos pantallas comparten **`src/Components/Favoritos/FavoritosTexto.jsx`**: el recuadro y las tarjetas. Cada tarjeta lleva los tres botones (proyectar, editar, eliminar) **arriba a la derecha**, junto al rótulo, y el texto debajo recortado a tres renglones (`line-clamp-3`), para que quepan varias sin alargar la página. Hubo una versión con un visor modal para leer el texto completo; se quitó el mismo día por innecesaria. El componente recibe `etiqueta` ("Mensaje" / "Ticker") y los manejadores; no toca Firestore ni RTDB por su cuenta, todo lo decide el panel que lo monta. El favorito que está en pantalla se marca con `border-app-success bg-app-success/10` y el rótulo «· en pantalla», igual que la lámina activa de `ControlCancionProyectar`.

`numProyectado` es estado local del panel, no un nodo de RTDB: marca cuál de los seis se envió desde esta sesión. Al proyectar el texto del área de escritura se pone en `null`, porque lo que hay en pantalla ya no es ninguno de los favoritos. Una recarga lo pierde, y es deliberado: no vale la pena un nodo nuevo para una marca visual.

### Navegación del panel (9 de noviembre de 2026)

En el **computador** hay una **barra lateral**; en el **celular**, una **barra inferior** con un botón flotante para volver a la sección anterior. **Inicio** es `/ViewInicio`, el resumen del día (la antigua cuadrícula `/ViewGestion` se eliminó). Todo vive en `src/Components/Navegacion/`:

| Archivo | Qué hace |
| --- | --- |
| `Secciones.js` | **La lista única** de secciones (`SECCIONES`, `GRUPOS` «Organizar» (Orden del culto, Cronograma), «Proyectar» (Biblia … Prédica) y «Administrar» (Usuarios, Estilos y colores), en ese orden, pedido por el usuario, `INICIO`). La usan las dos barras. `seccionesPara(userData)` aplica el filtro de roles (Prédica solo pastores); `estaActiva(seccion, pathname)` decide qué ícono se enciende, sin distinguir mayúsculas y con los prefijos de `tambien` (`/ViewCancion/` enciende Canciones, `/ViewServicioEditar` enciende Cronograma). `corto` es el nombre para la barra inferior («Culto»). `EN_BARRA_INFERIOR` / `reparto(userData)` dicen qué cuatro van en la barra del celular (Biblia, Canciones, **Culto** al centro, Mensajes) y qué va en «Más». |
| `MarcoPanel.jsx` | Ruta **sin `path`** en `App.jsx` que agrupa las pantallas del panel y pinta la barra que toque junto al `<Outlet />`. Solo con la sesión lista (`user`, `userData`, `correoVerificado`). En el celular envuelve el contenido en `pb-barra-inferior`. |
| `BarraLateral.jsx` | Computador. **El logo lleva al menú inicial** (`MENU_INICIAL`, `/ViewSelector`; opción A elegida por el usuario). Debajo, la flecha del final («|›» encogida, «‹|» abierta: ícono elegido por el usuario y dibujado en `IconoEncoger`, porque Heroicons no lo trae) la abre por encima del contenido (`w-barra-abierta`) o la encoge (`w-barra`, solo íconos); al elegir algo, con Escape o tocando el velo se encoge. Inicio arriba y los tres grupos de `GRUPOS`. Abajo, en este orden (pedido por el usuario): la persona (nombre y rol), Ayuda, una línea (`data-divisoria`), Cerrar sesión (con `confirmAction`) y la flecha, a la derecha cuando está abierta. **No** abre la pantalla del templo: eso se hace una sola vez, en la entrada. |
| `BarraInferior.jsx` | Celular. Cuatro secciones y «Más» (hoja con Inicio, el resto, Ayuda y, al final, **Menú inicial** y **Cerrar sesión** con confirmación; Escape o tocar fuera la cierra). Lleva `data-barra-inferior`. Exporta también `BotonAnterior`, el botón flotante que usa `useSeccionAnterior.js`: recuerda la **última dirección** de la sección anterior (vuelve a la canción abierta, no a la lista); moverse dentro de una sección no la cambia. Lleva `data-boton-anterior`. |

**Altos en el celular** (`index.css`). `:root` define `--alto-barra: 0px` y `--alto-flotante: 0px`; con `:has([data-barra-inferior])` y `:has([data-boton-anterior])` toman su valor. Encima van tres utilidades: `h-pantalla` / `min-h-pantalla` (100svh menos la barra) **reemplazan a `h-svh` / `min-h-svh` en toda pantalla del panel**, y `bottom-avisos` sube las notificaciones por encima de la barra y del botón flotante. En el computador y en `/VOXDEI` las variables valen 0, así que todo mide como antes. Una pantalla nueva del panel con alto fijo debe usar `h-pantalla`, o quedará tapada por la barra.

**Ayuda** (`/ViewAyuda`, `Components/Ayuda/Ayuda.jsx`): cómo preparar la pantalla del servicio, con botones a las secciones que menciona. No es una sección de `SECCIONES` sino la entrada aparte `AYUDA` (como `INICIO`): va abajo en la barra lateral y al final de «Más». `seccionDeRuta(pathname)` reconoce `INICIO`, las secciones y `AYUDA`; la usan el título de la pestaña y el botón de volver. Reemplazó, el mismo 9 de noviembre de 2026, a un kit de bienvenida en PDF (`docs/kit-bienvenida.pdf`) que el usuario pidió borrar: la ayuda va dentro de la app, no impresa.

**Ya no hay botón «Salida»** (9 de noviembre de 2026): las barras lo reemplazan en los dos tamaños. Se borraron `BotonSalida.jsx`, sus usos, la salida de Prédica y los «¿Regresar al inicio?» de Usuarios. No vuelvas a ponerlo: para ir a la cuadrícula está Inicio.
| `abrirProyector.js` | Abre `/VOXDEI` en la ventana `VisorProyector`. Solo la usa la ficha **Proyectar** de `ViewSelector`. |
| `IconoPestana.jsx` + `iconoPestana.js` | Sin pantalla, montado por `MarcoPanel` (celular y computador). Dibuja en el ícono de la pestaña un punto verde o rojo según `puedoProyectar` (idea 4) y pone `VOXDEI · <sección>` en el título. Lee el SVG del símbolo con `?raw` y los colores del tema con `getComputedStyle`; al salir del panel restaura ícono y título. |

Reglas:

- **Una sección nueva se agrega en `SECCIONES`** y su ruta va **dentro** de `<Route element={<MarcoPanel />}>` en `App.jsx`. Fuera del marco quedan a propósito `/VOXDEI`, `/ViewSelector`, login, registro, `/ResetPassword`, `/EliminarCuenta` y `/VistaNoAutorizada`.
- Las direcciones **no cambiaron**: la barra solo navega a las mismas rutas, así que «atrás», recargar y los favoritos siguen funcionando.
- `isDesktop` (`AppProvider`) es `innerWidth >= 1024`; `InicializarEstados` lo recalcula en cada `resize`, así que la barra aparece o desaparece al cambiar el tamaño de la ventana.
- El prototipo aprobado está en https://claude.ai/artifact/Jaqpt5fwZnHjaaHLzqugne y el del celular en https://claude.ai/artifact/AMSoJ9VXpBRLE5zwJS3kuQ.

**Logo en pantallas** (ideas 1–3 del 9 de noviembre de 2026): `Components/Logo/Logo.jsx` exporta `Simbolo`, `LogoHorizontal` y `LogoVertical` (versiones de fondo oscuro). Vertical en login. **Recuperar contraseña y registro** no llevan logo arriba sino la **marca de agua `MarcaAguaHaz`** (10 de noviembre de 2026, variante D elegida por el usuario en https://claude.ai/artifact/XirrN72rgnKGVbisSdmQyU): **el foco en la esquina de abajo a la derecha y los rayos cruzando en diagonal hasta el borde de arriba**, con polvo flotando en la luz y parpadeo de proyector; **sin la pantalla dorada ni la cruz** (el usuario pidió quitarlas). Son dos SVG en `src/assets/`, generados con posiciones fijas: `voxdei-marca-agua-haz.svg` (rayos tres veces más largos que los del símbolo y el foco en 0,0) y `voxdei-marca-agua-haz-polvo.svg` (46 motas con SMIL, recortadas a la forma de los rayos). La capa `marca-haz` es `fixed` con `inset-0` y `overflow-hidden` (no suma alto ni barra para bajar, y lo que sobra se recorta); cada dibujo lleva `haz-esquina`: mide `210svh`, lleva el foco (50 % / 96,9 % del dibujo) a la esquina y gira `--giro-haz` (28° con la pantalla de pie, 55° acostada, por `orientation`). Rayos: `opacity-17 motion-safe:animate-marca-haz` (parpadeo); polvo: `opacity-50 motion-reduce:hidden`. La vista que la monta lleva `isolate` en su raíz, o quedaría detrás del fondo; el registro va **sin logo** (10 de noviembre de 2026, pedido del usuario; antes, el horizontal encima del título), en la entrada (`ViewSelector`, en vez del título) y en `/EliminarCuenta`. `Loading` muestra el símbolo con `motion-safe:animate-enciende` y `ProtectedRoutes` dice «Encendiendo el proyector...». `CapturaErrores` y `VistaNoAutorizada` muestran el símbolo **apagado** (`grayscale brightness-75 opacity-60`).

### Roles y rutas protegidas

Los roles se definen en un solo sitio: **`src/Components/Roles/Roles.js`** (y su espejo CommonJS `functions/roles.js` para las Cloud Functions). Nunca escribas cadenas de rol a mano en un componente; importa las constantes.

Jerarquía (reformada el 15 de agosto de 2026). **Solo hay dos niveles y tres roles**; se eliminaron `administrador` —nivel intermedio que no se usaba— y el nombre `Asistente`, sustituido por `Operador`:

| Rol | Origen | Puede |
| --- | --- | --- |
| `Pastor` / `Pastora` | el primero se crea en `ViewRegister` (su `uid` es el `groupId`); su pareja, desde `ViewUsers` | todo |
| `Operador` | creado por un pastor | solo manejar la proyección |

Reglas de la pareja pastoral, iguales en la pantalla y en el servidor:

- Una iglesia tiene **como mucho un `Pastor` y una `Pastora`**.
- **Solo el dueño** (quien registró la iglesia) puede dar de alta a su contraparte: si registró un pastor, la única opción de rol que aparece es `Pastora`, y al revés.
- Cuando la pareja ya existe, el selector de rol **desaparece** y todo lo que se cree en adelante nace como `Operador`.
- **No hay cambio de rol posterior.** Se elige al crear y punto.

Dos listas gobiernan el acceso: `ROLES_PASTORES` (`/ViewPredica`) y `ROLES_PROYECCION` (resto de rutas de contenido). `/ViewSelector`, `/ViewInicio` y `/ViewAyuda` solo exigen sesión iniciada. Prédica se oculta de las barras a quien no sea pastor (`seccionesPara`), en vez de dejar que choque con `/VistaNoAutorizada`.

**`/ViewUsers` está abierta a todos** (15 de octubre de 2026), porque es donde cada persona elimina su propia cuenta. Dentro, `soyPastor` decide: el operador entra directo a la lista (`mode` arranca en `"users"`), no ve la pestaña *Crear* y `puedeEliminarA` le devuelve siempre `false`. En la ficha propia (`esMiCuenta`), `UserProfileCard` muestra *Eliminar mi cuenta*, que navega a `/EliminarCuenta`. Ver el equipo no expone nada nuevo: la regla de `users` ya dejaba leer a toda la iglesia.

Quién puede eliminar a quién:

| Quien borra | Operador | Su pareja pastoral | El dueño | A sí mismo |
| --- | --- | --- | --- | --- |
| Dueño (registró la iglesia) | sí | sí | — | no |
| Pastor/Pastora añadido después | sí | — | **no** | no |

Al dueño no lo elimina nadie: su `uid` **es** el `groupId`, y como Firebase no reutiliza uids, la iglesia quedaría huérfana sin retorno. A la pareja pastoral solo la elimina el dueño, para que un desacuerdo entre pares no descabece la iglesia.

`tieneRol(userData, roles)` normaliza antes de comparar: tolera diferencias de mayúsculas y espacios sobrantes. **Sin `userData` devuelve `false`**: el acceso nunca se concede por falta de datos.

### Cloud Functions

`functions/index.js` define `crearUsuarioAdmin`, `eliminarUsuarioAdmin` y `eliminarMiCuenta` (**API v2**: `onCall(async (request) => …)` con `request.data` y `request.auth`; CommonJS, Node 24). Ojo: con `firebase-functions` v6+ el import raíz `require("firebase-functions")` apunta a v2, no a v1 — la firma vieja `(data, context)` deja `context` en `undefined`.

Ambas validan con el helper `exigirPastor(request)`, que **lee el rol del documento de Firestore, no del custom claim**: el pastor se registra desde el cliente y su token no lleva claim de rol. La iglesia (`groupId`) se hereda siempre de quien llama y nunca se acepta del cliente; `exigirObjetivoDeMiIglesia(uid, solicitante)` comprueba que el usuario afectado exista y sea de la misma iglesia.

Lo que impone el servidor, además de lo que ya filtra la pantalla:

- El `role` que llega del cliente se valida contra `ROLES`; si no viene ninguno, se crea como `Operador`.
- Crear un `Pastor` o una `Pastora` exige ser el dueño (`uid === groupId`) y que no exista ya alguien con ese rol en la iglesia.
- Eliminar: nunca a uno mismo ni al dueño; a un pastor o pastora, solo si quien llama es el dueño. Se borra también `users/{uid}/profile.jpg` de Storage.
- Crear es **todo o nada** (23 de octubre de 2026): si falla la ficha o el claim después de `createUser`, se borran la ficha y la cuenta de Auth. Antes quedaba una cuenta sin ficha que no salía en la lista del pastor y ocupaba el correo para siempre. `gender` es obligatorio (Firestore rechaza `undefined`), y `auth/email-already-exists` / `auth/invalid-email` se devuelven en español: el cliente muestra `err.message`, y sin traducir salía el texto de Firebase en inglés.

`ViewUsers` las invoca con `httpsCallable`. **No revertir esto a la creación desde el cliente**: `createUserWithEmailAndPassword` inicia sesión con la cuenta recién creada, de modo que el pastor perdía su sesión y —desde que `ProtectedRoutes` deniega sin rol válido— acababa expulsado a `/VistaNoAutorizada`.

Al borrar se usa `selectedUser.id`, el id del documento, que siempre coincide con el uid de la cuenta. Desde el 15 de agosto de 2026 `ViewRegister` también guarda el campo `uid` dentro de la ficha, igual que `crearUsuarioAdmin`, para que todos los documentos de `users` tengan la misma forma.

La carpeta `functions/` **sí está versionada** (`index.js`, `roles.js`, `package.json`, `package-lock.json` y su `.gitignore`); solo se excluye `node_modules/`.

**`firebase-admin` 14 eliminó la API antigua** (descubierto el 15 de agosto de 2026, con las funciones ya rotas en producción): `admin.firestore()`, `admin.auth()` y `admin.storage()` valen `undefined`, así que toda llamada moría en la primera línea de `exigirAdmin` con `TypeError: admin.firestore is not a function`. Nada se creaba ni se borraba. Hay que importar cada servicio por su subpath:

```js
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getAuth } = require("firebase-admin/auth");
const { getStorage } = require("firebase-admin/storage");
```

Ojo con `admin.firestore.FieldValue.serverTimestamp()`, que ahora es `FieldValue.serverTimestamp()`. El fallo **no aparece en el despliegue ni en el lint**: el paquete se instala bien y el archivo carga; solo revienta al ejecutarse. La forma rápida de verlo es `npx firebase functions:log | grep -v AuditLog`, que separa las ejecuciones reales del ruido de los despliegues.

**En el PC del autor, publicar las funciones exige más margen** (23 de octubre de 2026). Antes de subir, el CLI carga `functions/index.js` para descubrir qué funciones hay y solo espera 10 s; ahí tarda unos 13 s (medido con `node -e "require('./functions/index.js')"`), por la cantidad de archivos de `firebase-admin`, no por el código. El error es `User code failed to load. Cannot determine backend specification. Timeout after 10000` y aborta antes de publicar nada, incluidos hosting y reglas. Se publica así:

```bash
FUNCTIONS_DISCOVERY_TIMEOUT=60 npx firebase deploy --only functions
```

El despliegue a producción lo corre el usuario con `!`: el clasificador de permisos de Claude Code lo bloquea aunque el usuario lo apruebe.

**Versiones acopladas** (2026-08-14): `firebase-admin@^14.2.0` + `firebase-functions@^7.3.2`. No las muevas por separado: `firebase-functions` 7.2.5 declara soporte de admin solo hasta `^13`, y desplegar esa combinación falla en el build de Google con `ERESOLVE`, no en local. Al comprobar compatibilidad, consulta los `peerDependencies` de la **versión instalada**, no de `@latest`.

Se eliminó `firebase-functions-test` de las devDependencies: no había ni un test, nadie lo importaba, y su peer `firebase-admin@^8…^13` bloqueaba la actualización de seguridad. Si algún día se escriben pruebas, hay que reinstalarlo y verificar que su rango ya admita la versión de admin en uso.

### Borrado de la propia cuenta (`eliminarMiCuenta`)

Añadido el 15 de octubre de 2026 porque **Google Play exige que cada persona pueda borrar su cuenta desde la app y desde una web**. La pantalla es `ViewEliminarCuenta`, en la ruta **pública** `/EliminarCuenta` (sin `ProtectedRoutes`): sin sesión explica el proceso y manda al login con `state.from`, de modo que vuelve sola; esa URL es la que se declara en la ficha de la tienda. Con sesión pide la contraseña. Dentro de la app se llega desde la ficha propia en *Usuarios* (hubo un día un enlace al pie de `ViewSelector`; el usuario pidió moverlo).

`eliminarUsuarioAdmin` sigue prohibiendo borrarse a uno mismo: son dos caminos distintos. Uno es la gestión del equipo (el pastor borra a otros); el otro, el derecho de cada persona a irse.

El `groupId` es el uid del pastor que registró la iglesia, y las reglas identifican al dueño con `auth.uid === groupId`; Firebase no reutiliza uids. Por eso la función distingue tres casos:

| Quién llama | Qué se borra |
| --- | --- |
| Operador o pareja pastoral | su carpeta `users/{uid}/` de Storage, su ficha y su cuenta de Auth. La iglesia sigue. |
| Dueño (`uid === groupId`) | **la iglesia entera** (`borrarIglesia`) y después su cuenta |
| Sin ficha (registro a medias) | lo que haya de la cuenta |

`borrarIglesia` hace, en orden: borra a los demás miembros (`borrarPersona` por cada `users` con ese `groupId`); deja las `canciones` con `creadoPor` de la iglesia **sin dueño** (`creadoPor: null`, `iglesia: ""`), decisión del usuario para no romper las listas de otras iglesias, y con `creadoPor` nulo nadie puede editarlas; borra los documentos de `imagenes` y la carpeta `imagenes/{groupId}/` de Storage; `recursiveDelete` de `iglesias/{groupId}`; y pone a `null` cada `<nodo>/{groupId}` de **`NODOS_PROYECCION`**. **Si se crea un nodo nuevo de RTDB en el cliente, hay que añadirlo a esa lista** o sobrevivirá al borrado.

La cuenta de Auth se borra **al final** de cada persona: si algo falla antes, la sesión sigue viva y basta con reintentar (todo el proceso tolera repetirse).

**Confirmación con contraseña.** La pantalla llama a `reauthenticateWithCredential` justo antes, y la función rechaza el token si `auth_time` tiene más de `MINUTOS_CONFIRMACION` (5). Así una sesión abierta y olvidada en el computador del templo no basta para borrar una iglesia.

Lo que **no** existe: transferir la iglesia a otra persona. Si algún día hace falta, hay que desacoplar antes el `groupId` del uid del dueño.

### Custom claims y reglas de RTDB

Las reglas de `database.rules.json` reconocen la pertenencia a una iglesia por `auth.uid === $groupId` (el pastor dueño) o por el custom claim `auth.token.groupId`. Ese claim lo asigna `crearUsuarioAdmin` al crear la cuenta, que es la única vía por la que se crean usuarios. El pastor dueño no lo necesita: las reglas lo reconocen por su uid.

Existía una función `sincronizarPermisos`, con su botón *"Sincronizar permisos del equipo"* en `ViewUsers`, para repartir el claim a los usuarios creados antes de que existieran las Cloud Functions. **Se eliminó el 15 de agosto de 2026**: la app arranca sin datos heredados, así que no hay a quién reparar. Si algún día hiciera falta reintroducirla, ten presente el motivo por el que existía: asignar un claim no reescribe un token ya emitido, de modo que la persona debe cerrar sesión y volver a entrar (o el cliente debe forzar `getIdToken(true)`).

### Aislamiento de datos entre iglesias

Todo el contenido de una iglesia cuelga de su `groupId`, tanto en RTDB (`<nodo>/${groupId}`) como en Firestore:

```
iglesias/{groupId}/predicas/predica1..5
iglesias/{groupId}/tickers/ticker1..6
iglesias/{groupId}/messages/message1..6
```

Construye siempre esas rutas con los helpers de **`src/Components/Firebase/RutasIglesia.js`** (`colIglesia`, `docIglesia`), que además fallan con un mensaje claro si falta el `groupId`. Antes estas colecciones vivían en la raíz con IDs fijos (`predica1`, `ticker1`…), de modo que dos iglesias escribían literalmente sobre el mismo documento. Esas colecciones raíz se borraron de Firestore desde la consola el 15 de agosto de 2026; ya no queda rastro de ellas.

Excepciones deliberadas:

- `biblia` — global, de solo lectura (contenido común).
- `canciones` — **global y de escritura compartida**: cualquier iglesia aporta al catálogo, pero cada documento lleva `creadoPor: groupId` y solo esa iglesia puede editarlo o borrarlo. Es una decisión de producto: el repertorio crece entre todas.
- `iglesias/{groupId}/repertorio/actual` — lo único privado del módulo de canciones: un documento con el array `canciones` (ids del catálogo) que la iglesia usará ese día.
- `users` / `imagenes` — colecciones raíz que se filtran por el campo `groupId`.

### Reglas de seguridad

`firestore.rules`, `database.rules.json` y `storage.rules`, registradas en `firebase.json`. Se despliegan aparte del hosting:

```bash
firebase deploy --only firestore:rules,database,storage
```

En `storage.rules`, `users/{uid}/**` compara el uid directamente **sin consultar Firestore**: en el registro la foto se sube antes de que exista la ficha del usuario, así que una regla basada en `firestore.get()` haría fallar todo registro nuevo. Ambas rutas exigen `contentType` de imagen y menos de 10 MB.

**`imagenes/{groupId}/**` tampoco consulta Firestore** (corregido el 22 de agosto de 2026). Antes resolvía la iglesia con `firestore.get()` sobre `users/{uid}`, y **toda subida moría con 403 `storage/unauthorized`**: las llamadas entre servicios (*cross-service rules*) exigen habilitación y permisos propios del agente de servicio de Storage, y cuando no se pueden resolver la regla **no lanza error, se evalúa como falsa**. El síntoma engañaba: en el panel se veía la miniatura —que es un `objectURL` del archivo local, no del subido— y el fallo aparecía al proyectar. Ahora se reconoce la iglesia como en RTDB: `request.auth.uid == groupId` (el pastor dueño) o el custom claim `request.auth.token.groupId`. Consecuencia a tener presente: quien tenga una sesión anterior a su claim debe volver a entrar.

Ojo: las reglas de Storage no invalidan los enlaces de descarga ya generados con `getDownloadURL()`, que llevan un token y siguen sirviendo el archivo a quien lo tenga. Para cortar uno hay que revocar su token.

En Firestore, el `groupId` del solicitante se resuelve leyendo su documento `users/{uid}` con `get()`. En RTDB eso no es posible, así que la pertenencia se comprueba con `auth.uid === $groupId` (el pastor dueño) o con el custom claim `auth.token.groupId`.

**El agujero que cerró la revisión del 15 de agosto de 2026**: `users/{uid}` permitía `update` a cualquiera sobre su propio documento, sin limitar campos. Cualquier operador podía abrir la consola del navegador, cambiarse el `role` a `Pastor` y entrar a la gestión de cuentas —o cambiarse el `groupId` y colarse en otra iglesia—. Ahora:

- `update` propio: solo el campo `photo`, con `diff(resource.data).affectedKeys().hasOnly(['photo'])`. Nada de rol, iglesia, correo ni nombre.
- `create`: solo el documento propio, con `groupId == uid` y rol `Pastor`/`Pastora`. Es decir, únicamente el registro de una iglesia nueva; nadie puede fabricarse una ficha dentro de la iglesia de otro.
- `delete`: un pastor sobre alguien de su iglesia, nunca sobre sí mismo ni sobre el dueño; y si el objetivo es pastor o pastora, solo si quien borra es el dueño.

El rol lo asigna siempre el servidor con permisos de administrador, que se saltan estas reglas. Por eso pueden ser tan estrictas.

Ese claim lo asigna `crearUsuarioAdmin`, la única vía de creación de usuarios desde que `ViewUsers` dejó de crearlos en el cliente. Ya no hay que preparar nada antes de desplegar las reglas de RTDB: todo usuario nace con su claim puesto.

### Manual para el cliente (`README.md`)

`README.md` no es documentación técnica: es la **presentación del proyecto en GitHub y el manual de uso que se comparte con el cliente**. Está escrito en lenguaje corriente, sin jerga, y solo describe qué hace la aplicación y cómo se usa.

Al terminar cualquier cambio que el usuario final pueda notar, añade una entrada fechada en su sección **Novedades**, contada en términos de lo que cambia para él ("cada iglesia queda separada de las demás"), nunca en términos técnicos ("se movieron las colecciones a subcolecciones por groupId"). Los detalles técnicos van aquí, en `CLAUDE.md`. Si un cambio es puramente interno y no altera nada de lo que el cliente ve, no toca el README.

Nunca describas en el manual una función que no esté terminada sin marcarla como *en preparación*. El caso que citaba este párrafo —**Gestión Video** apuntando a `/ViewPanel`, una ruta inexistente— quedó resuelto: hoy navega a `/ViewVideo`, registrada en `App.jsx`.

**Registro de cambios**: el usuario pidió expresamente (22 de agosto de 2026) que **todo cambio se anote en `README.md`** sin esperar a que lo recuerde, porque es la vista del proyecto en GitHub.

### Pantalla de entrada y presencia de la pantalla del templo (9 de noviembre de 2026)

Diseñada con el usuario sobre la maqueta https://claude.ai/artifact/7nxE97Kzk1vvkhbzXNf82p. El recorrido real es: en el **dispositivo conectado al proyector** (computador, tablet o celular) se pulsa **Proyectar**; después, en ese mismo o en otro, **Administrar**.

- `ViewSelector`: `EncabezadoUsuario` (foto con anillo dorado o iniciales, nombre, rol como insignia, iglesia con su logo o un ícono, y «Cerrar sesión» con `confirmAction`; nombre e iglesia en una línea con `truncate` y el texto completo en `title`; en el celular, la sigla en vez del nombre de la iglesia si existe), saludo con `saludoSegunHora` + `primerNombre`, dos `FichaPaso` que se tocan enteras con los dibujos animados de `Ilustraciones.jsx`, y un pie con `EstadoPantalla` + `ProximoServicio` + «¿Primera vez? Ayuda». Todo en `Components/Entrada/`. **Textos acordados con el usuario, no cambiarlos sin preguntar**: «Proyectar» / «Si este dispositivo va al proyector»; «Administrar» / «Gestiona versículos, canciones, prédicas, mensajes, tickers, imágenes, videos, cronograma, usuarios y estilos» + «Desde este dispositivo o desde otro». Nada de «computador» en los textos: el que proyecta puede ser cualquier dispositivo.
- **Presencia** (`Components/PantallaTemplo/`): `usePresenciaPantalla` (en `ControlDisplay`) escribe `pantallaTemplo/{groupId}/{idVentana}` = `{ modo, dispositivo, por, desde }` con `onDisconnect().remove()`, y lo reescribe cada vez que `.info/connected` vuelve a `true` (tras un corte, `onDisconnect` ya lo borró). `modo` (10 de noviembre de 2026; antes era el booleano `completa`) lo detecta `useModoVentana` sin ayuda del botón, escuchando `visibilitychange`, `fullscreenchange` y `resize`, y lo decide la función pura `modoVentana`: `oculta` (página no visible: minimizada, otra pestaña, tapada, celular bloqueado), `encendida` (Fullscreen API, o en computador la página ocupa la pantalla entera: F11), `maximizada` (en computador, `outerWidth/Height` ≈ `screen.availWidth/Height`; en celular, siempre que se vea) y `ventana` (lo demás; en celular, la pantalla dividida). El iPhone nunca llega a `encendida`: Safari no tiene pantalla completa para páginas. `InicializarEstados` lo resume con `estadoPantalla` en `pantallaTemplo` del contexto: `"apagada"` | `"oculta"` | `"ventana"` | `"maximizada"` | `"encendida"` (o `null` mientras no se sabe; con varias ventanas, la mejor según `MODOS`) y, en cada cambio (también entre `ventana` y `maximizada`), pone `{ id, antes, ahora }` en `avisoPantalla` del contexto (`avisoDeCambio`) en todos los equipos **salvo en la propia ventana `/VOXDEI`** y salvo al cargar. Lo pinta **`AvisoPantalla`** (montado en `App.jsx` junto a `Notificaciones`), no `showNotif`: ver *Aviso de la pantalla del templo* más abajo. Si el corte es brusco, Firebase puede tardar hasta un minuto en borrar la presencia.
- **Proyectar solo se oculta si se sabe que la pantalla está abierta** (cualquier estado salvo `apagada`). Con `null` (cargando o sin permiso de leer) se ofrece: mejor de más que dejar a alguien sin poder abrir el proyector. En el celular también se ofrece.
- `EstadoPantalla` (rehecho el 10 de noviembre de 2026, **diseño pedido por el usuario**): el borde del chip y el ícono son **grises si está apagada y verdes en los otros cuatro estados**, porque en todos ellos la pantalla ya está encendida; solo el **texto** lleva el color del estado. Un ícono distinto por estado (pedido expreso): botón de encendido «Apagada» (gris), ojo tachado «OCULTA» (texto rojo), ventana «VENTANA» (texto dorado `app-main`, «amarillo» para el usuario), monitor «MAXIMIZADA» (texto `app-azul`: casi pantalla completa, se puede proyectar así) y flechas de pantalla completa «COMPLETA» (texto verde). El estado en pantalla completa se llama `encendida` en el código y se muestra «COMPLETA» (pedido del usuario); «Apagada» es el único que no va en mayúsculas.
- **Aviso de la pantalla del templo** (`PantallaTemplo/AvisoPantalla.jsx` + `EscenaPantalla.jsx`, 10 de noviembre de 2026; diseño aprobado por el usuario sobre https://claude.ai/artifact/3tf5hXWdbtZSWaP2i6hNDT). Es **aparte de `Notificaciones` a propósito**: los demás avisos siguen abajo en el centro. Cada aviso lleva una mini pantalla SVG animada (la diapositiva que crece en `encendida`, flechas que empujan en `maximizada`, ventanita que flota, ventana que baja a la barra de tareas con ojo tachado en `oculta`, televisor que se apaga en `apagada`), y **solo dos líneas de texto, pedido expreso del usuario** (en 2 s no da para leer más): arriba el estado (`AVISO_ESTADO`, «Modo maximizado») y debajo el cambio («Ventana → Maximizada»). Se quitaron el 10 de noviembre de 2026 un texto explicativo y la línea del equipo que proyecta («Computador · Ana»): no los repongas. Abajo, una línea que se vacía en `DURACION_AVISO`. Colores: verde, azul, dorado, rojo y gris, iguales al texto del indicador; salen de `data-estado` → variable `--tono` (utilidades `aviso-templo`, `tono`, `resplandor-tono`, `cuenta-tono`, `pista-tono` en `index.css`). **Ubicación pedida por el usuario para no estorbar**: en computador (`isDesktop`) tarjeta de `w-aviso-pantalla` abajo a la derecha, que **se pausa con el mouse encima** (`useCuenta`); en celular y tablet, **píldora arriba** (`top-aviso-isla`, respeta la cámara), que se cierra al tocarla. Un aviso nuevo reemplaza al anterior (`AnimatePresence mode="wait"`, `key={id}`); el de `oculta` se sacude y el de `encendida` lleva un reflejo. Las animaciones de las escenas están en el `@theme` (`animate-escena-*`) con `motion-safe:`; con «reducir movimiento» queda el dibujo final. **`--animate-cuenta-aviso` dura lo mismo que `DURACION_AVISO`**: si cambias uno, cambia el otro. Va en la entrada y en la tarjeta «Servicio» de Inicio. **La pantalla del templo no se abre desde el panel**: ni barra lateral, ni Inicio, ni Ayuda (decisión del usuario).

### Prédica (10 de noviembre de 2026)

Rehecha de cero. Diseño aprobado por el usuario: la «versión 1» (Mis prédicas → Preparar → Predicar) **más el calendario** tomado de una referencia; una versión en tarjetas se descartó por ahora («cuando ya funcione la app vemos si cambiamos el diseño»). Ruta `/ViewPredica` (solo pastores). `ControlPredica/ControlPredica.jsx` es el contenedor; las piezas están en `Components/Predica/`:

| Archivo | Qué hace |
| --- | --- |
| `utilesPredica.js` | Lógica pura (con pruebas): `normalizarPredica`, `documentoDePredica`, números romanos de los puntos (`numerosDePuntos`), `resumenPiezas`, `textoBase` (el primer versículo), `mover` / `quitar`, **`interpretarEntrada`** (una cita reconocida por `parsearCita` es siempre versículo; con «Versículo» elegido y algo que no es cita, nada), `filtrarPredicas`, `ordenarPredicas` (próximas por fecha, luego anteriores), `fechaCorta`, `proximoDomingo`, `diasDelMes`, `predicasPorFecha`, `relojDesde`. |
| `accionesPredica.js` | `crearPredica` (fecha de fábrica: el próximo domingo), `guardarPredica`, `borrarPredica`; `proyectarPieza` escribe **los mismos nodos y formas que la Prédica de antes** (`displayVersiculo`, `displayTitulo`, `displayMessage` con `display: "mensajePredica"`), con las rutas literales para que `NodosProyeccion.test.js` las vea; `cambiarVisible`. |
| `usePredicas.js` | `onSnapshot` de la colección, solo mientras la sección está abierta (`null` = cargando). |
| `BibliotecaPredicas.jsx` | Mis prédicas: buscador (título, serie, citas, sin tildes), filtros, calendario, Próximas / Anteriores y el contador («N prédicas guardadas · Sin límite»: **ahí iría el plan si algún día se cobra por cantidad**). En el celular, la próxima al frente con *Preparar* / *Predicar* y el botón flotante «Nueva prédica» (`bottom-flotante`). |
| `CalendarioPredicas.jsx` | Mes con domingos resaltados; cada día es un círculo `h-7 w-7` (12 de noviembre de 2026, pedido del usuario): con prédica, **borde punteado fino** (1 px; el usuario pidió afinarlo desde 2 px) del color del estado (`tonoDe(estado).borde`, `data-estado-dia`; antes, un puntito debajo), el libre elegido con borde dorado continuo, **hoy con fondo `app-violeta/20` y número violeta** (`data-hoy`; antes, aro gris: el violeta es el único color que no usa ningún estado, y el dorado no se usa en cosas nuevas) y la abierta rellena de dorado. Hoy va de fondo y la prédica de borde, así que se ven juntos. **Tocar no crea nada** (12 de noviembre de 2026, pedido del usuario; maqueta aprobada en https://claude.ai/artifact/C3iE2JJg2KysEeZxBikoth): el calendario solo avisa `onTocarDia(fecha, delDia)` y pinta `marcada` (aro dorado punteado, `data-marcada`). `BibliotecaPredicas` decide: en el **computador**, un día con prédica la abre y uno libre llama a `onElegirFecha` → `elegirFecha` de `ControlPredica`, que cierra la abierta (si la hay) y pone la fecha en la vacía, con el cursor en el título; en el **celular**, lo marca y muestra debajo `data-dia-elegido` («Crear para este día» → `onNueva(fecha)`, o la prédica con Preparar / Predicar). Un día gris del mes vecino solo cambia de mes; «Hoy» aparece fuera del mes actual. Por eso **`tieneAlgo` ya no cuenta la fecha**: la vacía se crea al escribir título o serie, cambiar el estado o completar un ítem. |
| `EditorPredica.jsx` | Preparar: fecha, serie, título, resumen, piezas (tocar una la elige: subir, bajar, corregir en el sitio, quitar) y `CampoPieza`. |
| `CampoPieza.jsx` | El campo único: tipo Punto / Mensaje / Versículo (en el celular, un botón que cambia al tocarlo) y la cita reconocida con su texto debajo, buscado 350 ms después de dejar de escribir (`obtenerVersiculo` con un `showNotif` mudo, para no avisar en cada tecla). En el PC, «Buscar por libro» abre los modales de siempre. |
| `PulpitoPredica.jsx` | Predicar: «Empezar» / «Siguiente» / «Anterior», teclado (flechas, espacio, Re Pág / Av Pág: sirve un control de presentaciones; se ignora mientras se escribe en un campo), tocar una pieza la proyecta, interruptores Título / Texto / Anuncio, **«Ocultar» / «Mostrar»** (antes «En negro», cambiado el 12 de noviembre de 2026 a pedido del usuario; `alternarOculto`): con algo visible dice «Ocultar» con el ojo tachado `EyeSlashIcon` (el de «pantalla oculta») y apaga título, texto, anuncio e imagen, recordando en `antesDeOcultar` qué estaba encendido; con todo apagado dice «Mostrar» con `EyeIcon` y lo vuelve a encender (la imagen, con `encenderImagen`); sin nada que recordar, enciende el texto. «Mostrar» va en **rojo** (`app-error`, el de «OCULTA») y **palpita** (`motion-safe:animate-palpita`, animación del `@theme`: crece un 5 % y suelta un halo rojo, sin bajar la opacidad). **La mini pantalla del púlpito es la guía del predicador** (`PantallaPrevia` con `oculta`): si lo enviado no se ve en el templo —todo oculto, o apagado su interruptor (el título depende de `visibleTitulo`, la imagen de `visibleImagen`, lo demás de `visibleTexto`)—, se oscurece con el borde rojo y dice «No se ve en el templo» con el ojo tachado (`data-aviso-oculta`). En Preparar no se usa. Además **copia el templo**: con Título encendido muestra arriba, en pequeño, lo que hay en la franja de título (`data-mini-titulo`), y con Anuncio encendido el ticker pasando abajo (`data-mini-ticker`, utilidad `ticker-mini` + `motion-safe:animate-ticker-mini`, 14 s). Los lee **`Predica/useLoQueSeVe.js`** con `onValue` de `displayTitulo` y `displayTicker`, los mismos nodos que `ControlDisplay`, así que refleja también lo que mandó otra sección. El `TickerAnimacion` del templo no se reutiliza: es `fixed` y de todo el ancho, reloj, **versículo espontáneo** (antes «al vuelo», nombre cambiado por el usuario el 12 de noviembre de 2026; se proyecta sin tocar el bosquejo; desde el 12 de noviembre de 2026, en el computador es **el mismo `BuscadorVersiculos` de Preparar** con `accion="proyectar"` y, encima, el botón de las Biblias (`SelectorBiblia`, TEMPORAL DHH): campo, Antiguo | Nuevo, cuadrícula y la tarjeta, que proyecta con `proyectarVersiculo`. La tarjeta **no lleva rótulo** («Agregar» / «Proyectar»): lo dice una **marca de agua** grande y tenue en el centro (`data-marca-agua`, en Preparar el `PlusIcon` **de contorno con `strokeWidth` 3** (el relleno era muy fino y no se veía), en Predicar el `PlayIcon` relleno, `text-app-agua/15`), pedido del usuario; el nombre queda en `aria-label`; si no hay turno devuelve `false` y lo escrito se queda. En el celular sigue el campo simple), «Terminar y marcar como predicada». Todo envío pasa por `exigirTurno`. En el celular, «Todo el bosquejo» abre una hoja con la lista, el versículo al vuelo y terminar. |
| `PantallaPrevia.jsx` | La mini pantalla del templo (`pantalla-templo`: morado del símbolo, `--color-app-morado`). |

- **`FranjaTurno` solo en Predicar** (11 de noviembre de 2026, pedido del usuario): en el celular, `ControlPredica` la monta arriba con `predicando` (`borrador && modo === "predicar"`); **en el computador, desde el 12 de noviembre de 2026, va solo sobre la columna derecha del púlpito** (`PulpitoPredica`, envuelta en `-mx-5 -mt-5` para quedar pegada arriba, de borde a borde), **con su diseño de siempre** (el usuario descartó una versión en recuadro redondeado). Los interruptores Título / Texto / Anuncio del púlpito llevan el ícono y el color de las demás vistas (`BookmarkIcon` coral `app-accent`, `ChatBubbleLeftRightIcon` dorado `app-main`, `TagIcon` verde `app-success`; apagados, gris; `data-visible`). en Mis prédicas, Preparar y «Cargando» no aparece. El usuario irá diciendo en qué otras secciones sobra. `exigirTurno` sigue en cada envío.
- **Sin barra de arriba en el computador** (11 de noviembre de 2026, pedido del usuario): se quitó el encabezado «Prédica · Preparar / Predicar» (y `BotonModo`). Se entra a predicar con «Empezar a predicar» del bosquejo y se vuelve con «Volver a preparar» del púlpito. En `BibliotecaPredicas`, **el calendario va debajo de la lista** (Próximas / Anteriores), justo encima del contador.
- **Tres estados y un color por estado** (11 de noviembre de 2026, pedido del usuario; antes, solo `borrador` y `predicada`). `estado` es `"borrador"` | `"terminada"` | `"predicada"` (`ESTADOS`, `estadoValido` en `utilesPredica`; lo desconocido vuelve a borrador). Toda prédica nace borrador; **el botón de estado** del bosquejo (`EditorPredica`, `data-estado-predica`; desde el 12 de noviembre de 2026, **el último de la fila, a la derecha** con `ml-auto`, pedido del usuario; antes, el primero. Entre la serie y el estado van el **versículo base** (hoy el campo `base`; hasta el 12 de noviembre, `textoBase`) en `app-agua`, sin ícono (el usuario pidió quitar el del libro), `data-texto-base`, y el aviso de guardado. En la lista de `BibliotecaPredicas` el versículo base también dejó la línea de arriba (fecha · ítems) y va con la serie, `data-serie-y-base`: «Serie · X · Cita», serie en azul y cita en aguamarina) **solo pasa de borrador a terminada** (12 de noviembre de 2026, pedido del usuario: «si se quiere dejar como borrador no se presiona»; es «✓ Marcar terminada», `data-marcar-terminada`, `marcarTerminada`, al final del tapete y solo mientras sea borrador; para volver a borrador se duplica; `siguienteEstado`, el viejo alternador, se borró el 12 de noviembre de 2026 por quedar sin uso). **Terminada exige fecha** (12 de noviembre de 2026, pedido del usuario: las copias de «Duplicar» salen sin fecha): sin ella, `cambiarEstado` avisa, enfoca la fecha y llama a `showPicker()` (en un `try`), y con `esperaFecha` el primer día elegido guarda `{ fecha, estado: "terminada" }`; si el campo pierde el foco sin elegir, se olvida. «Terminar y marcar como predicada» del púlpito **no** lo exige (no se pidió); «Terminar y marcar como predicada» del púlpito pone `predicada`. **«Sin predicar» no se guarda**: `estadoVisible(p, hoy)` lo da a la que no está predicada y cuya fecha ya pasó. El calendario pinta el punto del día con `estadoDelDia` (el más urgente: sin predicar > borrador > terminada > predicada). Colores, en estilo «tonal» (fondo `/10`, borde y letra del color), en **`Predica/tonosPredica.js`** (`tonoDe`): borrador `app-naranja` (`#ff6b1a`; dorado hasta el 12 de noviembre de 2026, cuando el usuario lo cambió porque el dorado es el acento de la app; los meses de la línea de tiempo van ahora en dorado), terminada `app-azul`, predicada `app-success`, sin predicar `app-error`, el filtro Todas `app-texto`. Los usan las filas, su etiqueta, los filtros (cuatro, en dos columnas, `h-7`, `text-chip` de 13 px en el `@theme`), el botón de estado y el punto del calendario. El usuario sugirió rojo para las predicadas; se le propuso verde (el rojo es «error» en la app) y el rojo quedó para «sin predicar».
- **Diseño elegido sobre el lienzo** (11 de noviembre de 2026, página «Diseños · 11 nov» de https://claude.ai/artifact/KwkbxFGKeLLax6p4Xdrvy6): **Fondo 6, tapete de corte**, y **Lista 2, línea de tiempo**. El tapete es la utilidad `tapete` de `index.css` (`--color-app-tapete` verde oscuro, cuadrícula de 20 px y guía `app-main` cada 100 px, medidas en rem para coincidir con la regla; **queda quieto y las piezas se desplazan encima**) y va **solo en el `<ol data-tapete>`** de `EditorPredica`: del título al campo de abajo (los datos van fuera, arriba, también en el celular). Cada pieza lleva `bg-app-tapete-pieza`. **Reglas** (`ReglaTapete`, `data-regla="arriba"` / `"izquierda"`, fondo `app-tapete-regla`, borde `app-main/35`): un número cada `w-25` / `h-25` (6.25rem), la misma medida que la guía dorada; si cambias una, cambia la otra. Sin las diagonales del lienzo.
- **La vacía del computador** (11 de noviembre de 2026, pedido del usuario: nada de «Elige una prédica» sobre gris): sin prédica abierta (`!abiertaId && !borrador`, solo `isDesktop`), `ControlPredica` muestra `EditorPredica` con `predicaVacia()` (sin `id`, fecha `proximoDomingo()`) y la columna de la vista previa (Duplicar y Borrar desactivados). **No hay documento hasta el primer cambio**: `cambiarVacia` llama a `crearPredica` una sola vez (guardia `creando`, una ref) y, al volver, abre la creada con lo último escrito (`vaciaActual`) y la marca `pendiente` para que el guardado automático escriba lo tecleado mientras se creaba. Desde el 12 de noviembre de 2026 no hay textos de guardado en pantalla (pedido del usuario). Depende de que Firestore avise por `onSnapshot` de la nueva antes de que `addDoc` termine (lo hace: escritura local); si no, el efecto que cierra las borradas desde otro equipo la cerraría. **En el computador no hay botón «Nueva»** (12 de noviembre de 2026, pedido del usuario): la nueva es la vacía. En su lugar, arriba de Mis prédicas, va **«▶ Predicar»** (prop `onPredicar` de `BibliotecaPredicas`). La función `nueva` sigue viva solo para el celular (botón flotante «Nueva prédica» y «Crear para este día»); en el computador, el calendario usa `elegirFecha`. La lista de `BibliotecaPredicas` es una línea vertical (`left-1.75`) con un punto por prédica (`data-punto`, `tono.punto`, **fuera del botón**, en el `li` con `pl-6`, para que el recuadro de la abierta no se pegue al punto; la abierta con `ring-4 tono.halo` y `tono.abierta`), agrupada por mes con `agruparPorMes` (utilesPredica; el año solo si no es el de hoy, «Sin fecha» aparte) dentro de Próximas / Anteriores.
- **Pieza «imagen»** (11 de noviembre de 2026, pedido del usuario): `{ tipo: "imagen", contenido: { url, nombre } }`. En `TIPOS_PIEZA` reemplazó a «Versículo» (la cita se reconoce sola y `NOMBRE_TIPO` sigue nombrándolo); con Imagen elegida `interpretarEntrada` devuelve `null` y `CampoPieza` cambia el campo por «Subir imagen» (`<input type="file" accept="image/*">`, en el celular galería o cámara) y «Mis imágenes» (`ModalImagenes`). La subida y la escucha son **`Components/Imagenes/imagenesIglesia.js`** (`subirImagen`: `comprimirImagen` → Storage `imagenes/{groupId}/…` → documento en `imagenes`; `useImagenesIglesia(groupId, activo)`), que también usa ahora `ControlImagenes`: una foto subida en Prédica aparece en Imágenes. `proyectarPieza(groupId, pieza, { imagenEncendida })` manda la imagen por `displayImage` (`single`) y enciende `displayVisibleImagen`; cualquier otra pieza, con `imagenEncendida`, la apaga antes (la imagen tapa el texto en `ControlDisplay`). `PulpitoPredica` pasa `visibleImagen` del contexto y «Ocultar» también la apaga. Desde el 12 de noviembre de 2026, el bosquejo del púlpito y su línea «Luego» muestran la **miniatura** de cada imagen (`Miniatura`, `data-miniatura`). `PantallaPrevia`, el bosquejo (miniatura, sin «Corregir»), `textoDePieza`, `resumenPiezas` (`imagenes`) y `WhatsAppButton` la conocen. Se quitó el `h2` «Así se verá en el templo» de la columna de la vista previa.
- **Agregar en el sitio (computador, 11 de noviembre de 2026, pedido del usuario)**: abajo del bosquejo no hay campo, solo `TIPOS_PIEZA` como botones cuadrados (grupo «Agregar al bosquejo», `flex-1`, ícono de `ICONO_TIPO` + nombre, borde y texto en su neón que se rellenan al pasar el mouse: `tono.contorno`; elegido por el usuario del lienzo, «Botones 1» en cuadritos; `onMouseDown` con `preventDefault` para no robar el foco) y, tras una línea, la prop `acciones` de `EditorPredica`: WhatsApp, Duplicar y Borrar con ícono y nombre (`BotonSecundario` y `WhatsAppButton` con `className`/`children`), los seis del mismo ancho ocupando toda la barra. «Empezar a predicar» ya no existe en el computador: es «▶ Predicar» arriba de Mis prédicas, en `BibliotecaPredicas` (12 de noviembre de 2026; del 11 al 12 estuvo en la fila de estado, fecha y serie de `EditorPredica`). `crearVacia(tipo)` (`EditorPredica`) guarda lo que se estaba escribiendo, quita imágenes sin foto, agrega el recuadro vacío **al final** (12 de noviembre de 2026, pedido del usuario: antes, debajo del elegido, con `insertarDespues`, que se borró) y lo abre en edición: textarea en el sitio (todo el ancho del recuadro, transparente, sin borde, con la letra del contenido: pedido del usuario), Enter / perder el foco / botón **«Guardar»** guardan, Shift+Enter es salto de línea en el mensaje, Escape cancela; uno nuevo que queda vacío se va (`aplicarEdicion`). La guardia `edicionActual` (ref) evita que el campo que se desmonta pise la edición nueva. Imagen: recuadro `data-sin-foto` con **`ElegirImagen`** («Subir imagen | Mis imágenes», compartido con el celular); la foto llega con `onCambiar(función)` (`ControlPredica.cambiar` y `cambiarVacia` aceptan una función de la prédica actual). **`piezaCompleta`** decide qué vale: `documentoDePredica` nunca guarda vacíos ni imágenes sin foto, el púlpito los filtra y la vacía no crea el documento hasta que `tieneAlgo`. **El buscador de versículos** es **`BuscadorVersiculos`** en la columna derecha (después de `SelectorBiblia`, `flex-1`): campo de todo el ancho sin botón (Enter agrega; texto de ayuda «Escribe una cita: Juan 3 16», pedido así), la vista de la cita, «Antiguo | Nuevo» con el estilo de `SelectorBiblia` y la cuadrícula **sin modales**, de **alto fijo** `h-94` (el de los 39 libros del AT de la RVR1960; lo demás se desplaza), libros con `nombreCorto` → capítulos → versículos; tocar un versículo lo **elige** (no lo agrega) y queda marcado; debajo, hasta el final de la columna, la **tarjeta del versículo elegido** (`data-versiculo-elegido`: cita, `siglaBiblia`, texto), escrito o de la cuadrícula: **un clic la agrega** (o Enter en el campo). Libros de la Biblia elegida (TEMPORAL DHH). `agregarVersiculo` lo agrega al final, y en el celular `agregar` también: **todo ítem nuevo va al último** y `EditorPredica` lo trae a la vista (`data-id` + `scrollIntoView`). `CampoPieza` quedó solo para el celular. **El celular no cambió** (decisión del usuario «por el momento»): sigue con `CampoPieza compacto`.
- **Color por tipo de ítem** (11 de noviembre de 2026, pedido del usuario): `Predica/tonosPieza.js` (`tonoPieza(tipo)` → `caja`, `elegida`, `acento`, `boton`), forma de la «opción A · Vivos» del lienzo (la primera prueba, en pastel rosa/lila/celeste, se descartó: no se distinguían) con **los cuatro colores de una paleta que mandó el usuario, sin el rosa, en neón**: punto `app-violeta` `#b388ff` (también los números romanos), versículo `app-agua` `#2ee6c9` con `BookOpenIcon` en la columna del ícono y, junto a la cita, `siglaBiblia(contenido.version)` (`avisosBiblia.js`, permanente; sin versión, RVR1960), imagen `app-rojo-neon` `#ff5470` (rojo pedido por el usuario, más rosado que `app-error`), mensaje `app-plata` `#c3c7cc`. El fondo es la utilidad `fondo-pieza-*` de `index.css`: `app-pieza-base` sólido con un degradado del color que **nace a la izquierda y se desvanece** (pedido: «más difuminado»); el brillo, la sombra del tema `shadow-neon-*` (se suma al `ring` de la elegida; bajado a 6 px y menos de la mitad de fuerza: «menos brillo»). **El texto del contenido es `app-texto` en todos los ítems** (pedido): el color va en borde, brillo, fondo, números, cita e íconos. **Nada de dorado** para los ítems: el usuario pidió no usarlo porque ya está en muchas partes (tampoco verde, del tapete; el rojo de la imagen lo pidió el usuario). Los usan los recuadros del tapete (`EditorPredica`) y el botón del tipo en `CampoPieza`. En la lista de Mis prédicas, la palabra del estado es **solo texto** de color (`tono.letra`) y, desde el 12 de noviembre de 2026, **solo se ve en «Sin predicar»** (es un aviso); en las demás la dice el color del punto y queda en `sr-only` para el lector de pantalla (pedido del usuario: la lista se veía cargada) y la cuenta es `cuantosItems` («ítems», no «piezas»; desde el 12 de noviembre de 2026 el púlpito también: «Ítem 2 de 8», «8 ítems», «Toca uno para proyectarlo», y la mini pantalla «Toca un ítem para verlo aquí»; en el código siguen llamándose `piezas`. En la columna derecha del púlpito, el reloj va centrado y en `text-4xl` (`data-reloj`), y «Terminar y marcar como predicada» (verde de predicada, `data-terminar-predicada`) y «Volver a preparar» (con borde, fondo y flecha, `data-volver-preparar`) tienen estilo de botón: antes el segundo parecía texto).
- **Recuadro de arriba del bosquejo** (12 de noviembre de 2026, opción D del lienzo https://claude.ai/artifact/C3iE2JJg2KysEeZxBikoth, con los cambios del usuario). Tres columnas: a la izquierda la **fecha como hoja de almanaque** (`data-hoja-fecha`, `hojaDeFecha` en utilesPredica: «NOV · 15 · domingo»; sin fecha, «SIN FECHA · ? · elige el día» con borde punteado dorado) que abre el `input type="date"` escondido (`sr-only`) con `showPicker`; al centro el título, «Serie · X · cita» y el resumen de ítems; a la derecha, **el chip del estado** con su tamaño de siempre (`data-estado-predica`, `h-7 text-chip`, ✓ si no es borrador; **solo muestra**), **centrado en el alto del recuadro** (la columna es `self-stretch` y el chip va en un hueco `flex-1 items-center`), y debajo, **en la esquina de abajo a la derecha, el lápiz** (`data-editar-datos`, cuadrado `h-9 w-9` como los botones de los ítems, `aria-label` «Editar»; **siempre es un lápiz**: editando se pinta dorado, no cambia a ✓). En el celular, chip y lápiz van en una fila. El recuadro mide lo mismo de alto que antes. **Sin textos de guardado ni botón de estado arriba** (12 de noviembre de 2026, pedidos del usuario): el guardado sigue automático y, si falla, avisa `ControlPredica` con `showNotif`; al final del tapete siempre queda un espacio en blanco (`data-espacio-final`, `min-h-24`) y, a su derecha, mientras sea borrador, «✓ Marcar terminada» con sombra: **siempre debajo del último ítem, nunca encima** (se probó flotando con `sticky` y tapaba al ítem recién agregado; el usuario pidió quitarlo). **Para volver a borrador se duplica** (decisión del usuario): `crearPredica` siempre crea en borrador. **Al marcarla terminada se limpia** (pedido del usuario): `marcarTerminada` de `ControlPredica` (prop `onTerminar` de `EditorPredica`, que pasa `{ fecha }` si se pidió sin fecha) la guarda con `estado: "terminada"`, la cierra, deja la vacía nueva y avisa «“Título” quedó terminada»; en el celular vuelve a la lista. Sin nada escrito (la vacía sin documento), avisa «Escribe algo antes de marcarla terminada». **Ya escrita se ve limpia**: el título es `readOnly`, sin lápiz ni línea; serie y cita como texto (si faltan, no aparecen). **`editandoDatos`** pone título, serie, cita y hoja en línea punteada dorada; Enter en el título o el mismo lápiz lo terminan. Arranca editando si no hay título, al crear o duplicar (`enfocarTitulo`) y nunca se corta cuando la vacía se convierte en documento (id de `null` a uno real). La fecha solo se cambia editando, salvo sin fecha. En modo editar, la serie vacía dice «Escribe la serie (opcional)». **El versículo base es un dato propio** (`base`, 12 de noviembre de 2026, pedido del usuario: «solo muestra la cita arriba junto a la serie, no agrega el mismo versículo como ítem»): en modo editar es el campo `CampoBase` («Escribe el versículo base (ej. Juan 3:16)»), que al salir o con Enter pasa lo escrito por `citaBase` (`parsearCita` con el catálogo de la Biblia elegida, TEMPORAL DHH): «juan 3 16» → «Juan 3:16»; lo que no es cita avisa y no se guarda, y vacío lo quita. Las prédicas de antes, sin el campo, toman el primer versículo del bosquejo (`normalizarPredica` con `textoBase`) y lo guardan aparte desde el primer cambio. Lo copian Duplicar (`crearPredica`) y lo busca `filtrarPredicas`; la lista lo muestra con la serie. En el celular, chip y lápiz bajan debajo, en fila; la barra de arriba ya no dice nada del guardado. Al crear (o duplicar) una prédica, `ControlPredica` guarda `recienCreada` y `EditorPredica` pone el cursor en el título con el texto seleccionado; abrir una existente no mueve el cursor.
- **Deshacer y Rehacer** (12 de noviembre de 2026, pedido del usuario; se le propuso en vez de un «Cancelar», que con el guardado automático borraría todo de golpe). El historial vive en `ControlPredica` (`historial` = `{ pasado, futuro }`, copias enteras de la prédica, hasta `PASOS_HISTORIAL` = 50) y se vacía al cambiar `abiertaId`: es solo de la abierta y en memoria. `cambiar` anota el estado anterior antes de aplicar (`anotarPaso`), salvo si es otra tecla en el mismo campo (`titulo` o `serie`) con menos de `JUNTAR_TECLEO` (1 s) de pausa. Deshacer o rehacer pone la prédica y la deja `pendiente`, así que se guarda sola. Botones en **`Predica/BotonesHistorial.jsx`** (solo ícono, `ArrowUturnLeftIcon` / `ArrowUturnRightIcon`). En el computador, la barra de abajo son **tres tramos** pedidos por el usuario: `[Punto Mensaje Imagen] │ [↶ ↷ Borrar Duplicar] │ [WhatsApp]` (`flex-3`, `flex-3`, `flex-1`; los dos últimos los arma `acciones` en `ControlPredica`, el grupo `Cambios`). En el celular van en la barra de arriba de `EditorPredica` (prop `historial`). Atajos solo en el computador y en Preparar: Ctrl+Z, Ctrl+Y y Ctrl+Shift+Z; dentro de un campo de texto se ignoran y manda el del navegador. El «Quitar» de cada ítem (y de la imagen sin foto) lleva **`TrashIcon`**, no la X (12 de noviembre de 2026, pedido del usuario: «se entiende más»).
- **Guardado automático**: `ControlPredica` guarda 800 ms después del último cambio (`pendiente` → `guardando` → `guardado` / `error`), y lo pendiente se guarda también al cambiar de prédica o salir de la sección. No hay botón de guardar.
- **Por pantalla** (12 de noviembre de 2026, propuesta aprobada por el usuario: https://claude.ai/artifact/TbjJUe59Na4bgcTAMn1hd2). **`Hooks/formatoPantalla.js`**: `formatoDe(ancho)` → `celular` (< 744) | `tableta` (744–1023, el iPad mini de pie) | `escritorio` (≥ 1024, igual que `isDesktop`), y `esBaja` (escritorio con menos de 800 de alto: PC de 1280×720 o 1366×768). `AppProvider` guarda `formatoPantalla` y `pantallaBaja`, `InicializarEstados` los recalcula en cada `resize`, y `useFormato()` los lee (sin ellos, deduce de `isDesktop`: las pruebas viejas siguen igual).
  - **Celular**: una pantalla a la vez (biblioteca → bosquejo → púlpito). Preparar: arriba ← título ↶ ↷ **⋯** (`menuMas` de `EditorPredica`: Duplicar, WhatsApp, Borrar y la Biblia, que antes faltaban en el celular) y ▶ Predicar; abajo `BotonPunto` (con las combinaciones) + **Versículo** (hoja con `BuscadorVersiculos`, `onAgregarVersiculo`) y el `CampoPieza` de siempre; el ítem elegido trae **«Ver en la mini pantalla»**. Predicar: la mini pantalla, sus 4 botones en cuadrícula (`interruptoresDe(true)`) y «Luego»; abajo **el muelle** (`data-muelle`, fijo, al alcance del pulgar): pestañas Bosquejo / Versículo / Resumen (`data-pestana`) y Anterior / Siguiente. Las pestañas abren una **hoja** (`data-hoja`) sobre el escenario que **nunca tapa el muelle**; «Terminar y marcar predicada» va al final de la pestaña Bosquejo, lejos de Siguiente.
  - **Tableta**: Preparar con el bosquejo a todo el ancho y la barra de abajo completa (pasa a dos filas: `flex-wrap`), Mis prédicas en un **cajón** desde la izquierda (`data-abrir-cajon`) y los versículos en un **panel** que se desliza desde la derecha (vista previa, Biblia, buscador). Arranca con la vacía, como el computador. Predicar: franja arriba, la mini pantalla grande, debajo el bosquejo y al lado Luego, el resumen, el versículo espontáneo y Terminar; el muelle con Anterior / Siguiente abajo.
  - **Escritorio**: tres columnas, como antes. Mis prédicas se puede **plegar** a una franja (`data-mis-plegada`: abrir y ▶ Predicar; `onPlegar` en `BibliotecaPredicas`); con pantalla **baja** arranca plegada, la cuadrícula de libros de `BuscadorVersiculos` arranca plegada tras «Buscar por libro» (prop `plegable`, `data-plegar-libros`) y, al predicar, Luego y el resumen van al lado de la mini pantalla (`data-escenario-bajo`).
  - Los atajos de teclado (Ctrl+Z…) valen en tableta y escritorio. El campo simple del versículo espontáneo del celular (`proyectarAlVuelo`) se borró: todas las pantallas usan `BuscadorVersiculos`.
- **TEMPORAL DHH (11 de noviembre de 2026, pedido del usuario: «la Biblia católica»)**: Prédica usa la Biblia elegida en `SelectorBiblia` (RVR1960 o DHH con los deuterocanónicos). El botón va en la columna de la vista previa (computador), arriba de «Mis prédicas» (celular) y, desde el 12 de noviembre de 2026, también en Predicar, encima del versículo espontáneo (computador). `CampoPieza` y el versículo al vuelo de `PulpitoPredica` pasan el catálogo de esa versión a `interpretarEntrada` / `parsearCita` (tercer y segundo parámetro) y la versión a `obtenerVersiculo`; «Buscar por libro» recibe `libros`. La vista de la cita lleva «DHH» cuando no es la RVR1960. Lo ya agregado conserva su texto (cada pieza es una copia).
- **Pendiente**: el apunte privado por pieza (solo lo ve el pastor), las series con color y arrastrar para reordenar (hoy, subir y bajar, y la numeración).
- **Orden al predicar** (12 de noviembre de 2026, pedido del usuario: «los puntos son subtítulos, el título principal es el nombre de la prédica»). En `PulpitoPredica`, **«Empezar» proyecta el nombre de la prédica en el centro** como mensaje (la «portada», `enPortada`, primera fila de la lista con `data-portada`). Con «Siguiente», el primer ítem va con `tituloArriba`: `proyectarPieza` escribe **antes** `displayTitulo` con el nombre y con **el mismo `display` del ítem** (`versiculo` o `mensajePredica`), porque en `ControlDisplay` los dos escuchas cambian `display` y, con valores distintos, el último pisaría al otro; y se enciende el Título **una sola vez** (`tituloSubido`, una ref: si después lo apagan, se respeta). «Anterior» desde el primer ítem vuelve a la portada. **En la portada el nombre sale solo como mensaje**: `mostrarPortada` apaga el Título si estaba encendido y borra `tituloSubido`, para que el nombre no se vea dos veces; con el siguiente ítem vuelve a subir y el Título se enciende. **Los puntos ya no van por `displayTitulo`**: se envían como mensaje con su número (`comoSeEnvia` + `textoDePunto`: «I. La fe ve lo invisible»). Así el botón Título controla solo el nombre de la prédica arriba, y Texto todos los ítems; la guía de la mini pantalla se ajustó a eso. **Resumen de puntos vistos**: debajo de «Luego», si ya pasó algún punto, la sección `Resumen de puntos vistos` (`resumenDePuntos`: los puntos hasta el actual, con su número) y, al tocarla (`data-resumen`), se proyectan todos juntos como un mensaje, uno por renglón (`ControlDisplay` usa `whitespace-pre-wrap`); la etiqueta de arriba dice «Resumen». El recuadro lleva la marca de agua ▶ centrada (`data-marca-agua="proyectar"`), como la tarjeta de `BuscadorVersiculos`. **Va por partes** para no quedar cortado (pedido del usuario): `partesDelResumen` lo reparte en paquetes de `RENGLONES_RESUMEN` (6) sin separar un punto de sus subpuntos (si no cabe entero pasa a la parte siguiente; solo se parte si él solo no cabe en una). La línea punteada entre partes es `border-app-muted/60` y, con el recuadro encendido, `border-app-main/70` (antes, `border-app-border`, se perdía sobre el dorado). Cada toque proyecta la parte siguiente y, tras la última, vuelve a la primera (`resumenEnPantalla` = `{ hasta, parte }`: vale mientras no se avance de ítem). El recuadro muestra las partes separadas (`data-parte`, la que está en pantalla con `aria-current`); el texto «toca para la parte N de M» se quitó a pedido del usuario; la etiqueta de arriba, «Resumen · parte N de M». **Regla (12 de noviembre de 2026, pedido del usuario): solo lo que se proyecta desde «Resumen de puntos vistos» va sin centrar**: `displayMessage` lleva `alineacion: ALINEACION_RESUMEN` (`"izquierda"`; también se acepta `"derecha"`), y `ControlDisplay` lo pinta como un bloque centrado con los renglones alineados (`ControlDisplay/alineacionMensaje.js`: `alineacionValida`, `bloqueDeMensaje`); `PantallaPrevia` hace lo mismo. **Con sangría francesa** (pedido del usuario: si un punto ocupa varias líneas, las siguientes se alinean con su texto, no con su número): los dos lo dibujan con **`ControlDisplay/ResumenPuntos.jsx`**, que separa cada renglón con `lineasDeResumen` (nivel por la sangría de 4 espacios, número y texto) y lo pone en tres columnas con la utilidad `lista-resumen` de `index.css` (número del punto, letra del subpunto, texto; `data-renglon`). Lo que se envía sigue siendo el mismo texto con saltos de renglón. Ningún otro mensaje lleva `alineacion`, así que todo lo demás sigue la alineación de Estilos y colores. Las reglas de RTDB no validan campos: no hubo que publicarlas.
- **Numeración de los puntos** (12 de noviembre de 2026, pedido del usuario): cada prédica guarda `numeracion` con **las mismas opciones de la biblioteca de números de Word** (pedido del usuario; `NUMERACIONES`: `numeros` «1.», `numeros-parentesis` «1)», `romanos` «I.» (de fábrica), `letras` «A.», `minusculas-parentesis` «a)», `minusculas` «a.», `romanos-minusculas` «i.»; `numeracionValida`, lo desconocido vuelve a romanos; hubo una opción «Sin número» que el usuario pidió quitar el mismo día). La etiqueta lleva su signo (`etiquetaPunto(3, "numeros-parentesis")` → «3)»), y `textoDePunto` solo agrega un espacio. `etiquetaPunto` / `numerosDePuntos(piezas, estilo)` la aplican en el bosquejo, el púlpito, lo proyectado y el resumen. Se elige en **el botón «Punto» de la barra de abajo**, partido en dos (`BotonPunto` de `EditorPredica`): a la izquierda crea el punto; la flecha (`data-numeracion`, «Numeración de los puntos: …») abre hacia arriba **combinaciones ya hechas para los tres niveles** (`COMBINACIONES`, como la biblioteca de listas multinivel de Word; pedido del usuario: «mejor las combinaciones ya hechas, al final solo son tres puntos»; antes hubo, el mismo día, una fila por nivel con las 7 opciones): I. A. 1. (clásico), I. a) 1. (la de fábrica), I. 1) a., 1. a) i., A. 1) a., 1) a) i., cada una con su vista previa (`data-combinacion`, `menuitemradio`). Elegir una guarda `numeracion` (puntos) y `numeracionNiveles` (`[subpuntos, sub-subpuntos]`, `datosDeCombinacion`); `combinacionDe` marca la actual. `numeracionNiveles` con `null` es «automático» (`estilosDeNiveles` / `estiloDeNivel`), así que las prédicas de antes no cambian. Se cierra al elegir, con Escape o tocando fuera. Duplicar la copia. En el celular aún no se elige (se usa la de la prédica). **Niveles de puntos: hasta 3** (12 de noviembre de 2026, pedidos del usuario; primero fue uno solo de subpuntos): `nivel` 0 punto, 1 subpunto, 2 sub-subpunto (`nivelDe`, `NIVEL_MAXIMO` = 2; solo se guarda si es 1 o 2, porque Firestore no acepta `undefined`; `esSubpunto` = nivel > 0). Cada nivel se numera dentro del de arriba y vuelve a empezar (`numerosDePuntos`, `estiloDeNivel`): I. → a) → 1.; con puntos en letras, A. → 1) → a. (la lista multinivel de Word). Más de 3 se descartó: en el proyector cada nivel le quita ancho al texto. Sangría en el bosquejo `SANGRIA_NIVEL` (`ml-10` / `ml-20`; celular `ml-6` / `ml-12`, `data-nivel`). **Regla del esquema** (pedido del usuario): un punto puede ir, como mucho, un nivel más adentro que el punto de arriba (los demás ítems no cuentan) y el primero siempre es punto (`nivelPermitido`); si se borra o mueve el de arriba, el de abajo no se cambia solo. `cambiarNivel(piezas, id, nivel)` lo pone en un nivel exacto, recortado entre 0 y `nivelPermitido` (así valen igual botones y Tab): los botones del punto elegido muestran **el número que tendrá** (`data-cambiar-nivel="sacar"` / `"meter"`; `NOMBRE_NIVEL`: «Hacer subpunto», «Hacer sub-subpunto», «Volver a punto», «Volver a subpunto»; elegido por el usuario porque la flecha → / ← resultaba confusa), y mientras se escribe, Tab mete un nivel y Shift+Tab saca uno. En el púlpito sale con su número («1. …») y el resumen lleva `SANGRIA_RESUMEN` una vez por nivel; `ResumenPuntos` tiene cuatro columnas (`lista-resumen`: número de cada nivel y el texto).
- **Numeración de los ítems** (12 de noviembre de 2026, pedido del usuario): la cajita `NumeroPieza` (`data-numero`, solo dígitos) va **dentro de cada ítem, al final, después de sus botones, y siempre a la vista** aunque el ítem no esté elegido (el usuario la pidió primero fuera, a la izquierda, y luego la movió). Escribir otro número y pulsar Enter o salir de la cajita lo mueve ahí y los demás se corren (`moverA`); lo que no sirve (vacío, 0, mayor que el total) vuelve al número que tenía (`posicionEscrita` → `null`), y Escape también. El ítem movido queda elegido y se trae a la vista. Los puntos conservan sus números romanos dentro del recuadro: el número de afuera es la posición; el romano, el punto del sermón.

### TEMPORAL DHH: Biblia Dios Habla Hoy para el domingo 15 de noviembre de 2026

Pedido especial del usuario (10 de noviembre de 2026): poder proyectar la **Dios Habla Hoy Estándar (DHHS94)** ese domingo y **borrarla después**, dejando solo la RVR1960. **Las dos tienen derechos reservados** de las Sociedades Bíblicas y vienen de `github.com/mrk214/bible-data-es-spa` (textos de YouVersion; la «MIT license» del repo no cubre el texto). El permiso se pide por correo (pendiente). Mientras tanto, el aviso de derechos **se muestra**, nunca se oculta. Todo el código lleva el comentario **«TEMPORAL DHH»**.

- **No se sube a Firestore**: `Biblia/bibliaDHH.js` baja el archivo único del repositorio (`URL_DHH`, ~8 MB, 1,9 MB comprimido) la primera vez, lo deja en memoria (una sola descarga; si falla, se reintenta) y `capituloDeArchivo` devuelve la misma forma que un documento de `biblia`. Versículos agrupados («14-15»): el texto queda en los dos números y el capítulo muestra «14-15»; `ControlVersiculo` registra el elemento en cada número para el desplazamiento. Títulos `heading1`, `heading2`, `section1` → `<h2>`; las etiquetas de los salmos (`label`) se omiten, como en la RVR1960 cargada.
- **CSP**: `connect-src` de `firebase.json` permite `https://mrk214.github.io`. Sin publicar el hosting, en producción la descarga se bloquea (en `npm run dev` no hay CSP).
- **Catálogo**: `LibrosBiblia/LibrosBibliaDHH.js`, generado desde el archivo (75 libros: 48 del AT con los deuterocanónicos, 27 del NT; evangelios como «S. Juan» para el buscador). Cinco capítulos cuentan distinto que la RVR1960 (Números 25, 2 Crónicas 12, Hechos 19, 2 Corintios 13, Apocalipsis 12) y la DHH omite algunos versículos (Juan 5:4, Hechos 8:37…), que avisan «Versículo no encontrado». `Biblia/versionesBiblia.js`: `VERSIONES` (con el aviso de cada una), `librosDe(version)`, `libroEnVersion(sigla, version)`.
- **Elección para toda la iglesia**: `SelectorBiblia` (botón «RVR1960 / DHH» y aviso de derechos) guarda en `iglesias/{g}/configuracion/biblia` = `{ version }` (`guardarVersionBiblia`, regla general: cualquiera de la iglesia); `InicializarEstados` lo pone en `versionBiblia` del contexto.
- **En la sección Biblia y, desde el 11 de noviembre de 2026, en Prédica** (pedido del usuario; antes era solo Biblia): `ControlVersiculo` pasa `versionBiblia` a `obtenerVersiculo` (sexto parámetro, `"RVR1960"` por defecto) y el catálogo a `ModalLibros` / `BuscadorLibros` (prop `libros`). Al cambiar de versión vuelve a leer el capítulo abierto; si el libro no existe en la nueva, vuelve al inicio. Prédica: ver *Prédica*. **El Orden del culto no se tocó**: sigue siempre con la RVR1960. `parsearCita(texto, libros)` acepta el catálogo (sin él, la RVR1960) y, si un nombre es el comienzo de otro, el abreviado va al más corto («est» → Ester y no «Ester (dc)»).
- **Para quitarla**: borrar `Biblia/` (entera), `LibrosBibliaDHH.js`, `obtenerVersiculo.test.js` y lo marcado «TEMPORAL DHH» en `FuncionesControlPredica`, `ControlVersiculo`, `AppProvider`, `InicializarEstados`, `RutasIglesia`, `ControlPredica` (y su prueba), `CampoPieza`, `EditorPredica` (el catálogo de `CampoBase`; sin él, `citaBase` usa la RVR1960), `BuscadorVersiculos`, `PulpitoPredica`, `utilesPredica` (y su prueba) y `utilesOrden` (y su prueba; el parámetro `libros` de `parsearCita` puede quedarse); devolver `ModalLibros` / `BuscadorLibros` a importar el catálogo directo (o dejar la prop); quitar `https://mrk214.github.io` de la CSP y publicar el hosting; borrar los documentos `iglesias/*/configuracion/biblia`. **No borrar `LibrosBiblia/avisosBiblia.js`** (el aviso de la RVR1960 se queda): solo su entrada `DHHS94`, su prueba de `VERSIONES` en `avisosBiblia.test.js`, y en `ControlVersiculo` el `version: versionBiblia` pasa a `"RVR1960"`.
- **Aviso de la Biblia en el templo** (11 de noviembre de 2026, pedido del usuario; permanente, no es TEMPORAL DHH): `displayVersiculo` lleva `version` (`ControlVersiculo`: la elegida; Prédica: `contenido.version`, guardada al agregar el versículo, o `"RVR1960"` en los de antes; Orden del culto: siempre `"RVR1960"`). `ControlDisplay` la guarda en `versionVersiculo` (sin ella, RVR1960) y, solo con `display === "versiculo"` visible, pinta abajo `avisoBiblia(version)` (`LibrosBiblia/avisosBiblia.js`: «nombre · aviso de derechos») en `text-xs` y `text-app-texto/50`, encima del espacio del ticker. `VERSIONES` toma nombre y aviso de ese archivo. Las reglas de RTDB no validan campos, así que no hubo que publicarlas.

### Datos de la iglesia: nombre, sigla y logo (9 de noviembre de 2026)

Firestore `iglesias/{groupId}/perfil/datos` = `{ nombre, sigla, logo, actualizado }` (`PERFIL`, `PERFIL_DATOS`). **Solo pastor y pastora** lo escriben: en `firestore.rules`, `perfil` se sumó a `cronograma` en la condición `!(coleccion in [...]) || soyPastor()`. `InicializarEstados` lo pone en `iglesia` del contexto; `datosDeIglesia(iglesia, userData)` cae a `userData.churchName` para las iglesias registradas antes.

- Se ponen en **Usuarios** (`DatosIglesia`, solo pastores). `guardarDatosIglesia` comprime el logo (`LADO_PERFIL`) y lo sube a `imagenes/{groupId}/logo-iglesia`, carpeta que `eliminarMiCuenta` ya borra. Del 9 al 11 de noviembre de 2026 también se pedían en el registro; el usuario pidió quitarlos de ahí.
- **Formulario de registro** (11 de noviembre de 2026, pedido del usuario: «revierte todo»). Tras varios intentos (compactarlo para que no se desplazara, el campo de logo y sigla, quitar «opcional» y el ejemplo «CDP», los requisitos de la contraseña en una línea corta en el computador), `ViewRegister` volvió a la **versión publicada el 26 de octubre de 2026** (commit `36a28ea`) con solo tres diferencias: la marca de agua `MarcaAguaHaz` (raíz con `isolate`), **la foto opcional** (sin foto, `photo: ""` y se ven las iniciales) y el título bien escrito («Registrar», antes «Regístrar»). **El género sigue siendo obligatorio** (el usuario lo pidió expresamente). Sin campo de logo ni sigla, y sin logo de VOXDEI arriba. `RequisitosClave`, `REQUISITOS_CLAVE` (sin `corto`) y `CampoLogoIglesia` volvieron también a como estaban, en todas las vistas. Lo vigila `ViewRegister.test.jsx`.
- `normalizarSigla`: solo letras (con Ñ y tildes) y números, en mayúsculas, hasta `LARGO_SIGLA` (8).
- Hoy se usan en el encabezado de la entrada. `churchName` sigue en la ficha de cada usuario (lo copia `crearUsuarioAdmin`): cambiar el nombre en `perfil` no lo actualiza.

### Orden del culto (9 de noviembre de 2026)

Ruta `/ViewCulto` (`ROLES_PROYECCION`) → `Components/OrdenCulto/OrdenCulto.jsx`. Es la primera sección de «Proyectar» y el botón central de la barra inferior. Dos pestañas:

- **Preparar**: se arma la lista de pasos y se reordena (subir, bajar, quitar, vaciar con `confirmAction`). Tipos: mensaje, título, anuncio (ticker), versículo (se escribe «Juan 3:16» y `parsearCita` lo convierte; el texto sale de `obtenerVersiculo`) y canción (solo de **Canciones de hoy**, el repertorio). Las canciones guardan **copia** de sus láminas: en pleno culto no se lee el catálogo y editar la canción después no cambia el orden ya armado.
- **Culto**: «Empezar / Siguiente / Fin del culto», lámina por lámina en las canciones; tocar un paso salta a él; «Paso anterior». Cada envío lleva `exigirTurno`. La posición va en `sessionStorage` (solo ese dispositivo, sobrevive a recargar).

Datos: Firestore `iglesias/{groupId}/ordenCulto/actual` = `{ pasos[], actualizado }` (`ORDEN_CULTO`, `ORDEN_ACTUAL` en `RutasIglesia`), escuchado con `onSnapshot`: el pastor prepara en el computador y el operador pasa desde el celular. No necesitó reglas nuevas (lo cubre la regla general de `iglesias/{groupId}`) y se borra con la iglesia (`recursiveDelete`).

La lógica pura está en `utilesOrden.js`: `parsearCita` (acepta tildes o no, «S. Juan»/«San Juan»/«Juan», libros con número y el comienzo del nombre si no hay dos que empiecen igual; valida capítulo y versículo contra `LibrosBiblia`), `avanzar` / `retroceder` / `esElUltimo`, `descripcionPaso` y **`escriturasDePaso`**, que devuelve lo que se escribe en RTDB con **las mismas formas que ya usan las secciones** (`ControlDisplay` no cambió). Además enciende lo necesario para que se vea (texto, título o ticker) y **apaga la pantalla de espera**. El título enciende `visibleTitulo` a diferencia de Prédica: sin eso el paso no mostraría nada. Un versículo no lleva `titulo`, porque RTDB rechaza `undefined`. `NodosProyeccion.test.js` también revisa los nodos que devuelve `escriturasDePaso`.

Lo que **no** hace aún: imágenes y videos como pasos, y la franja «En el templo» del prototipo (saber qué hay en pantalla exige que cada nodo lleve hora para decidir cuál fue el último). Cada sección **no** recuerda su estado interno (Biblia vuelve a empezar); lo que sí se recuerda es la dirección, con el botón de volver.

### App instalable y archivos de la tienda (9 de noviembre de 2026, ideas 9–11)

- `public/manifest.webmanifest`: nombre, `start_url: /ViewSelector`, `display: standalone`, `background_color: #0D0B26` (con el ícono, Android arma la pantalla de arranque: idea 10) y `theme_color: #323437`. Enlazado en `index.html` junto a `apple-touch-icon.png`. La CSP lo permite por `default-src 'self'`.
- Íconos en `public/` (necesitan dirección fija): `icono-192/512.png` (el símbolo con esquinas, `purpose: any`) e `icono-maskable-192/512.png` (`purpose: maskable`). La fuente del maskable es `src/assets/voxdei-icono-android.svg`: fondo cuadrado sin esquinas y el dibujo al 78 %, dentro de la zona segura del 80 %.
- Para Play Console, en `docs/`: `grafico-destacado-play-store.jpg` (1024 × 500) e `icono-play-store-512.png`.
- Los PNG se generaron con **Chrome sin ventana** (`chrome.exe --headless=new --screenshot --window-size=… --default-background-color=00000000` sobre una página HTML con el SVG) y los JPEG con `System.Drawing` de PowerShell; no hace falta instalar nada. Si cambia el logo, hay que regenerarlos.
- `src/Metadatos.test.js` comprueba enlaces, rutas, medidas de cada ícono y de los archivos de la tienda.
- **Aún no es una app de Play Store**: falta el service worker, `assetlinks.json` y empaquetarla con Bubblewrap (punto 1 de la lista).

### Pantalla de espera y marca de agua (9 de noviembre de 2026, ideas 6 y 7)

**Pantalla de espera.** Nodo RTDB `displayEspera/{groupId}` = `{ activa }`; `InicializarEstados` lo vuelca en `visibleEspera` (sin nodo, apagada). Se enciende y apaga **solo desde `ViewCronograma`** (tarjeta «Pantalla de espera»), con `exigirTurno` porque escribe en la pantalla. En `ControlDisplay`, mientras está activa **manda sobre todo el centro** (video, imagen, texto) y oculta el título; el ticker sigue. El reproductor de YouTube no se desmonta: si había un video sonando, sigue sonando oculto, así que conviene apagarlo antes.

`PantallaEspera` (logo vertical, `userData.churchName` y cuenta regresiva) recalcula cada segundo con la hora del servidor (`desfaseReloj`) y decide qué decir con `contenidoEspera` (`PantallaEspera/utilesEspera.js`): `enCurso` si un servicio ya empezó (si se cruzan, el que empezó más tarde), `cuenta` si faltan hasta `HORAS_CUENTA_REGRESIVA` (6), `fecha` («Próximo servicio: …, Lunes · 10:00») si falta más, o `nada`. El próximo servicio sale de `proximoServicio(servicios, ahoraMs)` y el texto de `textoCuentaRegresiva(ms)`, ambos en `UtilesCronograma.js`. Colores y tamaños, los de *Estilos y colores* (texto, título, cita).

**Marca de agua.** No es un nodo de RTDB: es el grupo `marcaAgua` de los estilos (`{ visible, esquina, tamano, opacidad }`), guardado con el resto en Firestore, apagado de fábrica. Se configura en la sección «Marca de agua» de `ControlEstilos`, que también la dibuja en la vista previa. La posición la calcula `estiloMarcaAgua(estilos, alturaTicker)` en `EstilosProyeccion.js`, la misma función para la vista previa y para el templo: respeta el margen de seguridad (mínimo 2 %), y abajo con el ticker encendido sube por encima de él. No se muestra en la pantalla de espera. Las esquinas se eligen con triángulos (◤◥◣◢): las flechas ↖↘ salen como emoji en Windows.

### Proyección de imágenes y canciones

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

### Cronograma y turnos (23 de octubre de 2026)

Decide quién puede escribir en la pantalla en cada momento. Reglas acordadas con el usuario: pastor y pastora **siempre**; con un servicio en curso, su operador (si se cruzan dos, el que **empezó más tarde**); sin servicio, quien tenga el **ensayo**; sin servicio ni ensayo, solo pastores.

| Pieza | Dónde |
| --- | --- |
| Servicios | Firestore `iglesias/{groupId}/cronograma/{id}`: `{ nombre, inicio, fin, dias[], fecha, operadorUid, operadorNombre, activo }`. `dias` usa `Date.getDay()` (0 = domingo); vacío = una sola vez en `fecha` (`AAAA-MM-DD`). Sin cruces de medianoche: `fin > inicio`. |
| Ensayo | RTDB `turnoEnsayo/{groupId}`: `{ uid, nombre, inicio (serverTimestamp), iniciadoPor }`. Termina con «Terminar», al empezar cualquier servicio (`empezoAlgunServicio`: no «revive» cuando ese servicio acaba) o a las `HORAS_ENSAYO` (3). Está en `database.rules.json` y en `NODOS_PROYECCION`. |
| Lógica | `Components/Cronograma/UtilesCronograma.js`, funciones puras (`turnoActual`, `puedeProyectar`…). Se probaron 18 casos con Node desde una carpeta temporal; falta pasarlos a Vitest. |
| Hora | La del **servidor**: `InicializarEstados` escucha `.info/serverTimeOffset` (`desfaseReloj` en `AppContext`) y `useTurno` suma ese desfase a `Date.now()`, recalculando cada 30 s. Así un celular con el reloj adelantado no cambia de turno antes que los demás. Día y hora se leen en la zona horaria del dispositivo. |
| Hook | `Components/Hooks/useTurno.js` → `{ turno, puedoProyectar, exigirTurno }`. |
| Pantallas | `/ViewCronograma` (todos; ahí se puede dar el ensayo a otro operador) y `/ViewServicioEditar[/:id]` (ruta con `ROLES_PASTORES`). `useOperadores` (`Cronograma/useEquipo.js`) lee una vez los operadores de la iglesia. |
| Franja | `Cronograma/FranjaTurno.jsx`, dentro del encabezado `sticky` de cada panel (así `ModalVisibilidad` sigue abriendo debajo). Verde si puedes, roja si no; botones Iniciar / Tomar (con confirmación) / Terminar ensayo. Desde el 11 de noviembre de 2026 es **un solo renglón** (`h-8`) con el estilo de siempre (todo el fondo verde o rojo: se probó un fondo oscuro con solo una línea de color y el usuario pidió volver al verde) y, a la derecha, `EstadoPantalla` (la pantalla del templo; su prop `estado` la fija en los ejemplos), **sin chip** dentro de la franja desde el 12 de noviembre de 2026 (prop `sinChip`: solo el ícono y la palabra, pedido del usuario; en Inicio sigue con su borde de píldora). Texto: **solo el turno** («Turno de Laura · 14:00 – 16:00», «Tu turno», «Sin servicio»), en verde y en rojo; nada de «puedes proyectar» a la vista (pedido del usuario: el color ya lo dice). Qué puedes hacer («Puedes proyectar como pastor.», «No puedes proyectar ahora.») va en `title` y en un `sr-only` para el lector (`explicacion`). Los textos y botones los decide `estadoFranja` (`utilesFranja.js`, función pura) y el dibujo `VistaFranja.jsx`; `FranjaTurno` solo conecta los botones. **La Ayuda usa los mismos dos** para sus ejemplos («¿Quién puede proyectar?»), así que se actualiza sola. Lo vigilan `utilesFranja.test.js`, `FranjaTurno.test.jsx` y `Ayuda.test.jsx`. |

**El bloqueo es de la app, no de las reglas**: RTDB no puede leer el cronograma ni entender «domingo a las 8». Cada función que escribe en la pantalla empieza con `if (!exigirTurno()) return;` en los 7 paneles: `ControlTicker`, `Controlmessage`, `ControlVersiculo`, `ControlPredica`, `ControlCancionProyectar`, `ControlImagenes` y `ControlVideo`. **Cualquier envío nuevo a la pantalla debe llevar esa guardia.** Lo que es preparar (escribir, guardar favoritos, subir imágenes, armar el repertorio) no se bloquea, y **`ControlEstilos` queda libre** por decisión del usuario. Los botones no se atenúan: el aviso sale al pulsarlos.

En `ControlCancionProyectar`, el efecto que prepara la pantalla al abrir una canción solo corre con `puedoProyectar` (está en sus dependencias): si el turno llega con la canción abierta, se prepara entonces.

**`firestore.rules`**: el `cronograma` no puede llevar un `match` propio más estricto, porque en Firestore basta con que una regla permita y la general de `iglesias/{groupId}/**` ya dejaba escribir a todos. Por eso la regla general pasó a `iglesias/{groupId}/{coleccion}/{documento=**}` con `coleccion != 'cronograma' || soyPastor()`.

### Cabeceras de seguridad (`firebase.json`)

Añadidas el 15 de octubre de 2026: `Content-Security-Policy`, `X-Frame-Options: DENY`, `X-Content-Type-Options`, `Referrer-Policy` y `Permissions-Policy` (cámara, micrófono, ubicación, pagos y USB apagados). Solo existen en el hosting publicado: **ni `npm run dev`, ni `firebase serve`, ni el emulador de hosting las aplican** (comprobado con firebase-tools 15.19). Para probarlas en local, tras `npm run build`, se sirvió `dist/` con un servidor Node de pocas líneas que lee `hosting.headers` de `firebase.json` y aplica el rewrite SPA, y se escuchó el evento `securitypolicyviolation` en el navegador.

La CSP es una lista blanca. **Todo dominio nuevo que cargue la app debe sumarse ahí** o el navegador lo bloqueará en producción sin fallar en desarrollo:

- `script-src`: `www.youtube.com` (API del reproductor) y `*.firebaseio.com` (RTDB usa JSONP de respaldo si no hay WebSocket).
- `img-src`: Storage, `ui-avatars.com`, `i.ytimg.com` (miniaturas), `blob:` (vista previa local de imágenes).
- `connect-src`: `*.googleapis.com` (Auth, Firestore, Storage), RTDB (`https`/`wss`) y funciones (`*.cloudfunctions.net`, `*.run.app`).
- `frame-src`: YouTube y el `authDomain`.
- `style-src 'unsafe-inline'`: hace falta por las librerías que inyectan estilos.
- **App Check** (pendiente) necesitará `https://www.google.com` y `https://www.gstatic.com` en `script-src` y `frame-src` para reCAPTCHA.

`frame-ancestors 'none'` impide incrustar la app en otra web. El proyector se abre con `window.open`, no en un iframe, así que no le afecta.

### Estilos

Tailwind v4 mediante `@tailwindcss/vite`; **no hay `tailwind.config.js`**. El tema vive en `src/index.css` con `@theme` y tokens `--color-app-*` (`app-dark`, `app-light`, `app-main`, `app-accent`, `app-muted`, `app-border`, `app-success`, `app-error`). Usa siempre esas clases (`text-app-muted`, `bg-app-light`) en vez de colores crudos de Tailwind. También hay utilidades propias: `scrollbar-custom`, `boton-salida`, `form-dark` / `form-dark2` (arreglos de autofill; `form-light` se borró el 9 de noviembre de 2026 por no usarse), `animate-menu-open`.

**Logo** (9 de noviembre de 2026). Los SVG viven en **`src/assets/`**, junto al resto de imágenes (el usuario no quiere carpetas aparte como `public/logo`). El símbolo de la app es **`voxdei-simbolo.svg`**, el morado de cinco rayos, extraído del logo horizontal; `index.html` lo usa como ícono con `href="/src/assets/voxdei-simbolo.svg"` y Vite lo procesa en el build. Hubo un ícono azul de un solo haz (`voxdei-1-proyector.svg`) que no coincidía con los logos: el usuario lo descartó y se borró. Dentro de la app (fondo gris) van las versiones `fondo-oscuro`; las `fondo-claro` son para el README, la tienda y lo impreso. Las ideas aprobadas para usarlos y la navegación nueva (barra lateral en PC, barra inferior y Orden del culto en el celular) están en la memoria del proyecto, con sus prototipos.

`useScreenType()` clasifica la pantalla en `proyector` | `desktop` | `movil`; `ControlDisplay` usa esa clave para elegir tamaños tipográficos y velocidad del ticker. En los paneles, `isDesktop` (de `AppContext`) decide entre botones de visibilidad en línea o el `ModalVisibilidad`.

**`ModalVisibilidad` se ancla al botón con `fixed`** (22 de agosto de 2026). Antes su menú era `absolute` y el componente **no envolvía botón y menú en un contenedor `relative` propio**, así que se anclaba al ancestro posicionado de cada vista —el encabezado `sticky`— y en `ControlCanciones`, `ControlTicker` y `Controlmessage` salía fuera de la pantalla; solo en `ControlVersiculo` caía donde debía. **El menú va sin fondo y sin borde a propósito**: solo `rounded-xl` y una sombra corta, `shadow-[0_2px_6px_rgba(0,0,0,0.45)]`. Lo que lo separa del contenido de atrás es **únicamente esa sombra**, así que no la quites: se probó sin ella y el recuadro deja de distinguirse. Tampoco vuelvas a `shadow-xl`: con 25 px de desenfoque y sin fondo detrás, se ve como un halo grande alrededor del menú. Al corregir la posición se le añadieron fondo y borde y el usuario pidió retirarlos; no los repongas creyendo que faltan. Ahora calcula su sitio con `getBoundingClientRect()`. **Tres reglas fijas, pedidas expresamente por el usuario; no las cambies por lo que parezca más bonito:**

1. **A 2 px del borde derecho de la pantalla** (`BORDE_DERECHO`), anclado con `right`. Nada de centrarlo bajo el botón. **El menú no lleva ancho**: mide lo que midan sus iconos, que son los mismos en las cuatro vistas. Hubo un intento de anclarlo con `left` restando un ancho estimado de 60 px, y ese número —que no coincidía con el contenido más el relleno— comprimía los iconos. No vuelvas a fijar un ancho.

   Ojo con el botón del ojo, que es otra cosa: declara `w-full h-full`, así que su tamaño lo decide la barra de cada vista y **sí** varía entre pantallas. Está así a propósito, para alinearse con los botones de texto vecinos.
2. **Siempre por debajo de la línea divisoria dorada**, el `border-b border-app-main` (`#f2be55`; amarilla `#facc15` hasta el 9 de noviembre de 2026) del encabezado que llevan las cuatro vistas. El `top` es `Math.max(botón.bottom, encabezado.bottom) + MARGEN`: manda el que quede más abajo, porque el botón puede estar en una fila superior del encabezado.
3. **Nunca se abre hacia arriba**, que taparía ese encabezado. Si lo que queda de pantalla no alcanza, el menú se desplaza por dentro (`maxHeight` + `overflow-y-auto`).

El encabezado se localiza subiendo desde el botón hasta el primer ancestro con `position: sticky` (`finDelEncabezado`); si una vista nueva no lo tuviera, la función devuelve `0` y manda el botón. Se recoloca en `scroll` (con captura, porque el contenedor que se desplaza no es `window`) y en `resize`, y cierra con Escape. Es el mismo remedio que ya se aplicó a los selectores de color de `ControlEstilos`: cuando un panel flotante depende del contenedor de cada vista, tarde o temprano queda recortado o fuera de pantalla.

## Convenciones

- Código, comentarios y nombres de componentes en español. Mantener ese estilo.
- Las vistas viven en `src/Views/<Nombre>/<Nombre>.jsx` y deben reexportarse en `src/Views/index.js` para poder usarse en `App.jsx`.
- Las rutas se escriben tal cual (`/ViewInicio`, `/ViewSelector`, `/VOXDEI`). React Router **no distingue mayúsculas** (por eso `/viewTicker` en `App.jsx` funciona con `navigate("/ViewTicker")`), pero escríbelas igual que en `App.jsx`. El `navigate("/Viewgestion")` mal escrito de `ViewUsers` se corrigió el 9 de noviembre de 2026.
- `ViewSelector` es la pantalla de entrada (Proyectar / Administrar). `/ViewGestion`, la antigua cuadrícula de opciones, **se eliminó el 9 de noviembre de 2026**: la reemplazó `/ViewInicio`, el resumen del día.
- **Código heredado**: el usuario pidió (9 de noviembre de 2026) borrar el código viejo al reemplazarlo, no dejarlo comentado ni sin usar. Ese día se borraron la versión antigua de `ViewUsers` (428 líneas comentadas), la opción «Próximamente» de los botones de Gestión y las once copias del botón «Salida».
- **Estilos solo desde el tema**: colores, medidas, sombras y animaciones se definen como variables en el `@theme` de `src/index.css` y los componentes los usan por su nombre (`bg-app-velo`, `w-barra`, `animate-enciende`). Nada de valores sueltos (`bg-[#…]`, `text-gray-100`, `left-[calc(…)]`): si falta uno, se agrega al tema. **No se crea otro archivo de tema** (decisión del usuario). Para algo que se repite, un componente de React, no una clase con `@apply`. Lo antiguo todavía tiene colores crudos (`from-gray-900` en las pantallas de entrada, `bg-green-500`…); se limpia al tocarlo.
- **Lenguaje**: JavaScript. El 9 de noviembre de 2026 se habló de TypeScript y se decidió seguir en JS por ahora; si se migra, que sea gradual y empezando por la lógica pura.
- Regla de ESLint activa: `no-unused-vars` con `varsIgnorePattern: '^[A-Z_]'`. De `eslint-plugin-react` solo está activada `react/jsx-uses-vars` (para que `no-unused-vars` no dé por muertas las variables usadas en el JSX, como `motion`); el preset completo del plugin está deliberadamente apagado.
- `vite.config.js` fuerza un chunk manual llamado `firebase` para todo el SDK; el hosting sirve `dist/` con rewrite SPA a `index.html`.

---

## NOTA: archivos tocados el 14 de agosto de 2026 (pendientes de revisar)

Lista para repasar con calma lo que se hizo en esa jornada. Todo está desplegado
y funcionando, pero no había sido revisado con detenimiento por el autor.

### Archivos nuevos

| Archivo | Qué es |
| --- | --- |
| `src/Components/Roles/Roles.js` | Fuente única de roles y permisos |
| `src/Components/Firebase/RutasIglesia.js` | Rutas de Firestore por `groupId` |
| `src/Components/Estilos/EstilosProyeccion.js` | Estilos de proyección compartidos entre el panel y la pantalla |
| `src/Components/ControlCanciones/ControlCanciones.jsx` | Módulo de canciones (catálogo común + repertorio del día) |
| `src/Components/ControlEstilos/ControlEstilos.jsx` | Panel de estilos con vista previa |
| `src/Views/ViewCanciones/ViewCanciones.jsx` | Vista de canciones |
| `firestore.rules`, `database.rules.json`, `storage.rules` | Reglas de seguridad de las tres capas |
| `CLAUDE.md` | Este archivo |

### Archivos editados, por tema

**Roles y acceso** — `App.jsx`, `ProtectedRoutes.jsx`, `ViewUsers.jsx`

**Aislamiento por iglesia** — `InicializarEstados.jsx`, `FuncionesControlPredica.jsx`, `ControlPredica.jsx`, `ControlTicker.jsx`, `Controlmessage.jsx`

**Imágenes y estilos en la proyección** — `ControlDisplay.jsx`, `ControlImagenes.jsx`, `TickerAnimacion.jsx`, `AppContext.jsx`, `ViewStylos.jsx`, `index.css`

**Arreglos de bugs** — `UserProfileCard.jsx`, `ModalLibros.jsx`, `ModalCapitulo.jsx`, `ModalVersiculo.jsx`, `ModalVisibilidad.jsx`, `WhatsAppButton.jsx`, `VistaNoAutorizada.jsx`, `ViewGestion.jsx`, `ControlVersiculo.jsx`, `CargarBiblia.jsx`, `ViewResetPassword.jsx`

**Configuración** — `firebase.json`, `eslint.config.js`, `package-lock.json`, `Firebase.js`, `Views/index.js`

### Puntos que conviene mirar primero

1. `ControlPredica.jsx`, `ControlImagenes.jsx` y `ViewRegister.jsx` **no se revisaron línea por línea**; el resto sí.
2. `ControlDisplay.jsx` cambió de clases de Tailwind a estilos calculados: es donde más se nota si algo se ve raro en el proyector.
3. El título de la proyección sigue usando el tamaño base del texto (`style.text`), no `style.title`, que quedó definido sin usar.

### Prueba en producción del 14 de agosto de 2026 (incompleta)

Se recorrió la app desplegada con el navegador. **Verificado y correcto:**

- Registro de iglesia: el rol `Pastor` se asigna bien y la sesión queda activa.
- `ViewGestion` carga las 9 secciones, con *Canciones* nueva y *Gestión Video*
  atenuado como «Próximamente» (ya no navega a la ruta inexistente).
- `/VOXDEI` carga y aplica el fondo de los estilos por defecto.
- `ViewVersiculo` carga con sus cuatro interruptores de visibilidad.
- El modal de libros abre y lista correctamente — señal indirecta de que el
  arreglo del orden de hooks en `ModalLibros` funciona.
- El modal de capítulos abre y lista los capítulos del libro elegido.

**Quedó sin verificar** (no por fallo de la app, sino por límites de la
automatización): el paso de capítulo a versículo, la proyección real de un
versículo, ticker, mensajes, imágenes, canciones y el guardado de estilos.

**Por qué se detuvo:** las capturas de pantalla se agotan por tiempo mientras
hay un modal abierto. Los modales combinan `backdrop-blur-sm` con
`bg-app-dark/90` y ese compositing hace muy costosa la captura; la página sigue
respondiendo con normalidad a `find` y `get_page_text`.

**Arreglado el 15 de agosto de 2026:** `ModalCapitulo` y `ModalVersiculo` ya
llevan `role="dialog"`, `aria-modal="true"` y `aria-labelledby`, igual que
`ModalLibros`.

**Los selectores de color de `ControlEstilos`** eran un panel `absolute` dentro
del acordeón, que tiene `overflow-hidden`: los colores del final de cada sección
salían recortados y algunos no se veían. Ahora son una ventana `fixed` centrada,
con su propio `role="dialog"` y cierre con Escape. El campo de texto guarda lo
que se teclea en un estado aparte y solo aplica el color cuando el código
hexadecimal está completo, para poder escribir sin que la paleta salte.

---

## Estado al 15 de agosto de 2026

Todo lo de esta jornada está **desplegado**: funciones, hosting y las reglas de
Firestore, Storage y Realtime Database. El módulo de video quedó activo.

### Pendiente de probar en producción

Nada de esto falló; simplemente no se ha recorrido con la app publicada:

- **El video**, que es lo único con incógnita real: viaja de YouTube al
  computador de proyección sin pasar por Firebase, así que depende del internet
  del templo. El sonido exige que alguien pulse pantalla completa.
- Los **selectores de color** rehechos como ventana centrada.
- El paso de capítulo a versículo, la proyección real de un versículo, ticker,
  mensajes, imágenes, canciones y el guardado de estilos.
- La **foto de perfil propia** (`MiFoto`), que escribe en Storage y toca el campo
  `photo` de Firestore: es el único punto donde el cliente escribe en `users`, y
  las reglas nuevas solo permiten ese campo.

### Decisiones pendientes

- Transferir una iglesia a otra persona: requiere antes desacoplar el `groupId` del uid del pastor. (El borrado ya existe: `eliminarMiCuenta`.)

### Menores

- ~~Las 9 alertas de `uuid` en `functions`~~: cerradas el 15 de octubre de 2026
  con `npm audit fix` (sin `--force`); `functions` quedó en 0 vulnerabilidades,
  con `firebase-admin` 14.5.0 instalado (dentro del `^14.2.0` declarado y del
  `^14.0.0` que acepta `firebase-functions` 7.3.2). **Falta desplegar las
  funciones** para que llegue a producción.
- En la raíz quedan 4 avisos altos de `@grpc/grpc-js` dentro de `firebase`.
  **No aplicar `npm audit fix --force`**: propone bajar a `firebase@9.14.0`.
  No afectan a la app: `grpc-js` es el transporte de Node y no entra en el
  bundle (comprobado en `dist/`). Se cerrarán cuando Firebase lo actualice.
- `ModalLibros` es el único de los tres modales cuyo botón de cerrar sigue sin
  `aria-label`.
- Quedan 8 avisos (no errores) de `react-hooks/exhaustive-deps`, casi todos por
  `showNotif` fuera del array de dependencias (los seis de `ControlDisplay` se
  cerraron el 15 de octubre de 2026). Antes de
  «arreglarlos» hay que mirar caso por caso: añadir `showNotif` a las
  dependencias puede resuscribir en bucle.

---

## Auditoría del 15 de octubre de 2026 (camino a Play Store)

Hecho: dependencias (`npm audit fix`) y estabilidad del arranque, registro y
proyección (ver *Contextos y arranque* y *Flujo de proyección*). Pendiente, por
orden de prioridad:

1. ~~**Borrado de cuenta e iglesia**~~ — hecho el mismo día (ver *Borrado de
   la propia cuenta*). Funciones desplegadas y probado de punta a punta con
   una iglesia real (borrar, volver a registrar). Falta desplegar el hosting
   y declarar la URL `/EliminarCuenta` en Play Console.
2. **App Check** (reCAPTCHA; en un TWA la app es una web, así que no aplica
   Play Integrity) y alertas de presupuesto: hoy cualquiera con la config
   pública puede crear iglesias sin límite y llenar Storage. Acordado con el
   usuario para el 16 de octubre de 2026: primero en modo observación y,
   tras unos días con la app publicada, el bloqueo. `setGlobalOptions({
   maxInstances: 10 })` ya está en `functions/index.js` (pendiente de
   desplegar).
3. **Empaquetado Android**: no existe. Recomendado TWA (Bubblewrap) sobre el
   hosting actual: `window.open` del proyector y el iframe de YouTube suelen
   fallar dentro de un WebView de Capacitor. Falta manifiesto, service worker,
   íconos y `assetlinks.json`.
4. **Política de privacidad, ficha de "Seguridad de los datos" y moderación del
   catálogo de canciones** (contenido generado por usuarios visible entre
   iglesias: Google exige denunciar y condiciones de uso).
5. **Validación en reglas**: forma y tamaño de `canciones`, `.validate` en los
   nodos de RTDB, campos extra en `users` create; la regla de
   `iglesias/{groupId}/**` no distingue rol (un operador puede escribir
   prédicas fuera de la UI); `storage.rules` deja leer fotos de perfil a
   cualquier autenticado. (Las cabeceras de seguridad y la verificación de
   correo del dueño se hicieron el 15 de octubre de 2026.)
6. ~~**Una iglesia nueva arranca con el texto oculto.**~~ Resuelto el mismo
   día. Los flags de `AppProvider` valen `""` y los nodos `displayVisible*` no
   existen hasta que alguien pulsa un interruptor, así que `ControlDisplay` no
   pintaba mensajes, versículos ni prédicas. Ahora `InicializarEstados` trata
   el nodo ausente de `displayVisibleTexto` como encendido
   (`data?.visibleTexto ?? true`). Título y ticker siguen arrancando apagados
   a propósito: encendidos sin contenido pintarían un hueco y una franja vacía.
7. Menores: el catálogo de canciones se descarga entero (ver
   `docs/BuscadorCanciones.md`). (La reversión de `crearUsuarioAdmin`, la
   pregunta tapada de `confirmAction` y la compresión de imágenes se hicieron
   el 23 de octubre de 2026.)
