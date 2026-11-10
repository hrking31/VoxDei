// Dibujos animados de las fichas de la entrada. Con «reducir movimiento»
// quedan quietos (motion-safe). Colores y animaciones salen del tema.

// La pantalla del templo va mostrando renglones; el haz pulsa y el foco brilla.
export function IlustracionProyectar() {
  return (
    <span aria-hidden="true" className="relative block h-full overflow-hidden rounded-xl bg-app-noche">
      <span className="absolute left-1/5 right-1/5 top-1/10 flex h-2/5 flex-col justify-center gap-1 rounded-md border border-app-haz/50 border-t-4 border-t-app-main bg-app-haz/10 px-3">
        <i className="block h-0.5 w-4/5 origin-left rounded bg-app-texto motion-safe:animate-renglon" />
        <i className="block h-0.5 w-3/5 origin-left rounded bg-app-texto retraso-1 motion-safe:animate-renglon" />
        <i className="block h-0.5 w-3/4 origin-left rounded bg-app-texto retraso-2 motion-safe:animate-renglon" />
      </span>
      <span className="absolute bottom-1/6 left-1/5 right-1/5 top-1/2 opacity-80 haz-proyector motion-safe:animate-haz" />
      <span className="absolute bottom-1/10 left-1/2 -ml-1.5 h-3 w-3 rounded-full bg-app-texto motion-safe:animate-foco" />
    </span>
  );
}

// Un celular en el que alguien escribe y del que salen mensajes.
export function IlustracionAdministrar() {
  return (
    <span aria-hidden="true" className="relative grid h-full place-items-center overflow-hidden rounded-xl bg-app-noche">
      <span className="flex h-14 w-9 flex-col gap-1 rounded-lg border-2 border-app-border bg-app-light p-1.5">
        <i className="block h-1 w-full rounded bg-app-border motion-safe:animate-tecleo" />
        <i className="block h-1 w-3/5 rounded bg-app-border retraso-1 motion-safe:animate-tecleo" />
        <i className="block h-1 w-4/5 rounded bg-app-border retraso-2 motion-safe:animate-tecleo" />
        <span className="mt-auto flex gap-0.5">
          <i className="h-1 flex-1 rounded-sm bg-app-border" />
          <i className="h-1 flex-1 rounded-sm bg-app-main" />
          <i className="h-1 flex-1 rounded-sm bg-app-border" />
        </span>
      </span>
      <span className="absolute left-1/2 top-1/2 ml-2 h-2.5 w-5 opacity-0 burbuja-mensaje bg-app-main motion-safe:animate-enviar motion-reduce:opacity-100 motion-reduce:translate-x-6 motion-reduce:-translate-y-4" />
      <span className="absolute left-1/2 top-1/2 ml-2 h-2.5 w-4 opacity-0 burbuja-mensaje bg-app-texto retraso-3 motion-safe:animate-enviar" />
      <span className="absolute left-1/2 top-1/2 ml-2 h-2.5 w-6 opacity-0 burbuja-mensaje bg-app-main retraso-4 motion-safe:animate-enviar" />
    </span>
  );
}
