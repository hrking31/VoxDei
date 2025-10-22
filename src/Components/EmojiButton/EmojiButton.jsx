import { useState } from "react";
import Picker from "@emoji-mart/react";
import data from "@emoji-mart/data";

export default function EmojiButton({ onSelect, disabled }) {
  const [showPicker, setShowPicker] = useState(false);

  // Detectar si es móvil
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

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
        disabled={disabled}
      >
        😀
      </button>

      {/* Picker flotante */}
      {showPicker && (
        <div
          style={{
            position: isMobile ? "fixed" : "absolute",
            top: isMobile ? "auto" : "40px",
            bottom: isMobile ? "20px" : "auto",
            left: isMobile ? "50%" : "20%",
            transform: isMobile ? "translateX(-50%)" : "translateX(-80%)",
            zIndex: 9000,
            width: isMobile ? "90%" : "auto",
            borderRadius: isMobile ? "12px" : "0",
            boxShadow: isMobile ? "0 4px 12px rgba(0,0,0,0.6)" : "none",
            background: "#2c2e30",
            colorScheme: "dark",
          }}
        >
          <Picker
            data={data}
            onEmojiSelect={(emoji) => {
              onSelect(emoji.native);
              setShowPicker(false);
            }}
          />
        </div>
      )}
    </div>
  );
}

