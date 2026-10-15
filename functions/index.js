const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getAuth } = require("firebase-admin/auth");
const { getStorage } = require("firebase-admin/storage");
const { getDatabase } = require("firebase-admin/database");
const {
  ROLES,
  ROL_POR_DEFECTO,
  esPastor,
  normalizarRol,
} = require("./roles");

// Cada servicio se importa por su cuenta: firebase-admin 14 eliminó la forma
// antigua (`admin.firestore()`, `admin.auth()`, `admin.storage()`), que quedaba
// en `undefined` y hacía fallar toda llamada con
// "TypeError: admin.firestore is not a function".
initializeApp();

const db = getFirestore();

// Comprueba que quien llama es pastor o pastora de su iglesia.
//
// El rol se lee del documento de Firestore, no del custom claim del token: el
// pastor que se registra desde la app se crea en el cliente y su token no lleva
// claim de rol, así que confiar solo en el claim lo dejaría fuera.
async function exigirPastor(request) {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
  }

  const snap = await db.collection("users").doc(request.auth.uid).get();

  if (!snap.exists) {
    throw new HttpsError("permission-denied", "Usuario no registrado.");
  }

  const solicitante = snap.data();

  // El administrador quedó fuera de la gestión de cuentas a propósito.
  if (!esPastor(solicitante.role)) {
    throw new HttpsError(
      "permission-denied",
      "Solo el pastor o la pastora pueden gestionar las cuentas.",
    );
  }

  // Sin iglesia asignada no se puede crear ni borrar a nadie.
  if (!solicitante.groupId) {
    throw new HttpsError(
      "failed-precondition",
      "Tu usuario no pertenece a ninguna iglesia.",
    );
  }

  return { uid: request.auth.uid, ...solicitante };
}

// Devuelve la ficha del usuario sobre el que se quiere actuar, comprobando que
// existe y que pertenece a la misma iglesia de quien llama.
async function exigirObjetivoDeMiIglesia(uid, solicitante) {
  const ref = db.collection("users").doc(uid);
  const snap = await ref.get();

  if (!snap.exists) {
    throw new HttpsError("not-found", "El usuario no existe.");
  }

  const objetivo = snap.data();

  if (objetivo.groupId !== solicitante.groupId) {
    throw new HttpsError(
      "permission-denied",
      "Ese usuario no pertenece a tu iglesia.",
    );
  }

  return { ref, objetivo };
}

// Función para CREAR un usuario dentro de la iglesia de quien llama
exports.crearUsuarioAdmin = onCall(async (request) => {
  const solicitante = await exigirPastor(request);

  const { email, password, name, gender } = request.data || {};

  // Si no se indica rol, se crea como Asistente, que es el caso habitual.
  const role = request.data?.role
    ? normalizarRol(request.data.role)
    : ROL_POR_DEFECTO;

  if (!email || !password || !name) {
    throw new HttpsError(
      "invalid-argument",
      "Faltan datos: nombre, correo y contraseña son obligatorios.",
    );
  }

  // Solo se aceptan los tres roles de la aplicación; cualquier otra cosa que
  // llegue del cliente se rechaza.
  if (!ROLES.includes(role)) {
    throw new HttpsError("invalid-argument", `Rol no válido: ${role}`);
  }

  // Una iglesia tiene como mucho un pastor y una pastora, y solo quien la
  // registró puede dar de alta a su pareja pastoral. Todo lo demás es
  // Asistente. Se comprueba aquí y no solo en la pantalla: el formulario oculta
  // la opción, pero una llamada directa podría pedirla igual.
  if (esPastor(role)) {
    if (solicitante.uid !== solicitante.groupId) {
      throw new HttpsError(
        "permission-denied",
        "Solo quien registró la iglesia puede dar de alta al pastor o pastora.",
      );
    }

    const yaExiste = await db
      .collection("users")
      .where("groupId", "==", solicitante.groupId)
      .where("role", "==", role)
      .limit(1)
      .get();

    if (!yaExiste.empty) {
      throw new HttpsError(
        "failed-precondition",
        `Esta iglesia ya tiene ${role}.`,
      );
    }
  }

  try {
    // Crear el usuario en Firebase Authentication
    const userRecord = await getAuth().createUser({
      email: email,
      password: password,
      displayName: name,
    });

    // Guardar sus datos y permisos en Firestore.
    // La iglesia se hereda de quien crea, nunca se acepta del cliente: así
    // nadie puede colar un usuario en la iglesia de otro pastor.
    await db.collection("users").doc(userRecord.uid).set({
      uid: userRecord.uid,
      name,
      email,
      role,
      gender,
      groupId: solicitante.groupId,
      churchName: solicitante.churchName || null,
      createdAt: FieldValue.serverTimestamp(),
    });

    // (Custom Claims) para que las reglas de seguridad reconozcan rol e iglesia
    await getAuth().setCustomUserClaims(userRecord.uid, {
      role,
      groupId: solicitante.groupId,
    });

    return { success: true, message: `Usuario ${name} creado con éxito.` };
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", error.message);
  }
});

