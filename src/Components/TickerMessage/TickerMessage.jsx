
export default function TickerMessage({ message }) {
  return (
    <div className="w-full fixed bottom-0 z-50 bg-black py-2 overflow-hidden">
      <div className="flex animate-marquee">
        <span className="flex whitespace-nowrap">
          <span className="text-yellow-300 font-bold text-2xl px-4">
            {message}
          </span>
          <span className="text-yellow-300 font-bold text-2xl px-4">
            {message}
          </span>
        </span>
      </div>
    </div>
  );
}
