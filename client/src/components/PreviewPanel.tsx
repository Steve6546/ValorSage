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
    <div className="flex flex-col h-full">
      <div className="flex-1 h-full overflow-hidden flex flex-col">
        <iframe 
          ref={iframeRef}
          title="معاينة الكود"
          className="flex-1 w-full h-full bg-white"
          sandbox="allow-scripts allow-same-origin"
        />
      </div>
      <div className="bg-[#252526] border-t border-[#3c3c3c] p-2 flex justify-between items-center text-[#cccccc]">
        <div className="text-xs">
          <span className="px-2 py-1 bg-[#2d2d2e] rounded">مشروع كودر التفاعلية</span>
        </div>
        <div className="flex space-x-2">
          <button 
            onClick={onRefresh}
            className="p-1 hover:bg-[#3c3c3c] rounded transition-colors"
            title="تحديث المعاينة"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          <button 
            onClick={openInNewWindow}
            className="p-1 hover:bg-[#3c3c3c] rounded transition-colors"
            title="فتح في نافذة جديدة"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default PreviewPanel;
