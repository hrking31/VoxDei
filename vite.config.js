import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: "0.0.0.0",
  },
  test: {
    // Navegador simulado para probar componentes de React.
    environment: "jsdom",
    // Este PC se apagó con pantalla azul (22-10-2026) cuando las pruebas de
    // otro proyecto abrieron un proceso por hilo (16). Nunca más de 3, y aquí
    // 2: medido el 09-11-2026, con 3 los hilos no alcanzaban a arrancar (cargar
    // jsdom en paralelo satura este PC) y tardaba 98 s; con 2, 14 s y sin fallos.
    maxWorkers: 2,
    // Hilos en vez de procesos: en Windows pesan menos.
    pool: "threads",
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules") && id.includes("firebase")) {
            return "firebase";
          }
        },
      },
    },
  },
});
