import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { useTheme } from "@/contexts/ThemeContext";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";
import { SunIcon, MoonIcon, ComputerIcon } from "lucide-react";

const Navbar: React.FC = () => {
  const [location] = useLocation();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const { user, logoutMutation } = useAuth();
  const [searchText, setSearchText] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Implement search functionality
    console.log("Searching for:", searchText);
  };

  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40">
      <div className="container mx-auto px-4 py-2 flex justify-between items-center">
        <div className="flex items-center space-x-2 rtl:space-x-reverse">
          {/* Logo */}
          <Link href="/" className="flex items-center">
              <i className="ri-code-box-line text-primary-500 text-2xl"></i>
              <span className="font-heading font-bold text-xl mr-2">AKO.js</span>
          </Link>
          
          {/* Main Navigation */}
          <nav className="hidden md:flex space-x-6 rtl:space-x-reverse">
            <Link href="/" className={`py-2 ${location === "/" ? "text-primary-500 font-medium" : "text-gray-600 dark:text-gray-300 hover:text-primary-500 dark:hover:text-primary-500 transition-colors"}`}>
              لوحة التحكم
            </Link>
            <Link href="/projects" className={`py-2 ${location === "/projects" ? "text-primary-500 font-medium" : "text-gray-600 dark:text-gray-300 hover:text-primary-500 dark:hover:text-primary-500 transition-colors"}`}>
              المشاريع
            </Link>
            <Link href="/community" className={`py-2 ${location === "/community" ? "text-primary-500 font-medium" : "text-gray-600 dark:text-gray-300 hover:text-primary-500 dark:hover:text-primary-500 transition-colors"}`}>
              المجتمع
            </Link>
            <Link href="/support" className={`py-2 ${location === "/support" ? "text-primary-500 font-medium" : "text-gray-600 dark:text-gray-300 hover:text-primary-500 dark:hover:text-primary-500 transition-colors"}`}>
              الدعم
            </Link>
          </nav>
        </div>
        
        <div className="flex items-center space-x-4 rtl:space-x-reverse">
          {/* Search */}
          <form onSubmit={handleSearch} className="hidden md:block relative">
            <Input
              type="text"
              placeholder="بحث..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="pr-8 pl-3 py-1.5 rounded-md text-sm border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent w-40 lg:w-56"
            />
            <i className="ri-search-line absolute right-2.5 top-2 text-gray-500 dark:text-gray-400"></i>
          </form>
          
          {/* Theme Toggle */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="p-1.5 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                aria-label="Select theme"
              >
                {resolvedTheme === 'dark' ? (
                  <MoonIcon className="h-5 w-5" />
                ) : (
                  <SunIcon className="h-5 w-5" />
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>المظهر</DropdownMenuLabel>
              <DropdownMenuRadioGroup value={theme} onValueChange={(value) => setTheme(value as "light" | "dark" | "system")}>
                <DropdownMenuRadioItem value="light">
                  <div className="flex items-center">
                    <SunIcon className="ml-2 h-4 w-4" />
                    <span>فاتح</span>
                  </div>
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="dark">
                  <div className="flex items-center">
                    <MoonIcon className="ml-2 h-4 w-4" />
                    <span>مظلم</span>
                  </div>
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="system">
                  <div className="flex items-center">
                    <ComputerIcon className="ml-2 h-4 w-4" />
                    <span>النظام</span>
                  </div>
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          
          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1.5 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 relative transition-colors">
                <i className="ri-notification-3-line"></i>
                <span className="absolute top-0 right-0 w-2 h-2 rounded-full bg-red-500"></span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>الإشعارات</DropdownMenuLabel>
              <DropdownMenuItem>تم حفظ المشروع بنجاح</DropdownMenuItem>
              <DropdownMenuItem>انضمت سارة إلى مشروعك</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>عرض جميع الإشعارات</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          {/* User Profile / Auth Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center space-x-1 rtl:space-x-reverse">
                <Avatar>
                  {user ? (
                    <AvatarImage src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=80&q=80" alt="صورة المستخدم" />
                  ) : (
                    <AvatarFallback className="bg-primary-500 text-white">
                      <i className="ri-user-line text-lg"></i>
                    </AvatarFallback>
                  )}
                </Avatar>
                <span className="text-sm font-medium hidden sm:block">
                  {user ? user.username : 'حسابي'}
                </span>
                <i className="ri-arrow-down-s-line text-gray-500"></i>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {user ? (
                <>
                  <DropdownMenuLabel>حسابي</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => console.log('الملف الشخصي')}>
                    <i className="ri-user-line ml-2"></i>
                    الملف الشخصي
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => console.log('إعدادات')}>
                    <i className="ri-settings-3-line ml-2"></i>
                    الإعدادات
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => logoutMutation.mutate()} className="text-red-500 hover:text-red-600">
                    <i className="ri-logout-box-line ml-2"></i>
                    تسجيل الخروج
                  </DropdownMenuItem>
                </>
              ) : (
                <>
                  <DropdownMenuLabel>خيارات الحساب</DropdownMenuLabel>
                  <DropdownMenuItem 
                    onClick={() => window.location.href = '/auth'} 
                    className="text-primary-500 hover:text-primary-600 cursor-pointer"
                  >
                    <i className="ri-login-box-line ml-2"></i>
                    تسجيل الدخول
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => window.location.href = '/auth?tab=register'} 
                    className="text-primary-500 hover:text-primary-600 cursor-pointer"
                  >
                    <i className="ri-user-add-line ml-2"></i>
                    إنشاء حساب جديد
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
