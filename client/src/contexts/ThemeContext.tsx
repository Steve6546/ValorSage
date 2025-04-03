import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  // Check for saved theme preference or use system preference
  const [theme, setTheme] = useState<Theme>(() => {
    const savedTheme = localStorage.getItem("theme") as Theme | null;
    if (savedTheme === "dark" || savedTheme === "light") {
      return savedTheme;
    }
    
    // Use system preference as default
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });
  
  useEffect(() => {
    // Apply theme to document element
    const html = document.documentElement;
    
    if (theme === "dark") {
      html.classList.add("dark");
    } else {
      html.classList.remove("dark");
    }
    
    // Save theme preference
    localStorage.setItem("theme", theme);
  }, [theme]);
  
  const toggleTheme = () => {
    setTheme(prev => (prev === "dark" ? "light" : "dark"));
  };
  
  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
