
import React, { createContext, useContext, useState, useEffect } from "react";

type ThemeType = "dark" | "light" | "system";
type ButtonStyleType = "default" | "neon" | "neumorphic";

interface ThemeContextProps {
  theme: ThemeType;
  buttonStyle: ButtonStyleType;
  setTheme: (theme: ThemeType) => void;
  setButtonStyle: (style: ButtonStyleType) => void;
}

const ThemeContext = createContext<ThemeContextProps>({
  theme: "system",
  buttonStyle: "default",
  setTheme: () => {},
  setButtonStyle: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeType>(() => {
    const savedTheme = localStorage.getItem("theme") as ThemeType;
    return savedTheme || "system";
  });
  
  const [buttonStyle, setButtonStyleState] = useState<ButtonStyleType>(() => {
    const savedStyle = localStorage.getItem("buttonStyle") as ButtonStyleType;
    return savedStyle || "default";
  });

  useEffect(() => {
    const root = window.document.documentElement;
    
    const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
      
    const currentTheme = theme === "system" ? systemTheme : theme;
    
    root.classList.remove("light", "dark");
    root.classList.add(currentTheme);
    
    localStorage.setItem("theme", theme);
  }, [theme]);
  
  useEffect(() => {
    localStorage.setItem("buttonStyle", buttonStyle);
  }, [buttonStyle]);
  
  const setTheme = (theme: ThemeType) => {
    setThemeState(theme);
  };
  
  const setButtonStyle = (style: ButtonStyleType) => {
    setButtonStyleState(style);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, buttonStyle, setButtonStyle }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
