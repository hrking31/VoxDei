export default function Footer() {
  return (
    <footer className="w-full py-4 mt-auto">
      <div className="max-w-5xl mx-auto flex flex-col  items-center justify-between gap-2 px-4 text-center sm:text-left">
        <p className="text-xs sm:text-sm text-gray-400">
          © {new Date().getFullYear()} VOXDEI — Hecho con amor y café
        </p>

        <p className="text-[11px] sm:text-xs text-gray-500">
          Desarrollado por Hernando Rey
        </p>
      </div>
    </footer>
  );
}
