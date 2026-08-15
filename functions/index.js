const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const { ROLES, esAdmin, normalizarRol } = require("./roles");

admin.initializeApp();

// Comprueba que quien llama manda en su iglesia y devuelve sus datos.
//
// El rol se lee del documento de Firestore, no del custom claim del token: el
// pastor que se registra desde la app se crea en el cliente y su token no lleva
// claim de rol, así que confiar solo en el claim lo dejaría fuera.
async function exigirAdmin(request) {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
  }

  const snap = await admin
    .firestore()
    .collection("users")
    .doc(request.auth.uid)
    .get();

  if (!snap.exists) {
    throw new HttpsError("permission-denied", "Usuario no registrado.");
  }

  const solicitante = snap.data();

  if (!esAdmin(solicitante.role)) {
    throw new HttpsError(
      "permission-denied",
      "Solo el pastor o un administrador pueden gestionar usuarios.",
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

// Función para CREAR un usuario dentro de la iglesia de quien llama
exports.crearUsuarioAdmin = onCall(async (request) => {
  const solicitante = await exigirAdmin(request);

  const { email, password, name, gender } = request.data || {};
  const role = normalizarRol(request.data?.role);

  if (!email || !password || !name || !role) {
    throw new HttpsError(
      "invalid-argument",
      "Faltan datos: nombre, correo, contraseña y rol son obligatorios.",
    );
  }

  if (!ROLES.includes(role)) {
    throw new HttpsError("invalid-argument", `Rol no válido: ${role}`);
  }

  try {
    // Crear el usuario en Firebase Authentication
    const userRecord = await admin.auth().createUser({
      email: email,
      password: password,
      displayName: name,
    });

    // Guardar sus datos y permisos en Firestore.
    // La iglesia se hereda de quien crea, nunca se acepta del cliente: así
    // nadie puede colar un usuario en la iglesia de otro pastor.
    await admin.firestore().collection("users").doc(userRecord.uid).set({
      uid: userRecord.uid,
      name,
      email,
      role,
      gender,
      groupId: solicitante.groupId,
      churchName: solicitante.churchName || null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // (Custom Claims) para que las reglas de seguridad reconozcan rol e iglesia
    await admin.auth().setCustomUserClaims(userRecord.uid, {
      role,
      groupId: solicitante.groupId,
    });

    return { success: true, message: `Usuario ${name} creado con éxito.` };
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", error.message);
  }
});

// Reparte los permisos internos (custom claims) a los usuarios de la iglesia
// que aún no los tengan.
//
// Hace falta para los usuarios creados antes, desde el navegador: sin estos
// permisos en su token, las reglas de la Realtime Database los bloquean.
// Basta ejecutarla una vez; después cada usuario debe cerrar sesión y volver a
// entrar para que su token recoja los permisos nuevos.
exports.sincronizarPermisos = onCall(async (request) => {
  const solicitante = await exigirAdmin(request);

  const usuarios = await admin
    .firestore()
    .collection("users")
    .where("groupId", "==", solicitante.groupId)
    .get();

  let actualizados = 0;

  for (const documento of usuarios.docs) {
    const rol = normalizarRol(documento.data().role);

    try {
      const cuenta = await admin.auth().getUser(documento.id);
      const claims = cuenta.customClaims || {};

      // Solo se toca a quien le falte algo: reasignar claims invalida el token.
      if (claims.role === rol && claims.groupId === solicitante.groupId) {
        continue;
      }

      await admin.auth().setCustomUserClaims(documento.id, {
        ...claims,
        role: rol,
        groupId: solicitante.groupId,
      });

      actualizados++;
    } catch (error) {
      // Una ficha sin cuenta de acceso no debe frenar al resto.
      console.warn(`No se pudo actualizar ${documento.id}:`, error.message);
    }
  }

  return {
    success: true,
    actualizados,
    total: usuarios.size,
    message:
      actualizados === 0
        ? "Todos los usuarios ya tenían sus permisos al día."
        : `Se actualizaron ${actualizados} de ${usuarios.size} usuarios. ` +
          "Cada uno debe cerrar sesión y volver a entrar.",
  };
});

// Función para ELIMINAR un usuario de la iglesia de quien llama
exports.eliminarUsuarioAdmin = onCall(async (request) => {
  const solicitante = await exigirAdmin(request);

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
    const userRef = admin.firestore().collection("users").doc(uid);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      throw new HttpsError("not-found", "El usuario no existe.");
    }

    // El objetivo debe ser de la misma iglesia: nadie borra usuarios ajenos.
    if (userSnap.data().groupId !== solicitante.groupId) {
      throw new HttpsError(
        "permission-denied",
        "Ese usuario no pertenece a tu iglesia.",
      );
    }

    // Borrar la foto de perfil. Va en un try aparte: que no exista no debe
    // impedir eliminar la cuenta.
    try {
      await admin.storage().bucket().file(`users/${uid}/profile.jpg`).delete();
    } catch (error) {
      console.warn(`Sin foto que borrar para ${uid}:`, error.message);
    }

    // Borrar de Auth
    await admin.auth().deleteUser(uid);
    // Borrar de Firestore
    await userRef.delete();

    return { success: true, message: "Usuario eliminado correctamente." };
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", error.message);
  }
});
