export default function Loading({ text = "Cargando..." }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/40">
      <div className="w-12 h-12 border-4 border-app-light border-t-app-main rounded-full animate-spin mb-4"></div>
      <p className="text-app-light font-medium text-lg">{text}</p>
    </div>
  );
}
