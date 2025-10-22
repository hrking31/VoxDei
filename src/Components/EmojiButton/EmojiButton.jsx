import { useState } from "react";
import Picker from "@emoji-mart/react";
import data from "@emoji-mart/data";

export default function EmojiButton({ onSelect, disabled }) {
  const [showPicker, setShowPicker] = useState(false);

  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  return (
    <div className="relative inline-block">
      {/* Botón */}
      <button
        type="button"
        onClick={() => setShowPicker(!showPicker)}
        className={`text-2xl bg-transparent border-none cursor-pointer transition-opacity 
          ${disabled ? "opacity-40 cursor-not-allowed" : "hover:opacity-80"}`}
        disabled={disabled}
      >
        {showPicker ? "😎" : "😀"}
      </button>

      {/* Picker flotante */}
      {showPicker && (
        <div
          className={`z-[9000] ${
            isMobile
              ? "fixed bottom-5 left-1/2 w-[90%] -translate-x-1/2 rounded-xl shadow-lg bg-[#2c2e30]"
              : "absolute top-10 left-[20%] -translate-x-[80%] bg-[#2c2e30]"
          }`}
        >
          <Picker
            data={data}
            onEmojiSelect={(emoji) => {
              onSelect(emoji.native);
              setShowPicker(false);
            }}
            theme="dark"
          />
        </div>
      )}
    </div>
  );
}
