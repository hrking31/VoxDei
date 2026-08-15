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
2. `ControlDisplay` (ruta `/VOXDEI`, que `ViewSelector` abre con `window.open` en ventana aparte) se suscribe con `onValue` y renderiza.
3. El campo `display` decide qué bloque se muestra: `"titulo"`, `"mensaje"`, `"mensajePredica"`, `"versiculo"`.
4. Los flags `visibleTitulo` / `visibleTexto` / `visibleTicker` controlan qué secciones aparecen, y viven duplicados: en el contexto de React (respuesta inmediata en el panel) y en RTDB (sincronía con la pantalla).

### Contextos y arranque

`main.jsx` → `AuthProvider` → `BrowserRouter` → `App` → `AppProvider`. Consecuencia práctica: `useAuth()` está disponible en todas partes; `useAppContext()` solo dentro de `App`.

- **`AuthContext`**: sesión de Firebase Auth (`user`) más el documento `users/{uid}` de Firestore (`userData`, con `role`, `groupId`, `churchName`, `photo`). Expone `signup`, `login`, `logout`, `loading`.
- **`AppContext`**: estado compartido del panel (slots de prédicas, items de ticker/mensajes, flags de visibilidad, velocidad del ticker) y el sistema de notificaciones.
- **`InicializarEstados`**: componente sin UI montado en `App`. Centraliza las suscripciones globales (slots de prédicas, `onSnapshot` de tickers y mensajes, los nodos de visibilidad y velocidad). Espera a que `userData.groupId` exista antes de suscribirse. Las suscripciones globales van aquí, no en las vistas.

### Notificaciones y confirmaciones

No se usa `alert` ni `confirm`. `AppContext` expone:

- `showNotif(type, message)` — tipos `success` | `error` | `warning` | `info`; se cierra sola a los 4 s.
- `confirmAction(message)` — devuelve una promesa que resuelve `true`/`false` según lo que pulse el usuario. Siempre con `await`.

### Modelos de datos

**Biblia**: `biblia/{SIGLA}_{capitulo}` (p. ej. `GEN_1`) con `sigla`, `libro`, `capitulo`, `versiculos` (mapa `"1"` → texto) y `chapter_html`. Se consulta con `obtenerVersiculo(sigla, capitulo, numero, tipo, showNotif)` en `FuncionesControlPredica`. `LibrosBiblia.js` es el catálogo estático (`librosAntiguo`, `librosNuevo`) e incluye el número de versículos de cada capítulo en campos `capitulo1`, `capitulo2`, …, que alimentan los modales de selección. Los componentes de `Upload/` son scripts de carga masiva de un solo uso, normalmente comentados en `ViewDisplay`.

**Prédicas**: exactamente 5 slots, `predicas/predica1`..`predica5`, cada uno con `items[]` de `{ tipo, contenido, timestamp }` donde `tipo` es `titulo` | `mensaje` | `versiculo` (en versículos, `contenido` es `{ cita, texto }`). El array `slots` del contexto refleja qué slots están ocupados.

**Tickers y mensajes**: máximo 6 documentos (`ticker1`..`ticker6`, `message1`..`message6`) con campo `num`. Al llegar al límite se sobrescribe el de `timestamp` más antiguo reutilizando su `num`.

### Roles y rutas protegidas

Los roles se definen en un solo sitio: **`src/Components/Roles/Roles.js`** (y su espejo CommonJS `functions/roles.js` para las Cloud Functions). Nunca escribas cadenas de rol a mano en un componente; importa las constantes.

Jerarquía, alineada con el modelo de negocio (cada iglesia es un grupo cerrado):

| Rol | Origen | Puede |
| --- | --- | --- |
| `Pastor` / `Pastora` | se crea en `ViewRegister`; su `uid` es el `groupId` de la iglesia | todo |
| `administrador` | delegado por el pastor desde `ViewUsers` | gestionar usuarios y prédicas |
| `Asistente` | creado por el pastor | solo proyectar contenido |

Dos listas gobiernan el acceso: `ROLES_ADMIN` (gestión: `/ViewUsers`, `/ViewPredica`) y `ROLES_OPERADOR` (proyección: resto de rutas de contenido). `/ViewSelector` y `/ViewGestion` solo exigen sesión iniciada.

`tieneRol(userData, roles)` normaliza antes de comparar: acepta el alias antiguo `"admin"` como `"administrador"` y tolera diferencias de mayúsculas, para no dejar fuera a usuarios ya guardados. **Sin `userData` devuelve `false`**: el acceso nunca se concede por falta de datos.

### Cloud Functions

`functions/index.js` define `crearUsuarioAdmin` y `eliminarUsuarioAdmin` (**API v2**: `onCall(async (request) => …)` con `request.data` y `request.auth`; CommonJS, Node 24). Ojo: con `firebase-functions` v6+ el import raíz `require("firebase-functions")` apunta a v2, no a v1 — la firma vieja `(data, context)` deja `context` en `undefined`.

