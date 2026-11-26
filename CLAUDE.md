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
- **Sin código muerto:** `src/CodigoMuerto.test.js` falla si algún archivo de producción de `src/` no lo importa otro (una línea comentada no cuenta). Borra el archivo en vez de dejarlo comentado o sin usar.
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

### Modelos de datos

**Biblia**: `biblia/{SIGLA}_{capitulo}` (p. ej. `GEN_1`) con `sigla`, `libro`, `capitulo`, `versiculos` (mapa `"1"` → texto) y `chapter_html`. Se consulta con `obtenerVersiculo(sigla, capitulo, numero, tipo, showNotif)` en `FuncionesControlPredica`. `LibrosBiblia.js` es el catálogo estático (`librosAntiguo`, `librosNuevo`) e incluye el número de versículos de cada capítulo en campos `capitulo1`, `capitulo2`, …, que alimentan los modales de selección.

**Prédicas** (sin límite desde el 10 de noviembre de 2026; antes, 5 slots fijos): un documento por prédica en `iglesias/{groupId}/predicas/{id}` = `{ titulo, fecha: "AAAA-MM-DD" | "", serie, base, numeracion, estado: "borrador" | "terminada" | "predicada", piezas[], creado, actualizado }`. Cada pieza conserva la forma de los antiguos `items`: `{ id, tipo, contenido }` con `tipo` `titulo` (un «punto») | `mensaje` | `versiculo` (`contenido` = `{ cita, texto }`). **Las 5 antiguas** (`predica1`..`predica5`, con `items` y sin título) se leen igual (`normalizarPredica`: «Prédica guardada N») y pasan a la forma nueva la primera vez que se guardan (`guardarPredica` escribe sin `merge`). Ya no existe `slots` en el contexto ni su carga en `InicializarEstados`. Ver *Prédica* más abajo.

**Tickers y mensajes**: máximo 6 documentos (`ticker1`..`ticker6`, `message1`..`message6`) con campo `num`. Desde el 22 de agosto de 2026 esa lista **es el recuadro de Favoritos** y se puede borrar, así que quedan huecos: al guardar, `numeroDestino()` toma el `num` que se está corrigiendo, si no el **primer hueco libre de 1..6**, y solo si están los seis ocupados sobrescribe el de `timestamp` más antiguo reutilizando su `num`. No vuelvas a calcular el número con `items.length + 1`: con un hueco en medio, eso pisa un documento existente.

Las dos pantallas comparten **`src/Components/Favoritos/FavoritosTexto.jsx`**: el recuadro y las tarjetas. Cada tarjeta lleva los tres botones (proyectar, editar, eliminar) **arriba a la derecha**, junto al rótulo, y el texto debajo recortado a tres renglones (`line-clamp-3`), para que quepan varias sin alargar la página. Hubo una versión con un visor modal para leer el texto completo; se quitó el mismo día por innecesaria. El componente recibe `etiqueta` ("Mensaje" / "Ticker") y los manejadores; no toca Firestore ni RTDB por su cuenta, todo lo decide el panel que lo monta. El favorito que está en pantalla se marca con `border-app-success bg-app-success/10` y el rótulo «· en pantalla», igual que la lámina activa de `ControlCancionProyectar`.

`numProyectado` es estado local del panel, no un nodo de RTDB: marca cuál de los seis se envió desde esta sesión. Al proyectar el texto del área de escritura se pone en `null`, porque lo que hay en pantalla ya no es ninguno de los favoritos. Una recarga lo pierde, y es deliberado: no vale la pena un nodo nuevo para una marca visual.

### Celular acostado (24 de noviembre de 2026)

Pedido del usuario: **no se bloquea el giro** (una página no puede: iPhone no lo permite y Android solo con la app instalada; se descartó el aviso «Gira tu celular» y el bloqueo con `screen.orientation.lock`), sino que «la vista de un celular acostado sea la misma de cuando está en vertical, pero con scroll». Dos reglas:

- **Formato por el lado corto del aparato** (`formatoPantalla.js`, `ladoCortoDelDispositivo`): un dispositivo táctil con el lado corto de la pantalla menor de 744 px (celulares y tabletas de 7 y 8 pulgadas; el iPad mini, con 744, es la tableta más pequeña) es «celular» **de pie y acostado**. Antes, acostado medía ~844 px y se le montaba el diseño de tableta. `formatoDe(ancho, tactil, ladoCorto)`, `esBaja` y `esEscritorio` aceptan el lado corto como tercer argumento; sin saberlo (jsdom: 0) manda solo el ancho. Un PC con mouse nunca entra.
- **Scroll en vez de recorte** (`index.css`): `h-pantalla` pasa a `height: auto` con el mismo mínimo en un táctil acostado de menos de 500 px de alto (`(pointer: coarse) and (orientation: landscape) and (max-height: 500px)`), así las ~15 pantallas de alto fijo crecen con su contenido y la página se desplaza. También cubre al celular de pie con el teclado abierto. Una tableta acostada (600 px o más de alto) no entra. Tests: `formatoPantalla.test.js` y `AlturaPantalla.test.js` (lee el CSS).

