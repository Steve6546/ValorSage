import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

type Theme = "light" | "dark" | "system";

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: "light" | "dark"; // Actual theme being applied
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "light",
  resolvedTheme: "light",
  setTheme: () => {},
  toggleTheme: () => {}
});

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  // Initialize with a default theme
  const [theme, setTheme] = useState<Theme>("system");
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");
  
  // Check system preference and update resolved theme
  const updateResolvedTheme = () => {
    try {
      if (theme === "system") {
        const isDarkMode = window.matchMedia("(prefers-color-scheme: dark)").matches;
        setResolvedTheme(isDarkMode ? "dark" : "light");
      } else {
        setResolvedTheme(theme as "light" | "dark");
      }
    } catch (error) {
      console.error("Error checking system preference:", error);
    }
  };
  
  // Load saved theme from local storage
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem("theme") as Theme | null;
      if (savedTheme === "dark" || savedTheme === "light" || savedTheme === "system") {
        setTheme(savedTheme);
      }
    } catch (error) {
      console.error("Error accessing localStorage:", error);
    }
  }, []);
  
  // Add listener for system preference changes
  useEffect(() => {
    try {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      
      // Initial update
      updateResolvedTheme();
      
      // Update when system preference changes
      const handleChange = () => {
        if (theme === "system") {
          updateResolvedTheme();
        }
      };
      
      // Modern browsers
      mediaQuery.addEventListener("change", handleChange);
      
      return () => {
        mediaQuery.removeEventListener("change", handleChange);
      };
    } catch (error) {
      console.error("Error setting up media query listener:", error);
    }
  }, [theme]);
  
  // Apply theme to document element
  useEffect(() => {
    updateResolvedTheme();
  }, [theme]);
  
  // Apply resolved theme to document
  useEffect(() => {
    try {
      const html = document.documentElement;
      
      if (resolvedTheme === "dark") {
        html.classList.add("dark");
      } else {
        html.classList.remove("dark");
      }
      
      // Also update the theme JSON
      const updateThemeJson = async () => {
        try {
          // In a real app, this would be an API call
          // Here we're just changing the local state
          console.log(`Theme changed to: ${resolvedTheme}`);
        } catch (error) {
          console.error("Error updating theme.json:", error);
        }
      };
      
      updateThemeJson();
      
      // Save theme preference
      localStorage.setItem("theme", theme);
    } catch (error) {
      console.error("Error updating theme:", error);
    }
  }, [resolvedTheme]);
  
  const toggleTheme = () => {
    setTheme(prev => {
      if (prev === "light") return "dark";
      if (prev === "dark") return "system";
      return "light";
    });
  };
  
  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  return useContext(ThemeContext);
};
