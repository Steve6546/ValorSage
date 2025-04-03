import React from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useTheme } from "@/contexts/ThemeContext";
import { NotificationContainer } from "@/components/ui/notification";

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const { theme } = useTheme();
  
  return (
    <div className={`font-sans text-gray-900 bg-gray-50 dark:bg-gray-900 dark:text-gray-100 min-h-screen transition-colors duration-200 ${theme}`}>
      <NotificationContainer />
      <Navbar />
      {children}
      <Footer />
    </div>
  );
};

export default MainLayout;
