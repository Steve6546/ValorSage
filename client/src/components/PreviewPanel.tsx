import React, { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { FileItem } from "@shared/schema";

interface PreviewPanelProps {
  files: FileItem[];
  selectedFile?: FileItem;
  onRefresh: () => void;
}

const PreviewPanel: React.FC<PreviewPanelProps> = ({
  files,
  selectedFile,
  onRefresh
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  
  useEffect(() => {
    if (!iframeRef.current) return;
    
    try {
      const htmlFile = files.find(file => file.name === "index.html");
      if (htmlFile) {
        // Find all CSS and JS files
        const cssFiles = files.filter(file => file.extension === "css");
        const jsFiles = files.filter(file => file.extension === "js" || file.extension === "jsx");
        
        // Create a combined HTML document
        let htmlContent = htmlFile.content || "";
        
        // Inject CSS
        let styleContent = "";
        cssFiles.forEach(cssFile => {
          styleContent += cssFile.content || "";
        });
        
        if (styleContent) {
          htmlContent = htmlContent.replace(
            "</head>",
            `<style>${styleContent}</style></head>`
          );
        }
        
        // Inject JS
        let scriptContent = "";
        jsFiles.forEach(jsFile => {
          scriptContent += jsFile.content || "";
        });
        
        if (scriptContent) {
          htmlContent = htmlContent.replace(
            "</body>",
            `<script>${scriptContent}</script></body>`
          );
        }
        
        // Write to iframe
        const iframe = iframeRef.current;
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        
        if (iframeDoc) {
          iframeDoc.open();
          iframeDoc.write(htmlContent);
          iframeDoc.close();
        }
      } else {
        // No HTML file found, show placeholder
        showPlaceholder();
      }
    } catch (error) {
      console.error("Error rendering preview:", error);
      showPlaceholder("حدث خطأ أثناء عرض المعاينة");
    }
  }, [files, onRefresh]);
  
  const showPlaceholder = (message = "نتائج الكود ستظهر هنا") => {
    if (!iframeRef.current) return;
    
    const iframe = iframeRef.current;
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    
    if (iframeDoc) {
      iframeDoc.open();
      iframeDoc.write(`
        <html>
          <head>
            <style>
              body {
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                margin: 0;
                font-family: Arial, sans-serif;
                background-color: white;
                color: #333;
              }
              .container {
                text-align: center;
                padding: 1rem;
              }
              .icon {
                font-size: 3rem;
                color: #3b82f6;
                margin-bottom: 0.5rem;
              }
              h3 {
                margin-bottom: 0.5rem;
              }
              p {
                color: #6b7280;
                font-size: 0.875rem;
              }
              @media (prefers-color-scheme: dark) {
                body {
                  background-color: #1f2937;
                  color: #f9fafb;
                }
                p {
                  color: #9ca3af;
                }
              }
            </style>
            <link href="https://cdn.jsdelivr.net/npm/remixicon@3.5.0/fonts/remixicon.css" rel="stylesheet">
          </head>
          <body>
            <div class="container">
              <div class="icon"><i class="ri-code-box-line"></i></div>
              <h3>مشروع كودر التفاعلية</h3>
              <p>${message}</p>
            </div>
          </body>
        </html>
      `);
      iframeDoc.close();
    }
  };
  
  const openInNewWindow = () => {
    try {
      const htmlFile = files.find(file => file.name === "index.html");
      if (htmlFile) {
        const previewWindow = window.open("", "_blank");
        if (previewWindow) {
          previewWindow.document.write(htmlFile.content || "");
          previewWindow.document.close();
        }
      }
    } catch (error) {
      console.error("Error opening preview in new window:", error);
    }
  };

  return (
    <div className="w-72 lg:w-96 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-750 flex flex-col h-full">
      <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
        <h3 className="font-medium text-sm">معاينة</h3>
        <div className="flex space-x-2 rtl:space-x-reverse">
          <Button 
            variant="ghost"
            size="icon"
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-sm"
            onClick={onRefresh}
          >
            <i className="ri-refresh-line"></i>
          </Button>
          <Button 
            variant="ghost"
            size="icon"
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-sm"
            onClick={openInNewWindow}
          >
            <i className="ri-external-link-line"></i>
          </Button>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto p-4">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md shadow-sm h-full">
          <iframe 
            ref={iframeRef}
            title="معاينة الكود"
            className="w-full h-full"
            sandbox="allow-scripts allow-same-origin"
          />
        </div>
      </div>
    </div>
  );
};

export default PreviewPanel;