Ambas validan con el helper `exigirAdmin(request)`, que **lee el rol del documento de Firestore, no del custom claim**: el pastor se registra desde el cliente y su token no lleva claim de rol. La iglesia (`groupId`) se hereda siempre de quien llama y nunca se acepta del cliente; al eliminar se comprueba que el objetivo pertenezca al mismo `groupId`, se impide borrarse a uno mismo y se borra también `users/{uid}/profile.jpg` de Storage.

`ViewUsers` las invoca con `httpsCallable`. **No revertir esto a la creación desde el cliente**: `createUserWithEmailAndPassword` inicia sesión con la cuenta recién creada, de modo que el pastor perdía su sesión y —desde que `ProtectedRoutes` deniega sin rol válido— acababa expulsado a `/VistaNoAutorizada`.

Al borrar se usa `selectedUser.id` (el id del documento, que es el uid) y no `selectedUser.uid`: las fichas creadas por `ViewRegister` y por el flujo antiguo **no guardan campo `uid`**, así que la comprobación anterior fallaba siempre y el borrado nunca se ejecutaba.

La carpeta `functions/` aún no está versionada en git.

**Versiones acopladas** (2026-08-14): `firebase-admin@^14.2.0` + `firebase-functions@^7.3.2`. No las muevas por separado: `firebase-functions` 7.2.5 declara soporte de admin solo hasta `^13`, y desplegar esa combinación falla en el build de Google con `ERESOLVE`, no en local. Al comprobar compatibilidad, consulta los `peerDependencies` de la **versión instalada**, no de `@latest`.

Se eliminó `firebase-functions-test` de las devDependencies: no había ni un test, nadie lo importaba, y su peer `firebase-admin@^8…^13` bloqueaba la actualización de seguridad. Si algún día se escriben pruebas, hay que reinstalarlo y verificar que su rango ya admita la versión de admin en uso.

### Pendiente: el dueño de la iglesia

El `groupId` es el uid del pastor que registró la iglesia. Consecuencia: **si esa cuenta se borra, la iglesia queda sin dueño de forma irreversible**, porque las reglas identifican al dueño con `auth.uid === groupId` y Firebase no reutiliza uids. Por eso `eliminarUsuarioAdmin` impide que alguien se borre a sí mismo. No existe borrado de iglesia ni borrado en cascada de sus datos; si se aborda, conviene antes desacoplar el `groupId` del uid del pastor.

### Custom claims y reglas de RTDB

Las reglas de `database.rules.json` reconocen la pertenencia a una iglesia por `auth.uid === $groupId` (el pastor dueño) o por el custom claim `auth.token.groupId`. Ese claim solo lo asigna `crearUsuarioAdmin` al crear la cuenta, así que **los usuarios creados antes de conectar las Cloud Functions no lo tienen** y las reglas los bloquean.

Para eso existe `sincronizarPermisos`: recorre los usuarios del `groupId` de quien llama y les asigna `role` y `groupId` como claims, saltando a los que ya los tienen (reasignar claims invalida el token). Se dispara desde el botón *"Sincronizar permisos del equipo"* en `ViewUsers`. **Después de ejecutarla, cada usuario debe cerrar sesión y volver a entrar**: el token no recoge claims nuevos hasta que se renueva.

El pastor dueño nunca la necesita, porque las reglas lo reconocen por su uid.

### Aislamiento de datos entre iglesias

Todo el contenido de una iglesia cuelga de su `groupId`, tanto en RTDB (`<nodo>/${groupId}`) como en Firestore:

```
iglesias/{groupId}/predicas/predica1..5
iglesias/{groupId}/tickers/ticker1..6
iglesias/{groupId}/messages/message1..6
```

Construye siempre esas rutas con los helpers de **`src/Components/Firebase/RutasIglesia.js`** (`colIglesia`, `docIglesia`), que además fallan con un mensaje claro si falta el `groupId`. Antes estas colecciones vivían en la raíz con IDs fijos (`predica1`, `ticker1`…), de modo que dos iglesias escribían literalmente sobre el mismo documento.

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

En `storage.rules`, `users/{uid}/**` compara el uid directamente **sin consultar Firestore**: en el registro la foto se sube antes de que exista la ficha del usuario, así que una regla basada en `firestore.get()` haría fallar todo registro nuevo. `imagenes/{groupId}/**` sí resuelve la iglesia con `firestore.get()`. Ambas rutas exigen `contentType` de imagen y menos de 10 MB.

Ojo: las reglas de Storage no invalidan los enlaces de descarga ya generados con `getDownloadURL()`, que llevan un token y siguen sirviendo el archivo a quien lo tenga. Para cortar uno hay que revocar su token.