**Pendiente de revisar en un celular real acostado**: las 36 pantallas que usan puntos de quiebre de Tailwind por ancho (`sm:`, `md:`, `lg:`) siguen activando su variante ancha a 844 px; si alguna se ve mal, se corrige esa pantalla. Se descartó fijar el viewport en el ancho de vertical (ampliaría todo ×2,2 y dejaría ~180 px de alto visibles). Prédica ya usa `formato === "celular"` para su diseño de celular, así que acostado toma ese.

### Navegación del panel (9 de noviembre de 2026)

Barra lateral en el computador y barra superior con menú en el celular (`src/Components/Navegacion/`: `Secciones.js`, `MarcoPanel.jsx`, `BarraLateral.jsx`, `BarraSuperior.jsx`). Incluye Ayuda, la guía de la pantalla del templo (`Components/PantallaGuia/`), Biblia en el celular, logo en pantallas y los altos del celular (usar `h-pantalla`, no `h-svh`). **Una sección nueva se agrega en `SECCIONES`, su ruta va dentro de `<Route element={<MarcoPanel />}>` en `App.jsx`, y si proyecta, se suma a `PREFIJOS_CON_GUIA`.**

**Antes de tocar esto, lee [`docs/Navegacion.md`](docs/Navegacion.md).**

### Roles y rutas protegidas

Los roles se definen en un solo sitio: **`src/Components/Roles/Roles.js`** (y su espejo CommonJS `functions/roles.js` para las Cloud Functions). Nunca escribas cadenas de rol a mano en un componente; importa las constantes.

Jerarquía (reformada el 15 de agosto de 2026). **Solo hay dos niveles y tres roles**; se eliminaron `administrador` —nivel intermedio que no se usaba— y el nombre `Asistente`, sustituido por `Operador`:

| Rol | Origen | Puede |
| --- | --- | --- |
| `Pastor` / `Pastora` | el primero se crea en `ViewRegister` (su `uid` es el `groupId`); su pareja, desde `ViewUsers` | todo |
| `Líder` | creado por un pastor o pastora (25-11-2026) | programar los servicios (cargos de cada fecha, catálogo de cargos) y proyectar **siempre**, como un pastor; nada de cuentas ni de prédicas |
| `Operador` | creado por un pastor | solo manejar la proyección, cuando le toca |

Reglas de la pareja pastoral, iguales en la pantalla y en el servidor:

- Una iglesia tiene **como mucho un `Pastor` y una `Pastora`**.
- **Solo el dueño** (quien registró la iglesia) puede dar de alta a su contraparte: si registró un pastor, la única opción de rol que aparece es `Pastora`, y al revés.
- **Desde el 25 de noviembre de 2026** el selector de rol **no desaparece**: ofrece siempre `Líder` y `Operador` (y, al dueño que aún no tiene pareja, también ella). Lo que se cree sin elegir nace como `Operador`.
- **No hay cambio de rol posterior.** Se elige al crear y punto.

Tres listas gobiernan el acceso: `ROLES_PASTORES` (`/ViewPredica`, gestión de cuentas), `ROLES_PROGRAMACION` (pastores + `Líder`: programar y administrar cargos; `puedeProgramar(userData)`) y `ROLES_PROYECCION` (las tres + operador: resto de rutas de contenido). Un `Líder` **no** es pastor (`esPastor` da `false`): no entra a Prédica, ni crea, edita ni elimina usuarios, ni crea servicios. `/ViewSelector`, `/ViewInicio` y `/ViewAyuda` solo exigen sesión iniciada. Prédica se oculta de las barras a quien no sea pastor (`seccionesPara`), en vez de dejar que choque con `/VistaNoAutorizada`.

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

