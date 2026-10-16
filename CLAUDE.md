# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Comandos

```bash
npm run dev          # Vite en modo desarrollo (host 0.0.0.0, accesible desde la red local)
npm run build        # Build de producción a dist/
npm run preview      # Sirve el build de dist/
npm run lint         # ESLint sobre src/ y functions/ (dist/ ignorado)

# Cloud Functions (desde functions/)
npm run serve        # Emulador solo de functions
npm run logs         # Logs de las funciones desplegadas
npm run deploy       # firebase deploy --only functions

# Despliegue del frontend (proyecto voxdei-ec499)
npm run build && firebase deploy --only hosting
```

No hay suite de tests ni runner configurado en el proyecto.

**Antes de correr `npm run dev` en un clon nuevo**: `src/Components/Firebase/FirebaseConfig.js` está en `.gitignore` y no se versiona. Debe existir exportando por defecto el objeto de configuración de Firebase (`apiKey`, `authDomain`, `databaseURL`, `projectId`, `storageBucket`, `messagingSenderId`, `appId`); sin él la app no arranca.

## Arquitectura

VOXDEI es una app de proyección para iglesias: un panel de control (móvil/escritorio) envía contenido en tiempo real a una pantalla de proyección abierta en otra ventana.

### Los dos canales de datos

La distinción más importante del proyecto:

- **Firestore (`db`)** guarda el **contenido persistente**: `users`, `biblia`, `predicas`, `tickers`, `messages`, `imagenes`.
- **Realtime Database (`database`)** guarda el **estado efímero de proyección**: qué se está mostrando ahora mismo y qué secciones están visibles.

Todos los nodos de RTDB se escriben bajo `<nodo>/${userData.groupId}`:
`displayTitulo`, `displayMessage`, `displayVersiculo`, `displayTicker`, `displayVisibleTitulo`, `displayVisibleTexto`, `displayVisibleTicker`, `speedTicker`. Cualquier nodo nuevo debe seguir el mismo patrón o romperá el aislamiento entre iglesias.

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
  - **El dueño verifica su correo** (15 de octubre de 2026). `ViewRegister` llama a `sendEmailVerification` al terminar, y `ProtectedRoutes` muestra `VerificarCorreo` en vez de cualquier ruta protegida mientras `user.uid === userData.groupId && !correoVerificado`. Solo el dueño: operadores y pareja pastoral los da de alta un pastor ya verificado. `correoVerificado` es una copia en estado de `user.emailVerified`, porque `reload()` muta el mismo objeto y React no se entera; `comprobarVerificacion` hace `reload()` y, si ya está verificado, `getIdToken(true)`, porque **el servidor mira `email_verified` en el token**: `crearUsuarioAdmin` rechaza al dueño sin verificar. `/EliminarCuenta` es pública y sigue a su alcance. Los correos de Firebase salen en español por `auth.languageCode = "es"` en `Firebase.js`.
  - **Contraseñas nuevas de 8 caracteres o más**: `LARGO_MINIMO_CLAVE` en `Components/Validaciones/Validaciones.js`, con su espejo en `functions/index.js`. Se comprueba en `ViewRegister`, en `ViewUsers` y en `crearUsuarioAdmin`; nunca en el login. Además, la **política de contraseñas de Firebase Auth** está activa desde el 15 de octubre de 2026 (consola → Authentication → Configuración): modo *Exigir*, mínimo 8, sin requisitos de mayúsculas, números ni símbolos, y **con actualización forzada al iniciar sesión**. Consecuencia: una cuenta con contraseña de menos de 8 no entra; Firebase devuelve `auth/password-does-not-meet-requirements` y `ViewLogin` (y la reautenticación de `ViewEliminarCuenta`) no lo traducen, así que muestran el error genérico. La salida es «¿Olvidaste tu contraseña?» o que el pastor borre y recree al usuario. Decisión del usuario: con una sola iglesia registrada, de prueba, no valía la pena un mensaje propio; si la app ya tuviera usuarios reales, conviene añadirlo.
- **`AppContext`**: estado compartido del panel (slots de prédicas, items de ticker/mensajes, flags de visibilidad, velocidad del ticker) y el sistema de notificaciones.
- **`InicializarEstados`**: componente sin UI montado en `App`. Centraliza las suscripciones globales (slots de prédicas, `onSnapshot` de tickers y mensajes, los nodos de visibilidad y velocidad). Espera a que `userData.groupId` exista antes de suscribirse. Las suscripciones globales van aquí, no en las vistas.

### Notificaciones y confirmaciones

No se usa `alert` ni `confirm`. `AppContext` expone:

- `showNotif(type, message)` — tipos `success` | `error` | `warning` | `info`; se cierra sola a los 4 s.
- `confirmAction(message)` — devuelve una promesa que resuelve `true`/`false` según lo que pulse el usuario. Siempre con `await`.

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

Dos listas gobiernan el acceso: `ROLES_PASTORES` (`/ViewPredica`) y `ROLES_PROYECCION` (resto de rutas de contenido). `/ViewSelector` y `/ViewGestion` solo exigen sesión iniciada, pero `ViewGestion` oculta el botón de *Gestión Predica* a quien no sea pastor, en vez de dejar que choque con `/VistaNoAutorizada`.

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