En Firestore, el `groupId` del solicitante se resuelve leyendo su documento `users/{uid}` con `get()`. En RTDB eso no es posible, así que la pertenencia se comprueba con `auth.uid === $groupId` (el pastor dueño) o con el custom claim `auth.token.groupId`.

**Antes de desplegar las reglas de RTDB**: ese claim solo lo asigna la Cloud Function `crearUsuarioAdmin`. Como `ViewUsers` todavía crea usuarios desde el cliente, los asistentes existentes no lo tienen y las reglas los bloquearían. Hay que migrar `ViewUsers` a la Cloud Function (o asignar el claim a los usuarios ya creados) antes de activarlas.

### Manual para el cliente (`README.md`)

`README.md` no es documentación técnica: es la **presentación del proyecto en GitHub y el manual de uso que se comparte con el cliente**. Está escrito en lenguaje corriente, sin jerga, y solo describe qué hace la aplicación y cómo se usa.

Al terminar cualquier cambio que el usuario final pueda notar, añade una entrada fechada en su sección **Novedades**, contada en términos de lo que cambia para él ("cada iglesia queda separada de las demás"), nunca en términos técnicos ("se movieron las colecciones a subcolecciones por groupId"). Los detalles técnicos van aquí, en `CLAUDE.md`. Si un cambio es puramente interno y no altera nada de lo que el cliente ve, no toca el README.

Nunca describas en el manual una función que no esté terminada sin marcarla como *en preparación*. Hoy el caso pendiente es el botón **Gestión Video** de `ViewGestion`, que navega a `/ViewPanel`: esa ruta no existe y deja la pantalla en blanco.

### Proyección de imágenes y canciones

**Imágenes**: `ControlImagenes` escribe en `displayImage/${groupId}` (`type: "single" | "carousel"`, `images[]`, `interval` en milisegundos) y `ControlDisplay` lo consume rotando con un `setInterval`. La visibilidad va aparte, en `displayVisibleImagen/${groupId}`, con su propio flag `visibleImagen` en `AppContext`. La imagen ocupa la franja central y **sustituye al texto** mientras está encendida; título y ticker conservan sus propios interruptores.

**Canciones**: una canción es `{ titulo, diapositivas: string[], creadoPor, iglesia }`. La letra se pega entera y se parte por renglones en blanco (`partirLetra`, un `split` sobre `/\n\s*\n+/`). Al proyectar una lámina no se usa un canal nuevo: se escribe el texto en `displayMessage` con `display: "mensaje"` y el título en `displayTitulo`, de modo que `ControlDisplay` no necesitó cambios y los interruptores de visibilidad ya funcionan.

### Estilos

Tailwind v4 mediante `@tailwindcss/vite`; **no hay `tailwind.config.js`**. El tema vive en `src/index.css` con `@theme` y tokens `--color-app-*` (`app-dark`, `app-light`, `app-main`, `app-accent`, `app-muted`, `app-border`, `app-success`, `app-error`). Usa siempre esas clases (`text-app-muted`, `bg-app-light`) en vez de colores crudos de Tailwind. También hay utilidades propias: `scrollbar-custom`, `boton-salida`, `form-dark` / `form-light` / `form-dark2` (arreglos de autofill), `animate-menu-open`.

`useScreenType()` clasifica la pantalla en `proyector` | `desktop` | `movil`; `ControlDisplay` usa esa clave para elegir tamaños tipográficos y velocidad del ticker. En los paneles, `isDesktop` (de `AppContext`) decide entre botones de visibilidad en línea o el `ModalVisibilidad`.

## Convenciones

- Código, comentarios y nombres de componentes en español. Mantener ese estilo.
- Las vistas viven en `src/Views/<Nombre>/<Nombre>.jsx` y deben reexportarse en `src/Views/index.js` para poder usarse en `App.jsx`.
- Las rutas distinguen mayúsculas y se escriben tal cual (`/ViewGestion`, `/ViewSelector`, `/VOXDEI`). Ya hay al menos un `navigate("/Viewgestion")` mal escrito en `ViewUsers` que no coincide con ninguna ruta; conviene verificar el destino al copiar navegaciones.
- `ViewGestion.jsx` exporta una función llamada internamente `ViewSelector`, distinta de la vista `ViewSelector`. No confundirlas: `ViewSelector` es la pantalla de entrada (abre el visor y cierra sesión), `ViewGestion` es la cuadrícula de opciones.
- Regla de ESLint activa: `no-unused-vars` con `varsIgnorePattern: '^[A-Z_]'`.
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
4. `ColorPicker.jsx` quedó huérfano tras el panel nuevo de estilos.
5. `src/Components/Hooks/useScreenType.js` aparece modificado, pero **ese cambio ya estaba antes** de esta jornada.
