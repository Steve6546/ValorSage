import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { FileItem } from "@shared/schema";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  const [activeTab, setActiveTab] = useState<string>("preview");
  
  // Combine files and render preview
  const renderCombinedPreview = () => {
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
          // Check if there's a head tag
          if (htmlContent.includes("</head>")) {
            htmlContent = htmlContent.replace(
              "</head>",
              `<style>${styleContent}</style></head>`
            );
          } else {
            // Add head tag if not present
            htmlContent = htmlContent.replace(
              "<html>",
              "<html><head><style>" + styleContent + "</style></head>"
            );
          }
        }
        
        // Inject JS
        let scriptContent = "";
        jsFiles.forEach(jsFile => {
          scriptContent += jsFile.content || "";
        });
        
        if (scriptContent) {
          // Check if there's a body tag
          if (htmlContent.includes("</body>")) {
            htmlContent = htmlContent.replace(
              "</body>",
              `<script>${scriptContent}</script></body>`
            );
          } else {
            // Add body closing tag if not present
            htmlContent += `<script>${scriptContent}</script></body>`;
          }
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
  };
  
  // Render preview of single file
  const renderSingleFilePreview = (file: FileItem) => {
    if (!iframeRef.current || !file) return;
    
    try {
      const iframe = iframeRef.current;
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      
      if (iframeDoc) {
        iframeDoc.open();
        
        // Render based on file type
        switch (file.extension) {
          case "html":
            iframeDoc.write(file.content || "");
            break;
            
          case "css":
            iframeDoc.write(`
              <html>
                <head>
                  <style>${file.content || ""}</style>
                  <style>
                    body {
                      font-family: Arial, sans-serif;
                      padding: 20px;
                    }
                    .css-preview {
                      padding: 20px;
                      border: 1px solid #ddd;
                      border-radius: 4px;
                    }
                    h3 {
                      margin-top: 0;
                    }
                    pre {
                      background: #f5f5f5;
                      padding: 10px;
                      border-radius: 4px;
                      overflow: auto;
                    }
                    .example {
                      margin-top: 20px;
                      padding: 20px;
                      border: 1px dashed #ccc;
                      border-radius: 4px;
                    }
                  </style>
                </head>
                <body>
                  <div class="css-preview">
                    <h3>معاينة CSS: ${file.name}</h3>
                    <pre>${file.content?.replace(/</g, "&lt;").replace(/>/g, "&gt;") || ""}</pre>
                    <div class="example">
                      <p>مثال لتطبيق النمط</p>
                      <p style="color: blue;">هذا نص يطبق عليه النمط</p>
                      <div style="width: 100px; height: 100px; background-color: #3b82f6;"></div>
                    </div>
                  </div>
                </body>
              </html>
            `);
            break;
            
          case "js":
          case "jsx":
            iframeDoc.write(`
              <html>
                <head>
                  <style>
                    body {
                      font-family: Arial, sans-serif;
                      padding: 20px;
                    }
                    .js-preview {
                      padding: 20px;
                      border: 1px solid #ddd;
                      border-radius: 4px;
                    }
                    h3 {
                      margin-top: 0;
                    }
                    pre {
                      background: #f5f5f5;
                      padding: 10px;
                      border-radius: 4px;
                      overflow: auto;
                    }
                    .output {
                      margin-top: 20px;
                      padding: 10px;
                      background: #e9ecef;
                      border-radius: 4px;
                      min-height: 100px;
                    }
                  </style>
                </head>
                <body>
                  <div class="js-preview">
                    <h3>معاينة JavaScript: ${file.name}</h3>
                    <pre>${file.content?.replace(/</g, "&lt;").replace(/>/g, "&gt;") || ""}</pre>
                    <h4>نتيجة التنفيذ:</h4>
                    <div class="output" id="output"></div>
                    <script>
                      // Capture console.log
                      (function() {
                        const output = document.getElementById('output');
                        const originalLog = console.log;
                        
                        console.log = function(...args) {
                          originalLog.apply(console, args);
                          
                          const line = document.createElement('div');
                          line.textContent = args.map(arg => 
                            typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
                          ).join(' ');
                          
                          output.appendChild(line);
                        };
                        
                        // Execute the script in a try-catch block
                        try {
                          ${file.content || ""}
                        } catch (error) {
                          const errorLine = document.createElement('div');
                          errorLine.style.color = 'red';
                          errorLine.textContent = 'Error: ' + error.message;
                          output.appendChild(errorLine);
                        }
                      })();
                    </script>
                  </div>
                </body>
              </html>
            `);
            break;
            
          default:
            showPlaceholder(`لا يمكن معاينة ملفات بامتداد ${file.extension || 'غير معروف'}`);
            break;
        }
        
        iframeDoc.close();
      }
    } catch (error) {
      console.error("Error rendering file preview:", error);
      showPlaceholder("حدث خطأ أثناء عرض المعاينة");
    }
  };
  
  // Update preview when files change or refresh is triggered
  useEffect(() => {
    if (activeTab === "preview") {
      renderCombinedPreview();
    } else if (activeTab === "current" && selectedFile) {
      renderSingleFilePreview(selectedFile);
    }
  }, [files, selectedFile, onRefresh, activeTab]);
  
  // Switch tabs when selected file changes
  useEffect(() => {
    if (selectedFile) {
      // Auto switch to current file tab when a single file is selected
      setActiveTab("current");
    }
  }, [selectedFile]);
  
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
      if (activeTab === "preview") {
        const htmlFile = files.find(file => file.name === "index.html");
        if (htmlFile) {
          const previewWindow = window.open("", "_blank");
          if (previewWindow) {
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
            
            previewWindow.document.write(htmlContent);
            previewWindow.document.close();
          }
        }
      } else if (activeTab === "current" && selectedFile) {
        const previewWindow = window.open("", "_blank");
        if (previewWindow && selectedFile.extension === "html") {
          previewWindow.document.write(selectedFile.content || "");
          previewWindow.document.close();
        } else if (previewWindow) {
          previewWindow.document.write(`
            <html>
              <head>
                <title>${selectedFile.name}</title>
              </head>
              <body>
                <pre>${selectedFile.content || ""}</pre>
              </body>
            </html>
          `);
          previewWindow.document.close();
        }
      }
    } catch (error) {
      console.error("Error opening preview in new window:", error);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="bg-[#252526] border-b border-[#3c3c3c] p-1">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-[#2d2d2e] border border-[#3c3c3c]">
            <TabsTrigger 
              value="preview" 
              className="text-xs data-[state=active]:bg-[#1e1e1e] data-[state=active]:text-white"
            >
              المعاينة الكاملة
            </TabsTrigger>
            <TabsTrigger 
              value="current"
              disabled={!selectedFile}
              className="text-xs data-[state=active]:bg-[#1e1e1e] data-[state=active]:text-white"
            >
              {selectedFile ? selectedFile.name : 'الملف الحالي'}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      
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
          <span className="px-2 py-1 bg-[#2d2d2e] rounded">
            {activeTab === "preview" ? "المعاينة الكاملة" : selectedFile?.name}
          </span>
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
