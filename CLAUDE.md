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
- **`AppContext`**: estado compartido del panel (slots de prédicas, items de ticker/mensajes, flags de visibilidad, velocidad del ticker) y el sistema de notificaciones.
- **`InicializarEstados`**: componente sin UI montado en `App`. Centraliza las suscripciones globales (slots de prédicas, `onSnapshot` de tickers y mensajes, los nodos de visibilidad y velocidad). Espera a que `userData.groupId` exista antes de suscribirse. Las suscripciones globales van aquí, no en las vistas.

### Notificaciones y confirmaciones

No se usa `alert` ni `confirm`. `AppContext` expone:

- `showNotif(type, message, duracion = 4000)` — tipos `success` | `error` | `warning` | `info`; se cierra sola a los `duracion` ms (4 s de fábrica; los avisos de la pantalla del templo usan 2 s). Cada aviso nuevo reinicia la cuenta.
- `confirmAction(message)` — devuelve una promesa que resuelve `true`/`false` según lo que pulse el usuario. Siempre con `await`. Como hay un solo recuadro, **si otro aviso u otra pregunta tapa una pregunta pendiente, esta se resuelve `false`** (`preguntaPendiente` en `AppProvider`, 23 de octubre de 2026). Antes la promesa quedaba sin resolver y la acción colgada.

**`Notificaciones` es el único componente que puede pintar avisos** (unificado el 15 de agosto de 2026). Está montado una sola vez en `App.jsx`, dentro de `AppProvider`, así que cubre todas las rutas, incluidas login, registro y recuperación de contraseña. Se muestra **centrado en la parte inferior** (`bottom-6`, ancho `max-w-md`), con el mismo tamaño para todos los tipos.

Reglas al escribir una vista:

- Ninguna vista declara estados tipo `error` / `mensaje` para pintar texto de aviso. Antes lo hacían `ViewLogin`, `ViewRegister`, `ViewResetPassword`, `ViewUsers`, `ControlVersiculo` y `ControlImagenes`, cada una con su propio tamaño y color, y varias los pintaban dentro de un formulario concreto: los fallos ocurridos en otra pestaña de la misma vista quedaban mudos.
- El texto no lleva emoji al principio (`✅`, `❌`, `🚫`…). El componente ya pone su icono según el tipo y el emoji descuadraba la altura.
- El centrado se hace con una franja fija (`inset-x-0 … flex justify-center`) y la tarjeta dentro. No uses `-translate-x-1/2` en la tarjeta: framer-motion escribe su propio `transform` y lo pisa.

Excepción deliberada: los scripts de carga masiva `Upload/CargarBiblia` y `Upload/CargarVesiculos` conservan su propio `mensaje` en pantalla. No es un aviso sino un **progreso** que se reescribe en cada capítulo ("Subiendo: Génesis capítulo 3"); como notificación dispararía cientos de avisos seguidos. Además están comentados en `ViewDisplay` y no se montan.

### Modelos de datos

**Biblia**: `biblia/{SIGLA}_{capitulo}` (p. ej. `GEN_1`) con `sigla`, `libro`, `capitulo`, `versiculos` (mapa `"1"` → texto) y `chapter_html`. Se consulta con `obtenerVersiculo(sigla, capitulo, numero, tipo, showNotif)` en `FuncionesControlPredica`. `LibrosBiblia.js` es el catálogo estático (`librosAntiguo`, `librosNuevo`) e incluye el número de versículos de cada capítulo en campos `capitulo1`, `capitulo2`, …, que alimentan los modales de selección. Los componentes de `Upload/` son scripts de carga masiva de un solo uso, normalmente comentados en `ViewDisplay`.

**Prédicas**: exactamente 5 slots, `predicas/predica1`..`predica5`, cada uno con `items[]` de `{ tipo, contenido, timestamp }` donde `tipo` es `titulo` | `mensaje` | `versiculo` (en versículos, `contenido` es `{ cita, texto }`). El array `slots` del contexto refleja qué slots están ocupados.

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

