import React, { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useTheme } from "@/contexts/ThemeContext";
import { NotificationContainer } from "@/components/ui/notification";

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  
  // Only show the UI after first render to avoid hydration issues
  useEffect(() => {
    setMounted(true);
  }, []);
  
  if (!mounted) {
    return null;
  }
  
  return (
    <div className={`font-sans text-gray-900 bg-gray-50 dark:bg-gray-900 dark:text-gray-100 min-h-screen transition-colors duration-200 ${theme}`}>
      <NotificationContainer />
      <Navbar />
      <main className="container mx-auto px-4 py-8 flex-grow">
        {children}
      </main>
      <Footer />
    </div>
  );
};

export default MainLayout;
