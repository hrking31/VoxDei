import { useState } from "react";
import Picker from "@emoji-mart/react";
import data from "@emoji-mart/data";

export default function EmojiButton({ onSelect }) {
  const [showPicker, setShowPicker] = useState(false);

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      {/* Botón/emoji */}
      <button
        type="button"
        onClick={() => setShowPicker(!showPicker)}
        style={{
          fontSize: "24px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
        }}
      >
        😀
      </button>

      {/* Picker flotante */}
      {showPicker && (
        <div
          style={{
            position: "absolute",
            top: "40px",
            left: "20%", // se coloca en el centro horizontal
            transform: "translateX(-80%)",
            zIndex: 9000,
          }}
        >
          <Picker
            data={data}
            onEmojiSelect={(emoji) => {
              onSelect(emoji.native);
              setShowPicker(false); // se cierra al seleccionar
            }}
          />
        </div>
      )}
    </div>
  );
}
