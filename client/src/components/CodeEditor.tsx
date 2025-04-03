import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileItem } from "@shared/schema";

interface CodeEditorProps {
  file: FileItem;
  openFiles: FileItem[];
  onChangeCode: (fileId: number, code: string) => void;
  onCloseFile: (fileId: number) => void;
  onSelectFile: (fileId: number) => void;
}

const CodeEditor: React.FC<CodeEditorProps> = ({
  file,
  openFiles,
  onChangeCode,
  onCloseFile,
  onSelectFile
}) => {
  const [code, setCode] = useState<string>(file.content || "");
  
  useEffect(() => {
    setCode(file.content || "");
  }, [file]);
  
  const handleCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newCode = e.target.value;
    setCode(newCode);
    onChangeCode(file.id, newCode);
  };
  
  const getSyntaxHighlightingClass = (fileExtension: string) => {
    switch (fileExtension) {
      case "html":
        return "language-html";
      case "css":
        return "language-css";
      case "js":
        return "language-javascript";
      case "jsx":
        return "language-jsx";
      case "ts":
        return "language-typescript";
      case "tsx":
        return "language-tsx";
      case "json":
        return "language-json";
      case "md":
        return "language-markdown";
      default:
        return "language-plaintext";
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700 flex">
        <Tabs
          value={file.id.toString()}
          onValueChange={(value) => onSelectFile(parseInt(value))}
          className="w-full"
        >
          <TabsList className="bg-transparent h-auto border-none">
            {openFiles.map((openFile) => (
              <TabsTrigger
                key={openFile.id}
                value={openFile.id.toString()}
                className={`px-4 py-2 text-sm font-medium rounded-t-md data-[state=active]:shadow-none data-[state=active]:border-primary-500 ${
                  openFile.id === file.id
                    ? "border-l border-t border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 -mb-px"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                }`}
              >
                <span className="flex items-center">
                  {openFile.name}
                  <button
                    className="ml-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                    onClick={(e) => {
                      e.stopPropagation();
                      onCloseFile(openFile.id);
                    }}
                  >
                    <i className="ri-close-line text-xs"></i>
                  </button>
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>
      
      {/* Code Area */}
      <div className="flex-1 overflow-auto font-mono text-sm p-4 bg-white dark:bg-gray-800 relative">
        <textarea
          value={code}
          onChange={handleCodeChange}
          className="absolute inset-0 w-full h-full p-4 font-mono text-sm bg-transparent resize-none outline-none text-transparent caret-gray-900 dark:caret-gray-100"
          spellCheck="false"
        />
        <pre className={`language-${file.extension} text-gray-800 dark:text-gray-200 pointer-events-none`}>
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
};

export default CodeEditor;
