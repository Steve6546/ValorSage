import React from "react";
import { Link } from "wouter";

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 py-6 mt-12">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center mb-4 md:mb-0">
            <i className="ri-code-box-line text-primary-500 text-xl"></i>
            <span className="font-heading font-bold text-lg mr-2">AKO.js</span>
            <span className="text-sm text-gray-500 dark:text-gray-400 mr-2">v1.2.0</span>
          </div>
          
          <div className="flex flex-wrap justify-center space-x-6 rtl:space-x-reverse">
            <Link href="/terms" className="text-gray-600 dark:text-gray-300 hover:text-primary-500 dark:hover:text-primary-500 text-sm">
              الشروط والأحكام
            </Link>
            <Link href="/privacy" className="text-gray-600 dark:text-gray-300 hover:text-primary-500 dark:hover:text-primary-500 text-sm">
              سياسة الخصوصية
            </Link>
            <Link href="/support" className="text-gray-600 dark:text-gray-300 hover:text-primary-500 dark:hover:text-primary-500 text-sm">
              المساعدة
            </Link>
            <Link href="/contact" className="text-gray-600 dark:text-gray-300 hover:text-primary-500 dark:hover:text-primary-500 text-sm">
              التواصل
            </Link>
          </div>
          
          <div className="flex space-x-4 rtl:space-x-reverse mt-4 md:mt-0">
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-gray-600 dark:text-gray-300 hover:text-primary-500 dark:hover:text-primary-500">
              <i className="ri-github-line text-lg"></i>
            </a>
            <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="text-gray-600 dark:text-gray-300 hover:text-primary-500 dark:hover:text-primary-500">
              <i className="ri-twitter-line text-lg"></i>
            </a>
            <a href="https://discord.com" target="_blank" rel="noopener noreferrer" className="text-gray-600 dark:text-gray-300 hover:text-primary-500 dark:hover:text-primary-500">
              <i className="ri-discord-line text-lg"></i>
            </a>
          </div>
        </div>
        
        <div className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
          © {currentYear} مشروع كودر التفاعلية (AKO.js). جميع الحقوق محفوظة.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