- `ViewSelector`: `EncabezadoUsuario` (rediseñado el 25 de noviembre de 2026, pedido del usuario, estilo «opción 3» del lienzo https://claude.ai/artifact/5KGLCrx2ZFM1jtNaBm3Vu2: una fila sin barra ni borde, con foto pequeña de anillo dorado o iniciales y una sola línea «Nombre · Rol · Iglesia» **sin el logo de la iglesia** (solo en esta vista) y sin insignia; «Cerrar sesión» con `confirmAction` a la derecha; todo con `truncate` y el texto completo en `title`; en el celular, la sigla en vez del nombre de la iglesia si existe), saludo con `saludoSegunHora` + `primerNombre`, dos `FichaPaso` que se tocan enteras con los dibujos animados de `Ilustraciones.jsx`, y **sin pie** (el 25 de noviembre de 2026 el usuario pidió quitar el estado de la pantalla del templo, el próximo servicio y «¿Primera vez? Ayuda»; se borró `ProximoServicio.jsx`, que solo usaba esta vista; `EstadoPantalla` sigue en otras pantallas). Todo en `Components/Entrada/`. **Textos acordados con el usuario, no cambiarlos sin preguntar**: «Proyectar» / «Si este dispositivo va al proyector»; «Administrar» / «Gestiona versículos, canciones, prédicas, mensajes, tickers, imágenes, videos, cronograma, usuarios y estilos» + «Desde este dispositivo o desde otro». Nada de «computador» en los textos: el que proyecta puede ser cualquier dispositivo. **Celular (25 de noviembre de 2026):** logo y saludo pegados arriba, las fichas centradas en el espacio sobrante (`max-sm:my-auto`, 32 px entre ellas) y, para que no haga falta scroll, las variantes `pantalla-baja` (alto ≤ 780 px) y `pantalla-muy-baja` (≤ 680 px) de `index.css`, siempre con `max-sm:` delante, encogen logo, dibujos y separaciones; comprobado sin desborde en 360×640, 375×667, 390×740, 393×760 y 390×844. Las pruebas con marcos de 844 px engañan: el navegador del celular se come 100–150 px. En celulares de poco alto (`pantalla-baja`) la sobra de alto se reparte 25 % sobre las fichas, 50 % entre ellas y 25 % bajo ellas (`flex-1 justify-around`, y `FichaPaso` pasa a `flex-none`): antes quedaba mucho aire entre la pregunta y las fichas y entre estas y el pie, y poco entre ellas.
- **Presencia** (`Components/PantallaTemplo/`): `usePresenciaPantalla` (en `ControlDisplay`) escribe `pantallaTemplo/{groupId}/{idVentana}` = `{ modo, dispositivo, por, desde }` con `onDisconnect().remove()`, y lo reescribe cada vez que `.info/connected` vuelve a `true` (tras un corte, `onDisconnect` ya lo borró). `modo` (10 de noviembre de 2026; antes era el booleano `completa`) lo detecta `useModoVentana` sin ayuda del botón, escuchando `visibilitychange`, `fullscreenchange` y `resize`, y lo decide la función pura `modoVentana`: `oculta` (página no visible: minimizada, otra pestaña, tapada, celular bloqueado), `encendida` (Fullscreen API, o en computador la página ocupa la pantalla entera: F11), `maximizada` (en computador, `outerWidth/Height` ≈ `screen.availWidth/Height`; en celular, siempre que se vea) y `ventana` (lo demás; en celular, la pantalla dividida). El iPhone nunca llega a `encendida`: Safari no tiene pantalla completa para páginas. `InicializarEstados` lo resume con `estadoPantalla` en `pantallaTemplo` del contexto: `"apagada"` | `"oculta"` | `"ventana"` | `"maximizada"` | `"encendida"` (o `null` mientras no se sabe; con varias ventanas, la mejor según `MODOS`) y, en cada cambio (también entre `ventana` y `maximizada`), pone `{ id, antes, ahora }` en `avisoPantalla` del contexto (`avisoDeCambio`) en todos los equipos **salvo en la propia ventana `/VOXDEI`** y salvo al cargar. Lo pinta **`AvisoPantalla`** (montado en `App.jsx` junto a `Notificaciones`), no `showNotif`: ver *Aviso de la pantalla del templo* más abajo. Si el corte es brusco, Firebase puede tardar hasta un minuto en borrar la presencia.
- **Proyectar solo se oculta si se sabe que la pantalla está abierta** (cualquier estado salvo `apagada`). Con `null` (cargando o sin permiso de leer) se ofrece: mejor de más que dejar a alguien sin poder abrir el proyector. En el celular también se ofrece.
- `EstadoPantalla` (rehecho el 10 de noviembre de 2026, **diseño pedido por el usuario**): el borde del chip y el ícono son **grises si está apagada y verdes en los otros cuatro estados**, porque en todos ellos la pantalla ya está encendida; solo el **texto** lleva el color del estado. Un ícono distinto por estado (pedido expreso): botón de encendido «Apagada» (gris), ojo tachado «OCULTA» (texto rojo), ventana «VENTANA» (texto dorado `app-main`, «amarillo» para el usuario), monitor «MAXIMIZADA» (texto `app-azul`: casi pantalla completa, se puede proyectar así) y flechas de pantalla completa «COMPLETA» (texto verde). El estado en pantalla completa se llama `encendida` en el código y se muestra «COMPLETA» (pedido del usuario); «Apagada» es el único que no va en mayúsculas.
- **Aviso de la pantalla del templo** (`PantallaTemplo/AvisoPantalla.jsx` + `EscenaPantalla.jsx`, 10 de noviembre de 2026; diseño aprobado por el usuario sobre https://claude.ai/artifact/3tf5hXWdbtZSWaP2i6hNDT). Es **aparte de `Notificaciones` a propósito**: los demás avisos siguen abajo en el centro. Cada aviso lleva una mini pantalla SVG animada (la diapositiva que crece en `encendida`, flechas que empujan en `maximizada`, ventanita que flota, ventana que baja a la barra de tareas con ojo tachado en `oculta`, televisor que se apaga en `apagada`), y **solo dos líneas de texto, pedido expreso del usuario** (en 2 s no da para leer más): arriba el estado (`AVISO_ESTADO`, «Modo maximizado») y debajo el cambio («Ventana → Maximizada»). Se quitaron el 10 de noviembre de 2026 un texto explicativo y la línea del equipo que proyecta («Computador · Ana»): no los repongas. Abajo, una línea que se vacía en `DURACION_AVISO`. Colores: verde, azul, dorado, rojo y gris, iguales al texto del indicador; salen de `data-estado` → variable `--tono` (utilidades `aviso-templo`, `tono`, `resplandor-tono`, `cuenta-tono`, `pista-tono` en `index.css`). **Ubicación pedida por el usuario para no estorbar**: en computador (`isDesktop`) tarjeta de `w-aviso-pantalla` abajo a la derecha, que **se pausa con el mouse encima** (`useCuenta`); en celular y tablet, **píldora arriba** (`top-aviso-isla`, respeta la cámara), que se cierra al tocarla. Un aviso nuevo reemplaza al anterior (`AnimatePresence mode="wait"`, `key={id}`); el de `oculta` se sacude y el de `encendida` lleva un reflejo. Las animaciones de las escenas están en el `@theme` (`animate-escena-*`) con `motion-safe:`; con «reducir movimiento» queda el dibujo final. **`--animate-cuenta-aviso` dura lo mismo que `DURACION_AVISO`**: si cambias uno, cambia el otro. Va en la entrada y en la tarjeta «Servicio» de Inicio. **La pantalla del templo no se abre desde el panel**: ni barra lateral, ni Inicio, ni Ayuda (decisión del usuario).

### Prédica (10 de noviembre de 2026)

Sección rehecha de cero el 10 de noviembre de 2026, ruta `/ViewPredica` (solo pastores). Contenedor `ControlPredica/ControlPredica.jsx`; piezas en `Components/Predica/` (biblioteca, calendario, editor, púlpito, modo de prueba, semáforo de cabida, estados, numeración de puntos, vista por pantalla: celular, tableta y escritorio). Cada prédica es un documento en `iglesias/{groupId}/predicas/{id}`.

**Antes de tocar esto, lee [`docs/Predica.md`](docs/Predica.md).**

### TEMPORAL DHH: Biblia Dios Habla Hoy para el domingo 15 de noviembre de 2026

Biblia Dios Habla Hoy (DHHS94), temporal para el domingo 15 de noviembre de 2026; se quita después y queda solo la RVR1960. Todo el código lleva el comentario «TEMPORAL DHH». El detalle, incluida la lista de qué borrar, está en el documento.

**Antes de tocar esto, lee [`docs/BibliaDHH.md`](docs/BibliaDHH.md).**

### Datos de la iglesia: nombre, sigla y logo (9 de noviembre de 2026)

Firestore `iglesias/{groupId}/perfil/datos` = `{ nombre, sigla, logo, actualizado }` (`PERFIL`, `PERFIL_DATOS`). **Solo pastor y pastora** lo escriben: en `firestore.rules`, `perfil` se sumó a `cronograma` en la condición `!(coleccion in [...]) || soyPastor()`. `InicializarEstados` lo pone en `iglesia` del contexto; `datosDeIglesia(iglesia, userData)` cae a `userData.churchName` para las iglesias registradas antes.

- Se ponen en **Usuarios** (`DatosIglesia`, solo pastores). `guardarDatosIglesia` comprime el logo (`LADO_PERFIL`) y lo sube a `imagenes/{groupId}/logo-iglesia`, carpeta que `eliminarMiCuenta` ya borra. Del 9 al 11 de noviembre de 2026 también se pedían en el registro; el usuario pidió quitarlos de ahí.
- **Formulario de registro** (11 de noviembre de 2026, pedido del usuario: «revierte todo»). Tras varios intentos (compactarlo para que no se desplazara, el campo de logo y sigla, quitar «opcional» y el ejemplo «CDP», los requisitos de la contraseña en una línea corta en el computador), `ViewRegister` volvió a la **versión publicada el 26 de octubre de 2026** (commit `36a28ea`) con solo tres diferencias: la marca de agua `MarcaAguaHaz` (raíz con `isolate`), **la foto opcional** (sin foto, `photo: ""` y se ven las iniciales) y el título bien escrito («Registrar», antes «Regístrar»). **El género sigue siendo obligatorio** (el usuario lo pidió expresamente). Sin campo de logo ni sigla, y sin logo de VOXDEI arriba. `RequisitosClave`, `REQUISITOS_CLAVE` (sin `corto`) y `CampoLogoIglesia` volvieron también a como estaban, en todas las vistas. Lo vigila `ViewRegister.test.jsx`.
- `normalizarSigla`: solo letras (con Ñ y tildes) y números, en mayúsculas, hasta `LARGO_SIGLA` (8).
- Hoy se usan en el encabezado de la entrada. `churchName` sigue en la ficha de cada usuario (lo copia `crearUsuarioAdmin`): cambiar el nombre en `perfil` no lo actualiza.

### Orden del culto (9 de noviembre de 2026)

Ruta `/ViewCulto` (`ROLES_PROYECCION`) → `Components/OrdenCulto/OrdenCulto.jsx`. Es la primera sección de «Proyectar» y la primera de «Organizar» en el menú. Dos pestañas:

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

**Pantalla de espera.** Nodo RTDB `displayEspera/{groupId}` = `{ activa }`; `InicializarEstados` lo vuelca en `visibleEspera` (sin nodo, apagada). Se enciende y apaga **solo desde Inicio** (`ResumenDia`, botón «Mostrar / Quitar la pantalla de espera»), con `exigirTurno` porque escribe en la pantalla. **Se quitó del Cronograma el 25 de noviembre de 2026** (pedido del usuario: «no tiene nada que ver»); no la repongas ahí. En `ControlDisplay`, mientras está activa **manda sobre todo el centro** (video, imagen, texto) y oculta el título; el ticker sigue. El reproductor de YouTube no se desmonta: si había un video sonando, sigue sonando oculto, así que conviene apagarlo antes.

`PantallaEspera` (logo vertical, `userData.churchName` y cuenta regresiva) recalcula cada segundo con la hora del servidor (`desfaseReloj`) y decide qué decir con `contenidoEspera` (`PantallaEspera/utilesEspera.js`): `enCurso` si un servicio ya empezó (si se cruzan, el que empezó más tarde), `cuenta` si faltan hasta `HORAS_CUENTA_REGRESIVA` (6), `fecha` («Próximo servicio: …, Lunes · 10:00») si falta más, o `nada`. El próximo servicio sale de `proximoServicio(servicios, ahoraMs)` y el texto de `textoCuentaRegresiva(ms)`, ambos en `UtilesCronograma.js`. Colores y tamaños, los de *Estilos y colores* (texto, título, cita).

**Marca de agua.** No es un nodo de RTDB: es el grupo `marcaAgua` de los estilos (`{ visible, esquina, tamano, opacidad }`), guardado con el resto en Firestore, apagado de fábrica. Se configura en la sección «Marca de agua» de `ControlEstilos`, que también la dibuja en la vista previa. La posición la calcula `estiloMarcaAgua(estilos, alturaTicker)` en `EstilosProyeccion.js`, la misma función para la vista previa y para el templo: respeta el margen de seguridad (mínimo 2 %), y abajo con el ticker encendido sube por encima de él. No se muestra en la pantalla de espera. Las esquinas se eligen con triángulos (◤◥◣◢): las flechas ↖↘ salen como emoji en Windows.

### Proyección de imágenes y canciones

Imágenes: `displayImage` / `displayVisibleImagen` en RTDB; toda imagen se comprime con `comprimirImagen` antes de subirse. Canciones: tres pantallas con ruta propia (`/ViewCanciones`, `/ViewCancion/:id`, `/ViewCancionEditar`). **Nunca escribas dos canales con `display` distinto en la misma acción.** Las pantallas miden `h-svh` con `overflow-hidden`: no quites los `min-h-0`.

**Antes de tocar esto, lee [`docs/ImagenesYCanciones.md`](docs/ImagenesYCanciones.md).**

### Cronograma y turnos (23 de octubre de 2026)

Decide quién puede escribir en la pantalla: pastor, pastora y líder siempre; con servicio en curso, quien tenga ese día un **cargo que proyecta** (Conductor, Proyección…, según la **programación** de esa fecha; ya no hay operador fijo en el servicio, desde el 25 de noviembre de 2026); sin servicio, quien tenga el ensayo; con un servicio sin nadie asignado, solo pastores y líder. Cargos y programación: `iglesias/{g}/cargos` y `iglesias/{g}/programacion/{servicioId}_{fecha}`, que escriben pastor, pastora y líder (`soyPastorOLider` en `firestore.rules`). La pestaña «Servicios» del Cronograma tiene dos columnas (lo que se repite como semana vertical y las fechas especiales), filtros y un calendario en la columna derecha: ver `docs/Cronograma.md`. **Entrega 2 hecha (25 de noviembre de 2026):** `ResumenDia/MiProgramacion.jsx` (tarjeta en Inicio; sin cargos asignados no se pinta) con «Confirmo» / «No puedo» por la función **`responderTurno`** (no por reglas: `programacion` solo la escriben pastor, pastora y líder, y abrirla dejaría a cualquiera asignarse un cargo que proyecta); `misTurnos` en `programacion.js`. Los ensayos se programan como un servicio más (ya no hay tarjeta de ensayo en el Cronograma). En el Cronograma, la columna derecha lleva una franja deslizante «Servicios | Programación» de borde a borde, el campo **Nombre** es un combobox propio (`CampoConLista`, lista fija a la pantalla para que no la recorte un panel con scroll) y **«Administrar cargos»** va fijo al pie de la columna y, abierto, ocupa toda ella. **Hay que desplegar a mano** las reglas (`firebase deploy --only firestore:rules`) y las funciones `crearUsuarioAdmin` y `responderTurno` (`FUNCTIONS_DISCOVERY_TIMEOUT=60 npx firebase deploy --only functions`) para que se pueda crear un Líder y escribir cargos. **El bloqueo es de la app: cada función que escribe en la pantalla empieza con `if (!exigirTurno()) return;`. Cualquier envío nuevo a la pantalla debe llevar esa guardia.** Lógica pura en `Components/Cronograma/UtilesCronograma.js`, hook `useTurno`.

**Antes de tocar esto, lee [`docs/Cronograma.md`](docs/Cronograma.md).**

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

**Logo** (9 de noviembre de 2026). Los SVG viven en **`src/assets/`**, junto al resto de imágenes (el usuario no quiere carpetas aparte como `public/logo`). El símbolo de la app es **`voxdei-simbolo.svg`**, el morado de cinco rayos, extraído del logo horizontal; `index.html` lo usa como ícono con `href="/src/assets/voxdei-simbolo.svg"` y Vite lo procesa en el build. Hubo un ícono azul de un solo haz (`voxdei-1-proyector.svg`) que no coincidía con los logos: el usuario lo descartó y se borró. Dentro de la app (fondo gris) van las versiones `fondo-oscuro`; las `fondo-claro` son para el README, la tienda y lo impreso. Las ideas aprobadas para usarlos y la navegación nueva (barra lateral en PC; en el celular, la misma barra desplegable con un botón de menú arriba) están en la memoria del proyecto, con sus prototipos.

**Regla del logo (18 de noviembre de 2026, pedido del usuario): donde se sepa de qué iglesia es la sesión, se pinta el logo que la iglesia subió; si no subió ninguno, el de VOXDEI.** Se hace con **`Components/Logo/LogoDeLaIglesia.jsx`** (`variante`: `simbolo` | `horizontal` | `vertical`, el respaldo de VOXDEI; el logo de la iglesia se muestra entero, `object-contain`). Toda vista nueva con logo pasa por ahí, no por `Simbolo` / `LogoHorizontal` / `LogoVertical`. Lo usan la barra lateral, la entrada (`ViewSelector`, `EncabezadoUsuario`), la cabecera de Usuarios y la pantalla de espera del templo. **Se quedan con el logo de VOXDEI a propósito**: lo que se ve antes de iniciar sesión (login, registro, recuperar y eliminar cuenta, `Loading`, `CapturaErrores`, `VistaNoAutorizada`), el ícono de la pestaña y **la marca de agua del proyector y su vista previa** (decisión del usuario).

**Logo de Navidad (24 de noviembre de 2026).** Del 1 de diciembre al 6 de enero, `Simbolo`, `LogoHorizontal` y `LogoVertical` (`Logo/Logo.jsx`) pintan su versión navideña (`voxdei-simbolo-navidad.svg` y las dos `…-fondo-oscuro-navidad.svg`: nieve que cae y un montón de nieve en el suelo, con CSS dentro del propio SVG; **sin luces (25 de noviembre de 2026, pedido del usuario: «deja el logo sin luces y solo con el efecto de la nieve; coloca nieve solo en el suelo del icono»): se quitó la guirnalda de bombillas y, en su lugar, un montón de nieve en el suelo (dos capas onduladas y unos puntos, dentro del `clipNavidad`, antes de los copos que caen). Tras varios intentos se descartaron una rama de pino con lazos, bombillas tipo ají, luces en izquierda-derecha, un marco dorado con el cable enredado, luces en los cuatro bordes y luces pegadas a izquierda y arriba (hay 4 opciones de mini luces LED, neón, cortina y estrellas en el lienzo https://claude.ai/artifact/5KGLCrx2ZFM1jtNaBm3Vu2 por si algún día se retoman): no repongas luces sin que el usuario lo pida**; **sin la nieve acumulada sobre la barra de la pantalla, que se quitó el 25 de noviembre de 2026 a pedido del usuario: no la repongas**; con «reducir movimiento», sin copos que caen). Lo decide `navidadActiva` (`Logo/utilesNavidad.js`, fecha del dispositivo), así que también cambian el login, `ViewEliminarCuenta` y la pantalla de espera del templo. **Se quedan siempre normales, con `navidad={false}`**: la marca de agua del proyector y su vista previa (`ControlDisplay`, `ControlEstilos`), `Loading`, `CapturaErrores` y `VistaNoAutorizada`; todo `Simbolo` nuevo que deba ser fijo lo lleva. El logo que subió la iglesia nunca cambia, y el ícono de la pestaña y el de la app instalada son fijos. Los tres SVG se generaron a partir de los originales con un script que se borró: si cambia el logo, hay que regenerarlos (se insertan la nieve del suelo y los copos (después del punto de luz). Los tres SVG llevan lo mismo dentro de un lienzo 1024×1024). Con `npm run dev` (`import.meta.env.MODE === "development"`) se ve **siempre**, solo mientras se diseña (**temporal**, a propósito sin pruebas: el usuario no quiere pruebas de «local o desplegada»); la app publicada y las pruebas (modo `test`) siguen solo la fecha. No hay parámetro en la dirección (se probó `?navidad=1` y el usuario lo quitó). Pruebas: `utilesNavidad.test.js` (solo la regla de fechas) y `Logo.test.jsx` (qué logo sale y el `navidad={false}`, con `vi.setSystemTime`); la de `LogoDeLaIglesia` acepta el logo normal o el navideño para no depender del día. **Ambiente del panel (fase 2, mismo día)**, diseñado en https://claude.ai/artifact/WAWN9sLTNtqkNKhkoGNPLe y con la misma regla (`navidadActiva`): `Components/Navidad/GuirnaldaNavidad.jsx` (franja de **pino dibujada a mano en SVG**, sin recursos externos ni licencias: dos `<pattern>` de 240 px (ids `pino-fondo` y `pino-frente`, por eso solo puede haber una guirnalda a la vez) escalados de 30 a 36 px (`ALTO_PX` en el componente: debe coincidir con `--spacing-pino`), con agujas en cuatro verdes generadas por `pinoNavidad.js` (determinista, un trazado por color), piñas, tres bolas con degradado (oro, roja y plata), acebo con bayas y nieve en polvo, más un lazo rojo en cada punta. **Las luces van enredadas en la rama, no colgando**, y por eso el dibujo va en capas: fondo (rama y agujas largas), cable que serpentea (`Cable`), frente (agujas cortas, adornos y nieve, que tapan el cable a medias) y, encima, 12 bombillos de cuatro colores alternados uno arriba y otro abajo de la rama, cada uno con un manojito de agujas pegado al casquillo (si van debajo del frente, las agujas los tapan del todo). **La guirnalda OCUPA SU SITIO arriba del contenido y no tapa nada** (pedido del usuario: antes era una capa encima y cubría textos): la monta `MarcoPanel` como primer hijo del contenido, en el computador y en el celular (bajo la barra), con `pointer-events-none` y `h-guirnalda` (**2 rem = 32 px de espacio reservado**, decisión del usuario). **El dibujo del pino mide 2,25 rem (36 px): sobresale 4 px por debajo de ese espacio**, también a propósito (los lazos son de 36 px). Para que las pantallas que miden la ventana no se desborden, `index.css` define `--alto-guirnalda` (0 normalmente; `:root:has([data-guirnalda])` lo pone en `--spacing-guirnalda`) y **`h-pantalla` y `min-h-pantalla` lo descuentan**, además de la barra de arriba. **Una pantalla nueva del panel debe medir con `h-pantalla`/`min-h-pantalla`, nunca con `h-svh` ni `min-h-dvh`**: se pasaron `Controlmessage`, `ControlTicker` y `ControlVersiculo` en la guía. `--alto-guirnalda` no entra en `--alto-barra`: los encabezados pegajosos se pegan bajo la barra, no bajo la guirnalda, que se va al desplazar). **Nieve acumulada en las tarjetas: se probó (`NieveBorde.jsx`, en `FichaPaso` y en `ResumenDia`) y el usuario pidió quitarla de todas partes el 24 de noviembre de 2026; no la repongas.** No afecta a la nieve que cae (`NieveCayendo`) ni al polvo de nieve del pino. Colores, sombra, medidas y animación son variables del `@theme` (`app-luz-*`, `app-cable`, `app-nieve`, `app-pino*`, `app-baya`, `shadow-luz`, `h-guirnalda` de 2 rem, `h-pino` de 2,25 rem, `animate-parpadea-luz`). **Cómo se mira sin la app** (así se afinó el dibujo el 24 de noviembre de 2026): una página temporal en la raíz con un `.html` y un `.jsx` que montan el componente con `src/index.css`, `npx vite --host 127.0.0.1 --port 5199` y `chrome.exe --headless=new --screenshot=… --window-size=…` (`--force-device-scale-factor=2` para el zoom); después se borran la página y el servidor. Sin «reducir movimiento» las luces no parpadean. El dibujo se vio renderizado a 1280, 640 (con zoom) y 390 px, pero **dentro de la app real no se probó**: si alguna pantalla se desborda o aparece una barra de desplazamiento extra, revisa que mida con `h-pantalla`; el alto se cambia en `--spacing-guirnalda`. Tests en `Navidad/Navidad.test.jsx`.

**Nieve cayendo (24 de noviembre de 2026).** `Navidad/NieveCayendo.jsx`, montada en `App.jsx` junto a `AvisoPantalla`: capa `fixed inset-0 z-40 pointer-events-none` (los avisos y modales, `z-50`, quedan por encima), con la misma regla `navidadActiva`. **No se pinta en `/VOXDEI`** (taparía lo que ve la congregación) ni con «reducir movimiento». El motor es una **copia de react-snowfall 2.4.0 (MIT, © Cahil Foley)** portada de TypeScript a JavaScript en `Navidad/Nieve/` (`Snowfall.jsx`, `SnowfallCanvas.js`, `Snowflake.js`, `hooks.js`, `config.js`, `utils.js`), **sin instalar el paquete** (decisión del usuario): `react-fast-compare` se reemplazó por `igualProfundo` en `utils.js`, y el aviso de la licencia está en `Nieve/LICENCIA.txt` (**debe acompañar a la copia**). Los dibujos de los copos (`copos.js`: copos suaves desenfocados y cristales de seis brazos) se generan en un canvas al arrancar, así que no hay imágenes ni dominios nuevos para la CSP. Cantidad: 110 en computador y 60 en celular. **Nieve acumulada abajo** (pedido del usuario: «que se quede abajo y cree una capa de nieve»): los copos aterrizan sobre una pila que crece. `acumulacion.js` (lógica pura: una columna por cada 4 px con un tope ondulado de 20 px, aporte repartido en campana y alisado para que no haya paredes; `aportePorCopo` lo calibra para que se llene en 150 s según ancho y cantidad de copos), `PilaDeNieve.jsx` (canvas `h-pila` pegado abajo, se redibuja solo cuando un copo aterriza, color de `--color-app-nieve`) y dos opciones **añadidas** al motor copiado, que sin ellas se comporta como el original: `getSuelo(x)` y `onLand(x, radio, ancho)` en `Snowflake.update` y `Snowfall.jsx` (únicas diferencias con react-snowfall, aparte de `igualProfundo`; si se actualiza la copia hay que volver a ponerlas). La pila vive en el estado del componente: se vacía al recargar y al ir al proyector. Puede tapar hasta 20 px del borde de abajo de la pantalla (no recibe toques). Si algún día se quiere actualizar el motor, se compara con el repositorio oficial. Tests en `Nieve/Nieve.test.js` y `NieveCayendo.test.jsx`.

**Espacio abajo para la nieve (24 de noviembre de 2026, pedido del usuario: «lo mismo que arriba con las luces y las ramas, dale un espacio»; fue de 12 y luego 14 px fijos).** **Desde el 25 de noviembre de 2026 es proporcional a la nieve** (pedido del usuario: con 14 px fijos el pie se veía alto mientras la pila estaba vacía): `Acumulacion` lleva su **altura promedio** en px enteros (`altoActual`, solo sube, y avisa con `alCrecer`; el promedio y no el pico, porque con el pico el pie subía por delante de la nieve que se ve; los picos pueden pasar unos píxeles por detrás del pie), `NieveCayendo` lo publica en `--alto-pila-actual` de la raíz (0 al empezar, hasta 20 px; se quita al desmontar) y `h-nieve` y `--alto-nieve` lo leen; el token `--spacing-nieve` ya no existe. Ojo: el espacio puede medir 0 y todo lo que cuente con él debe tolerarlo. **Sin saltos (25 de noviembre de 2026, pedido del usuario: la pantalla brincaba cada vez que el espacio subía un píxel):** `--alto-pila-actual` está registrada con `@property` (longitud) y la raíz le da `transition: --alto-pila-actual 3s linear`, así el navegador interpola entre un píxel y el siguiente (comprobado: de 0 a 10 px en ~3 s, sin brincos). No quites el `@property`: sin él la transición no existe. `EspacioNieve.jsx` es un bloque `h-nieve` que `MarcoPanel` pone **al final** del contenido, en computador y celular (el mismo criterio que la guirnalda arriba). Existe solo cuando nieva: `hayNieve(pathname)` (`utilesNieve.js`, compartido con `NieveCayendo`) exige temporada, que no sea `/VOXDEI` y que no esté «reducir movimiento». `h-pantalla` y `min-h-pantalla` descuentan también `--alto-nieve`, que se activa con `:root:has([data-espacio-nieve])`. El bloque lleva `bg-app-light/50`, el color del final del degradado `from-app-dark/50 to-app-light/50` que pintan 16 pantallas, para que no se vea una franja (la guirnalda de arriba no necesita color: el degradado empieza en el de la página). **Prédica es la excepción**: abajo tiene columnas de colores distintos (listas y paneles `app-light`, el tapete) y ningún color único las imita; sus 4 raíces `h-pantalla` llevan `data-sin-espacio-nieve`, que pone `--alto-nieve: 0` y oculta el bloque, y la nieve se pinta encima sin bloquear toques. **Una pantalla nueva del panel con colores distintos abajo debe llevar esa marca.** **Fuera del marco (25 de noviembre de 2026)**: `MarcoPanel` solo cubre las pantallas del panel, así que `ViewSelector`, `ViewLogin`, `ViewRegister`, `ViewResetPassword`, `ViewEliminarCuenta`, `VerificarCorreo` y `PerfilNoDisponible` llevan su propio `<EspacioNieve className="bg-transparent" />` como **último hijo de su raíz `min-h-svh`** (transparente: toma el degradado de la raíz, sin franja; al ir dentro de la raíz no hay que descontarlo con `min-h-pantalla`). Toda pantalla nueva fuera del marco debe hacer lo mismo. Quedan sin espacio a propósito: `/VOXDEI`, `Loading` (capa `fixed`), `VistaNoAutorizada` (corta y centrada) y `CapturaErrores` (fuera del enrutador). Prueba: `EspacioNieveEnPantallas.test.jsx`. La capa de nieve llega a 20 px (`ALTO_MAXIMO`), hasta 6 px más que el espacio. **Se probó y se descartó** que la nieve se empuje con el puntero (un barrido): el usuario pidió revertirlo. Tests: `EspacioNieve.test.jsx`, `utilesNieve.test.js`, `MarcoPanel.test.jsx` y `AlturaPantalla.test.js`.

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

## Pendientes menores (desde el 15 de agosto de 2026)

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
