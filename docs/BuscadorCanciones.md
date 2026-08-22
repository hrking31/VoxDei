# Buscador de canciones y costo en Firebase

> Análisis del 22 de agosto de 2026, guardado tal cual se entregó, para
> retomarlo más adelante. Nada de lo que aquí se propone está aplicado todavía,
> salvo lo que se indique expresamente al final.

## Cómo funciona hoy el buscador

**El buscador no consulta Firebase.** Al entrar a Canciones, la app descarga
**el catálogo entero** y lo guarda en memoria. Lo que se escribe en la caja solo
filtra esa lista ya descargada:

```js
onSnapshot(collection(db, CANCIONES), …)   // trae todo
canciones.filter(c => normalizar(c.titulo).includes(normalizar(busqueda)))
```

Consecuencia: **escribir en el buscador cuesta cero**. Se puede teclear todo el
día sin gastar un solo acceso.

## Dónde está el costo real

Firestore cobra **por documento leído**, no por consulta ni por tamaño. Y aquí
hay dos cosas que se suman:

1. **Cada entrada a Canciones lee todo el catálogo.** Con 200 canciones son 200
   lecturas. Con 1.000, mil.
2. **El catálogo es global**, compartido por todas las iglesias. Es lo único en
   la app que crece sin límite propio: cuantas más iglesias usen VOXDEI, más
   caro sale entrar a esa pantalla para todos.

Y algo introducido ese mismo día: al separar en tres pantallas, **ir a proyectar
y volver desmonta y vuelve a montar el catálogo**. Antes era el mismo componente
y no se recargaba. El SDK amortigua parte con su caché en memoria, pero el
patrón es peor que antes.

Hoy, con pocas canciones, esto es irrelevante: la capa gratuita son 50.000
lecturas diarias. El problema aparece cuando el catálogo llegue a cientos y haya
varias iglesias.

## Qué hacer, en orden

| Cambio | Esfuerzo | Qué ahorra |
| --- | --- | --- |
| **Caché en disco del navegador** | 3 líneas en `Firebase.js` | Las visitas repetidas se sirven de la máquina, sin volver a leer |
| **Dejar de escuchar en vivo** el catálogo (`getDocs` en vez de `onSnapshot`) | pequeño | Una lectura por visita en vez de una suscripción abierta |
| **Guardar la letra aparte** del título | medio | No baja el número de lecturas, pero sí lo que viaja por la red |
| **Paginar y buscar por prefijo en el servidor** | grande | Solo se lee lo que se ve; imprescindible con miles de canciones |

Los dos primeros son baratos y seguros, y resuelven el 90% del problema. El
cuarto tiene una pega que conviene saber: Firestore **solo sabe buscar por el
comienzo** del título, no «que contenga». Buscar «gracia» no encontraría
«Sublime gracia». Para búsqueda real por cualquier palabra haría falta guardar
un campo con las palabras sueltas, o un servicio aparte.

Recomendación: aplicar **los dos primeros** y dejar la paginación para cuando el
catálogo lo pida.

---

## Notas técnicas para retomarlo

### Caché en disco

`Firebase.js` usa hoy `getFirestore(app)`, que deja la caché **solo en
memoria**: se pierde al recargar la página. La forma actual de activar la caché
en disco es sustituirlo por `initializeFirestore` con `persistentLocalCache`.
Ojo con las pestañas: la app abre la proyección en una ventana aparte, así que
hace falta el gestor de varias pestañas.

### Por qué el contador de usos no puede vivir en la canción

`firestore.rules` permite `update` sobre `canciones/{id}` solo si
`resource.data.creadoPor == miGroupId()`. Un contador global dentro del
documento de la canción haría que cualquier iglesia tuviera que escribir en
canciones ajenas, lo que las reglas rechazan. Por eso el conteo de uso vive del
lado de la iglesia, en `iglesias/{groupId}/repertorio/actual`, campo `usos`.

### Búsqueda por prefijo, si algún día se hace en el servidor

Haría falta guardar en cada canción un campo con el título normalizado (sin
tildes ni mayúsculas) y consultar con un rango:

```js
where("tituloNormalizado", ">=", q)
where("tituloNormalizado", "<=", q + "")
limit(20)
```

Eso solo encuentra por el comienzo. Para buscar por cualquier palabra, guardar
además un array con las palabras del título y usar `array-contains`.
