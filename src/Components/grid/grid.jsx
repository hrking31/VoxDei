import React from "react";

const GridExample = () => {
  return (
    <div className="p-6 bg-gray-900 min-h-screen text-white">
      <h2 className="text-2xl font-bold mb-4 text-center">
        Ejemplo de Grid con 12 columnas
      </h2>

      <div className="grid grid-cols-12 gap-3">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="bg-blue-600 border border-white text-center py-6 font-semibold text-lg rounded col-span-12 sm:col-span-6 md:col-span-4 lg:col-span-3"
          >
            Div {i + 1}
          </div>
        ))}
      </div>
    </div>
  );
};

export default GridExample;
