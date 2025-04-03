import React from "react";
import { Link } from "wouter";

interface QuickLink {
  name: string;
  icon: string;
  href: string;
  external?: boolean;
}

const QuickLinks: React.FC = () => {
  const links: QuickLink[] = [
    {
      name: "التوثيق",
      icon: "ri-book-open-line",
      href: "/documentation"
    },
    {
      name: "المساعدة",
      icon: "ri-question-line",
      href: "/support"
    },
    {
      name: "الدروس",
      icon: "ri-video-line",
      href: "/tutorials"
    },
    {
      name: "GitHub",
      icon: "ri-github-line",
      href: "https://github.com",
      external: true
    }
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {links.map((link, index) => (
        <React.Fragment key={index}>
          {link.external ? (
            <a 
              href={link.href} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex flex-col items-center p-3 bg-gray-50 dark:bg-gray-750 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <i className={`${link.icon} text-primary-500 text-xl mb-2`}></i>
              <span className="text-sm font-medium">{link.name}</span>
            </a>
          ) : (
            <Link href={link.href}>
              <a className="flex flex-col items-center p-3 bg-gray-50 dark:bg-gray-750 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                <i className={`${link.icon} text-primary-500 text-xl mb-2`}></i>
                <span className="text-sm font-medium">{link.name}</span>
              </a>
            </Link>
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

export default QuickLinks;