// Función para ELIMINAR un usuario de la iglesia de quien llama.
//
// El pastor y la pastora eliminan operadores. A la pareja pastoral solo la
// elimina el dueño, y al dueño no lo elimina nadie.
exports.eliminarUsuarioAdmin = onCall(async (request) => {
  const solicitante = await exigirPastor(request);

  const { uid } = request.data || {};

  if (!uid) {
    throw new HttpsError("invalid-argument", "Falta el uid del usuario.");
  }

  if (uid === solicitante.uid) {
    throw new HttpsError(
      "failed-precondition",
      "No puedes eliminar tu propia cuenta.",
    );
  }

  try {
    const { ref: userRef, objetivo } = await exigirObjetivoDeMiIglesia(
      uid,
      solicitante,
    );

    // El dueño es intocable: su uid ES el groupId de la iglesia, y Firebase no
    // reutiliza uids, así que la iglesia quedaría huérfana para siempre.
    if (uid === objetivo.groupId) {
      throw new HttpsError(
        "failed-precondition",
        "No se puede eliminar la cuenta que registró la iglesia.",
      );
    }

    // A un pastor o pastora solo lo elimina el dueño: entre pares, ninguno
    // manda sobre el otro.
    if (esPastor(objetivo.role) && solicitante.uid !== solicitante.groupId) {
      throw new HttpsError(
        "permission-denied",
        "Solo quien registró la iglesia puede eliminar a un pastor o pastora.",
      );
    }

    // Borrar la foto de perfil. Va en un try aparte: que no exista no debe
    // impedir eliminar la cuenta.
    try {
      await getStorage().bucket().file(`users/${uid}/profile.jpg`).delete();
    } catch (error) {
      console.warn(`Sin foto que borrar para ${uid}:`, error.message);
    }

    // Borrar de Auth
    await getAuth().deleteUser(uid);
    // Borrar de Firestore
    await userRef.delete();

    return { success: true, message: "Usuario eliminado correctamente." };
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", error.message);
  }
});

// Nodos de RTDB que cuelgan de `<nodo>/${groupId}`. Si se agrega uno nuevo en
// el cliente, hay que sumarlo aquí o sobrevivirá al borrado de la iglesia.
const NODOS_PROYECCION = [
  "displayTitulo",
  "displayMessage",
  "displayVersiculo",
  "displayTicker",
  "displayImage",
  "displayVideo",
  "displayVisibleTitulo",
  "displayVisibleTexto",
  "displayVisibleTicker",
  "displayVisibleImagen",
  "displayVisibleVideo",
  "speedTicker",
];

// Minutos que pueden pasar desde que la persona escribió su contraseña.
const MINUTOS_CONFIRMACION = 5;

// Borra la cuenta de una persona: sus archivos de Storage, su ficha y su
// cuenta de Auth. La cuenta va al final: si algo falla antes, la sesión sigue
// viva y se puede reintentar.
async function borrarPersona(uid) {
  await getStorage().bucket().deleteFiles({ prefix: `users/${uid}/` });
  await db.collection("users").doc(uid).delete();

  try {
    await getAuth().deleteUser(uid);
  } catch (error) {
    // Ya borrada en un intento anterior: no es un fallo.
    if (error.code !== "auth/user-not-found") throw error;
  }
}

// Borra una iglesia entera. Solo se llama cuando se va su dueño, porque su uid
// ES el groupId y la iglesia no puede seguir sin él.
async function borrarIglesia(groupId) {
  // Los demás miembros primero; el dueño lo borra quien llama, al final.
  const miembros = await db
    .collection("users")
    .where("groupId", "==", groupId)
    .get();

  for (const miembro of miembros.docs) {
    if (miembro.id !== groupId) await borrarPersona(miembro.id);
  }

  // Las canciones se quedan en el catálogo común, sin dueño: otras iglesias
  // pueden tenerlas en sus listas. Sin `creadoPor` nadie puede editarlas.
  const canciones = await db
    .collection("canciones")
    .where("creadoPor", "==", groupId)
    .get();

  const escritor = db.bulkWriter();
  canciones.docs.forEach((cancion) =>
    escritor.update(cancion.ref, { creadoPor: null, iglesia: "" }),
  );

  const imagenes = await db
    .collection("imagenes")
    .where("groupId", "==", groupId)
    .get();
  imagenes.docs.forEach((imagen) => escritor.delete(imagen.ref));
  await escritor.close();

  await getStorage()
    .bucket()
    .deleteFiles({ prefix: `imagenes/${groupId}/` });

  // Prédicas, tickers, mensajes, repertorio y estilos.
  await db.recursiveDelete(db.collection("iglesias").doc(groupId));

  const nodos = {};
  NODOS_PROYECCION.forEach((nodo) => {
    nodos[`${nodo}/${groupId}`] = null;
  });
  await getDatabase().ref().update(nodos);
}

// Función para que cualquier persona ELIMINE SU PROPIA CUENTA (exigencia de
// Google Play).
//
// - Operador o pareja pastoral: se borra solo su cuenta; la iglesia sigue.
// - Dueño (uid === groupId): se borra la iglesia completa.
// - Sin ficha (registro a medias): se borra lo que haya de la cuenta.
//
// La pantalla pide la contraseña justo antes (reauthenticateWithCredential),
// y aquí se comprueba con `auth_time`: un token robado o una sesión olvidada
// abierta no basta para borrar una iglesia.
exports.eliminarMiCuenta = onCall({ timeoutSeconds: 300 }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
  }

  const { uid, token } = request.auth;
  const segundosDesdeLogin = Date.now() / 1000 - token.auth_time;

  if (segundosDesdeLogin > MINUTOS_CONFIRMACION * 60) {
    throw new HttpsError(
      "unauthenticated",
      "Vuelve a escribir tu contraseña para confirmar.",
    );
  }

  try {
    const ficha = await db.collection("users").doc(uid).get();
    const esDueno = ficha.exists && ficha.data().groupId === uid;

    if (esDueno) await borrarIglesia(uid);
    await borrarPersona(uid);

    return {
      success: true,
      message: esDueno
        ? "La iglesia y tu cuenta fueron eliminadas."
        : "Tu cuenta fue eliminada.",
    };
  } catch (error) {
    console.error(`Error al eliminar la cuenta ${uid}:`, error);
    throw new HttpsError(
      "internal",
      "No se pudo terminar de eliminar la cuenta. Inténtalo de nuevo.",
    );
  }
});
