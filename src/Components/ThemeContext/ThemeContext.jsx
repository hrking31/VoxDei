import React, { createContext, useState, useEffect, useContext } from "react";
import { themes } from "./theme";

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const savedTheme = localStorage.getItem("themeName") || "light";
  const [themeName, setThemeName] = useState(savedTheme);
  const [customTheme, setCustomTheme] = useState(
    JSON.parse(localStorage.getItem("customTheme")) || {}
  );

  useEffect(() => {
    localStorage.setItem("themeName", themeName);
  }, [themeName]);

  const theme =
    themeName === "custom"
      ? {
          background: customTheme.background || "#FFFFFF",
          text: customTheme.text || "#000000",
        }
      : themes[themeName];

  return (
    <ThemeContext.Provider
      value={{ theme, themeName, setThemeName, setCustomTheme }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
