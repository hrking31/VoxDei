export default function WhatsAppButton({ message }) {
  const textoAEnviar = Array.isArray(message)
    ? message
        .map((item) => {
          if (item.tipo === "titulo") return `📘 ${item.contenido}\n`;
          if (item.tipo === "versiculo")
            return `📖 ${item.contenido?.cita || ""}: ${
              item.contenido?.texto || ""
            }\n`;
          return `💬 ${item.contenido}\n`;
        })
        .join("\n")
    : message;

  const url = `https://wa.me/?text=${encodeURI(textoAEnviar)}`;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-center"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="25"
        height="25"
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
        className="text-green-600"
      >
        <path d="M20.52 3.48A11.88 11.88 0 0012 .03C5.37.03.03 5.37.03 12c0 2.11.55 4.17 1.6 5.99L.03 24l6.35-1.66A11.94 11.94 0 0012 24c6.63 0 11.97-5.34 11.97-12 0-3.2-1.25-6.2-3.45-8.52zM12 21.5c-1.41 0-2.79-.36-4.02-1.04l-.29-.16-3.77.99.99-3.68-.19-.3A9.5 9.5 0 012.5 12C2.5 6.47 6.47 2.5 12 2.5S21.5 6.47 21.5 12 17.53 21.5 12 21.5z" />
        <path d="M17.1 14.1c-.3-.15-1.8-.9-2.07-1.01-.27-.12-.47-.15-.68.15s-.78 1.01-.96 1.22c-.18.21-.35.24-.65.08-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.78-1.66-2.08-.17-.3-.02-.46.13-.61.13-.13.3-.33.45-.5.15-.17.2-.28.3-.47.1-.18.05-.34-.02-.49-.07-.15-.68-1.64-.93-2.24-.24-.58-.49-.5-.67-.51l-.56-.01c-.18 0-.47.07-.72.34-.25.27-.96.95-.96 2.31 0 1.36.99 2.68 1.13 2.86.14.18 1.95 3 4.73 4.23 3.28 1.45 3.28 0.97 3.87.91.59-.06 1.9-.77 2.17-1.52.27-.75.27-1.39.19-1.52-.08-.13-.3-.2-.6-.35z" />
      </svg>
    </a>
  );
}