### Proyección de imágenes y canciones

**Imágenes**: `ControlImagenes` escribe en `displayImage/${groupId}` (`type: "single" | "carousel"`, `images[]`, `interval` en milisegundos) y `ControlDisplay` lo consume rotando con un `setInterval`. La visibilidad va aparte, en `displayVisibleImagen/${groupId}`, con su propio flag `visibleImagen` en `AppContext`. La imagen ocupa la franja central y **sustituye al texto** mientras está encendida; título y ticker conservan sus propios interruptores.

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

`useScreenType()` clasifica la pantalla en `proyector` | `desktop` | `movil`; `ControlDisplay` usa esa clave para elegir tamaños tipográficos y velocidad del ticker. En los paneles, `isDesktop` (de `AppContext`) decide entre botones de visibilidad en línea o el `ModalVisibilidad`.

**`ModalVisibilidad` se ancla al botón con `fixed`** (22 de agosto de 2026). Antes su menú era `absolute` y el componente **no envolvía botón y menú en un contenedor `relative` propio**, así que se anclaba al ancestro posicionado de cada vista —el encabezado `sticky`— y en `ControlCanciones`, `ControlTicker` y `Controlmessage` salía fuera de la pantalla; solo en `ControlVersiculo` caía donde debía. **El menú va sin fondo y sin borde a propósito**: solo `rounded-xl` y una sombra corta, `shadow-[0_2px_6px_rgba(0,0,0,0.45)]`. Lo que lo separa del contenido de atrás es **únicamente esa sombra**, así que no la quites: se probó sin ella y el recuadro deja de distinguirse. Tampoco vuelvas a `shadow-xl`: con 25 px de desenfoque y sin fondo detrás, se ve como un halo grande alrededor del menú. Al corregir la posición se le añadieron fondo y borde y el usuario pidió retirarlos; no los repongas creyendo que faltan. Ahora calcula su sitio con `getBoundingClientRect()`. **Tres reglas fijas, pedidas expresamente por el usuario; no las cambies por lo que parezca más bonito:**

1. **A 2 px del borde derecho de la pantalla** (`BORDE_DERECHO`), anclado con `right`. Nada de centrarlo bajo el botón. **El menú no lleva ancho**: mide lo que midan sus iconos, que son los mismos en las cuatro vistas. Hubo un intento de anclarlo con `left` restando un ancho estimado de 60 px, y ese número —que no coincidía con el contenido más el relleno— comprimía los iconos. No vuelvas a fijar un ancho.

   Ojo con el botón del ojo, que es otra cosa: declara `w-full h-full`, así que su tamaño lo decide la barra de cada vista y **sí** varía entre pantallas. Está así a propósito, para alinearse con los botones de texto vecinos.
2. **Siempre por debajo de la línea divisoria amarilla**, el `border-b border-app-main` (`#facc15`) del encabezado que llevan las cuatro vistas. El `top` es `Math.max(botón.bottom, encabezado.bottom) + MARGEN`: manda el que quede más abajo, porque el botón puede estar en una fila superior del encabezado.
3. **Nunca se abre hacia arriba**, que taparía ese encabezado. Si lo que queda de pantalla no alcanza, el menú se desplaza por dentro (`maxHeight` + `overflow-y-auto`).

El encabezado se localiza subiendo desde el botón hasta el primer ancestro con `position: sticky` (`finDelEncabezado`); si una vista nueva no lo tuviera, la función devuelve `0` y manda el botón. Se recoloca en `scroll` (con captura, porque el contenedor que se desplaza no es `window`) y en `resize`, y cierra con Escape. Es el mismo remedio que ya se aplicó a los selectores de color de `ControlEstilos`: cuando un panel flotante depende del contenedor de cada vista, tarde o temprano queda recortado o fuera de pantalla.

## Convenciones

- Código, comentarios y nombres de componentes en español. Mantener ese estilo.
- Las vistas viven en `src/Views/<Nombre>/<Nombre>.jsx` y deben reexportarse en `src/Views/index.js` para poder usarse en `App.jsx`.
- Las rutas distinguen mayúsculas y se escriben tal cual (`/ViewGestion`, `/ViewSelector`, `/VOXDEI`). Ya hay al menos un `navigate("/Viewgestion")` mal escrito en `ViewUsers` que no coincide con ninguna ruta; conviene verificar el destino al copiar navegaciones.
- `ViewGestion.jsx` exporta una función llamada internamente `ViewSelector`, distinta de la vista `ViewSelector`. No confundirlas: `ViewSelector` es la pantalla de entrada (abre el visor y cierra sesión), `ViewGestion` es la cuadrícula de opciones.
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
7. Menores: `crearUsuarioAdmin` no revierte la cuenta de Auth si falla la ficha
   o el claim (y `gender` ausente hace fallar el `set` con `undefined`); un
   `showNotif` encima de un `confirmAction` deja su promesa sin resolver; las
   imágenes se suben sin comprimir; el catálogo de canciones se descarga
   entero (ver `docs/BuscadorCanciones.md`).