**Logo en pantallas** (ideas 1–3 del 9 de noviembre de 2026): `Components/Logo/Logo.jsx` exporta `Simbolo`, `LogoHorizontal` y `LogoVertical` (versiones de fondo oscuro). Vertical en login y recuperar contraseña; horizontal pequeño en registro (la página no se desplaza), en la entrada (`ViewSelector`, en vez del título) y en `/EliminarCuenta`. `Loading` muestra el símbolo con `motion-safe:animate-enciende` y `ProtectedRoutes` dice «Encendiendo el proyector...». `CapturaErrores` y `VistaNoAutorizada` muestran el símbolo **apagado** (`grayscale brightness-75 opacity-60`).

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
- **Presencia** (`Components/PantallaTemplo/`): `usePresenciaPantalla` (en `ControlDisplay`) escribe `pantallaTemplo/{groupId}/{idVentana}` = `{ completa, dispositivo, por, desde }` con `onDisconnect().remove()`, y lo reescribe cada vez que `.info/connected` vuelve a `true` (tras un corte, `onDisconnect` ya lo borró). `completa` es `!visible` del botón de pantalla completa. `InicializarEstados` lo resume con `estadoPantalla` en `pantallaTemplo` del contexto: `"apagada"` | `"sin-completa"` | `"encendida"` (o `null` mientras no se sabe) y, en cada cambio, lanza el aviso de `avisoDeCambio` durante `DURACION_AVISO` (2 s) en todos los equipos **salvo en la propia ventana `/VOXDEI`** y salvo al cargar. Si el corte es brusco, Firebase puede tardar hasta un minuto en borrar la presencia.
- **Proyectar solo se oculta si se sabe que la pantalla está abierta** (`encendida` o `sin-completa`). Con `null` (cargando o sin permiso de leer) se ofrece: mejor de más que dejar a alguien sin poder abrir el proyector. En el celular también se ofrece.
- `EstadoPantalla`: monitor gris «Apagada», flechas de pantalla completa en ámbar «Pantalla completa» (falta tocar pantalla completa; así lo pidió el usuario) y monitor verde «Encendida». Va en la entrada y en la tarjeta «Servicio» de Inicio. **La pantalla del templo no se abre desde el panel**: ni barra lateral, ni Inicio, ni Ayuda (decisión del usuario).

### Datos de la iglesia: nombre, sigla y logo (9 de noviembre de 2026)

Firestore `iglesias/{groupId}/perfil/datos` = `{ nombre, sigla, logo, actualizado }` (`PERFIL`, `PERFIL_DATOS`). **Solo pastor y pastora** lo escriben: en `firestore.rules`, `perfil` se sumó a `cronograma` en la condición `!(coleccion in [...]) || soyPastor()`. `InicializarEstados` lo pone en `iglesia` del contexto; `datosDeIglesia(iglesia, userData)` cae a `userData.churchName` para las iglesias registradas antes.

- Se piden en el **registro** (`ViewRegister`, opcionales) y se corrigen en **Usuarios** (`DatosIglesia`, solo pastores). `guardarDatosIglesia` comprime el logo (`LADO_PERFIL`) y lo sube a `imagenes/{groupId}/logo-iglesia`, carpeta que `eliminarMiCuenta` ya borra. En el registro va **después** de crear la ficha (la regla pide ser pastor) y, si falla, no frena el registro.
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
| Franja | `Cronograma/FranjaTurno.jsx`, dentro del encabezado `sticky` de cada panel (así `ModalVisibilidad` sigue abriendo debajo). Verde si puedes, roja si no; botones Iniciar / Tomar (con confirmación) / Terminar ensayo. |

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

Tailwind v4 mediante `@tailwindcss/vite`; **no hay `tailwind.config.js`**. El tema vive en `src/index.css` con `@theme` y tokens `--color-app-*` (`app-dark`, `app-light`, `app-main`, `app-accent`, `app-muted`, `app-border`, `app-success`, `app-error`). Usa siempre esas clases (`text-app-muted`, `bg-app-light`) en vez de colores crudos de Tailwind. También hay utilidades propias: `scrollbar-custom`, `boton-salida`, `form-dark` / `form-light` / `form-dark2` (arreglos de autofill), `animate-menu-open`.

**Logo** (9 de noviembre de 2026). Los SVG viven en **`src/assets/`**, junto al resto de imágenes (el usuario no quiere carpetas aparte como `public/logo`). El símbolo de la app es **`voxdei-simbolo.svg`**, el morado de cinco rayos, extraído del logo horizontal; `index.html` lo usa como ícono con `href="/src/assets/voxdei-simbolo.svg"` y Vite lo procesa en el build. Hubo un ícono azul de un solo haz (`voxdei-1-proyector.svg`) que no coincidía con los logos: el usuario lo descartó y se borró. Dentro de la app (fondo gris) van las versiones `fondo-oscuro`; en la barra lateral, `Simbolo` y `LogoHorizontal` con `sinFondo` (`voxdei-simbolo-sin-fondo.svg` y `voxdei-logo-horizontal-sin-fondo.svg`: los mismos SVG sin el cuadro morado, pedido del usuario); las `fondo-claro` son para el README, la tienda y lo impreso. Las ideas aprobadas para usarlos y la navegación nueva (barra lateral en PC, barra inferior y Orden del culto en el celular) están en la memoria del proyecto, con sus prototipos.

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
