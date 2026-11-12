import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";

const fb = vi.hoisted(() => ({
  setDoc: vi.fn(async () => {}),
  uploadBytes: vi.fn(async () => {}),
}));

vi.mock("../../Components/Firebase/Firebase.js", () => ({ auth: { currentUser: {} }, db: {}, storage: {} }));
vi.mock("firebase/firestore", () => ({
  doc: (...partes) => partes.slice(1).join("/"),
  getDoc: async () => ({ exists: () => false }),
  setDoc: fb.setDoc,
}));
vi.mock("firebase/auth", () => ({ sendEmailVerification: async () => {} }));
vi.mock("firebase/storage", () => ({
  ref: (_storage, ruta) => ruta,
  uploadBytes: fb.uploadBytes,
  getDownloadURL: async () => "https://foto",
}));
vi.mock("../../Components/ComprimirImagen/ComprimirImagen.js", () => ({
  LADO_PERFIL: 512,
  comprimirImagen: async (archivo) => archivo,
}));

import ViewRegister from "./ViewRegister.jsx";
import { montar } from "../../Components/Navegacion/pruebas.utils.jsx";

const CLAVE = "Camino#Paz2026";

function abrir() {
  const auth = {
    user: null,
    userData: null,
    loading: false,
    setLoading: vi.fn(),
    setUserData: vi.fn(),
    signup: vi.fn(async () => ({ user: { uid: "nuevo" } })),
    login: vi.fn(),
  };
  return montar(<ViewRegister />, { ruta: "/ViewRegister", auth });
}

function escribir(campo, valor) {
  fireEvent.change(screen.getByPlaceholderText(campo), { target: { value: valor } });
}

function elegirGenero(genero) {
  fireEvent.click(screen.getByRole("button", { name: "Selecciona un género" }));
  fireEvent.click(screen.getByText(genero));
}

function llenarObligatorios({ sin } = {}) {
  if (sin !== "Género") elegirGenero("Masculino");
  const valores = {
    "Nombre de la iglesia": "Camino de Paz",
    "Nombre completo": "Ana Gómez",
    "Correo electrónico": "ana@ejemplo.com",
    Contraseña: CLAVE,
  };
  for (const [campo, valor] of Object.entries(valores)) {
    if (campo !== sin) escribir(campo, valor);
  }
}

const crear = () => fireEvent.click(screen.getByRole("button", { name: /Crear iglesia/ }));

describe("ViewRegister", () => {
  beforeEach(() => {
    fb.setDoc.mockClear();
    fb.uploadBytes.mockClear();
    URL.createObjectURL = vi.fn(() => "blob:vista");
  });

  it("es la vista publicada: sin campo de logo ni sigla de la iglesia", () => {
    abrir();
    expect(screen.queryByTitle("Logo de la iglesia")).toBeNull();
    expect(screen.queryByPlaceholderText(/sigla/i)).toBeNull();
  });

  it("sin logo arriba: VOXDEI va de marca de agua, detrás de todo", () => {
    const { container } = abrir();
    expect(screen.getByRole("heading", { name: "Registrar Iglesia" })).toBeTruthy();
    const marca = container.querySelector("[data-marca-agua]");
    expect(marca.getAttribute("aria-hidden")).toBe("true");
    expect(marca.className).toContain("marca-haz");
    // Todas las imágenes de la vista son las del haz (rayos y polvo): ningún logo.
    const imagenes = [...container.querySelectorAll("img")];
    expect(imagenes).toHaveLength(2);
    expect(imagenes.every((img) => marca.contains(img) && img.getAttribute("alt") === "")).toBe(true);
    expect(container.firstElementChild.className).toContain("isolate");
  });

  it("sin foto crea la iglesia igual: photo vacía (se ven las iniciales)", async () => {
    const { auth } = abrir();
    llenarObligatorios();
    crear();
    await waitFor(() => expect(screen.getByTestId("ruta").textContent).toBe("/ViewSelector"));
    expect(auth.signup).toHaveBeenCalledWith("ana@ejemplo.com", CLAVE);
    expect(fb.uploadBytes).not.toHaveBeenCalled();
    expect(fb.setDoc).toHaveBeenCalledWith(
      "users/nuevo",
      expect.objectContaining({ churchName: "Camino de Paz", name: "Ana Gómez", photo: "", gender: "Masculino", role: "Pastor", groupId: "nuevo" })
    );
  });

  it("con foto y género Femenino sube la foto y queda como Pastora", async () => {
    const { container } = abrir();
    llenarObligatorios({ sin: "Género" });
    elegirGenero("Femenino");
    const foto = new File(["x"], "yo.jpg", { type: "image/jpeg" });
    fireEvent.change(container.querySelector("#photoInput"), { target: { files: [foto] } });
    crear();
    await waitFor(() => expect(fb.setDoc).toHaveBeenCalled());
    expect(fb.uploadBytes).toHaveBeenCalledWith("users/nuevo/profile.jpg", foto);
    expect(fb.setDoc).toHaveBeenCalledWith(
      "users/nuevo",
      expect.objectContaining({ photo: "https://foto", gender: "Femenino", role: "Pastora" })
    );
  });

  it("exige nombre de la iglesia, nombre, género, correo y contraseña", () => {
    for (const falta of ["Nombre de la iglesia", "Nombre completo", "Género", "Correo electrónico", "Contraseña"]) {
      const { auth, app, unmount } = abrir();
      llenarObligatorios({ sin: falta });
      crear();
      expect(app.showNotif).toHaveBeenCalledWith("error", "Por favor completa todos los campos.");
      expect(auth.signup).not.toHaveBeenCalled();
      unmount();
    }
  });
});
