import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

type ThemeType = "dark" | "light" | "system";
type ButtonStyleType = "default" | "neon" | "neumorphic";

interface ThemeContextProps {
  theme: ThemeType;
  buttonStyle: ButtonStyleType;
  setTheme: (theme: ThemeType) => void;
  setButtonStyle: (style: ButtonStyleType) => void;
}

const ThemeContext = createContext<ThemeContextProps | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeType>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("theme") as ThemeType;
      return saved || "system";
    }
    return "system";
  });

  const [buttonStyle, setButtonStyleState] = useState<ButtonStyleType>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("buttonStyle") as ButtonStyleType;
      return saved || "default";
    }
    return "default";
  });

  useEffect(() => {
    const root = document.documentElement;
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

  const setTheme = (newTheme: ThemeType) => setThemeState(newTheme);
  const setButtonStyle = (newStyle: ButtonStyleType) => setButtonStyleState(newStyle);

  return (
    <ThemeContext.Provider
      value={{ theme, buttonStyle, setTheme, setButtonStyle }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextProps => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
