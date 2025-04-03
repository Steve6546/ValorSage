import React, { useState, useEffect, useRef } from "react";
import { FileItem } from "@shared/schema";

interface CodeEditorProps {
  file: FileItem;
  openFiles: FileItem[];
  onChangeCode: (fileId: number, code: string) => void;
  onCloseFile: (fileId: number) => void;
  onSelectFile: (fileId: number) => void;
}

// Line numbers component
const LineNumbers: React.FC<{ count: number }> = ({ count }) => {
  return (
    <div className="select-none text-right pr-3 border-r border-[#3c3c3c] mr-4 text-[#6e768e] font-mono text-xs">
      {Array.from({ length: Math.max(1, count) }, (_, i) => (
        <div key={i + 1} className="leading-6 h-6">
          {i + 1}
        </div>
      ))}
    </div>
  );
};

const CodeEditor: React.FC<CodeEditorProps> = ({
  file,
  openFiles,
  onChangeCode,
  onCloseFile,
  onSelectFile
}) => {
  const [code, setCode] = useState<string>(file.content || "");
  const [lineCount, setLineCount] = useState<number>(1);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  
  useEffect(() => {
    setCode(file.content || "");
    setLineCount((file.content?.split('\n').length || 0) + 1);
  }, [file]);
  
  const handleCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newCode = e.target.value;
    setCode(newCode);
    setLineCount(newCode.split('\n').length + 1);
    onChangeCode(file.id, newCode);
  };
  
  // Function to get file extension based syntax highlighting class
  const getLanguageType = () => {
    switch (file.extension) {
      case "html": return "HTML";
      case "css": return "CSS";
      case "js": return "JavaScript";
      case "jsx": return "JSX";
      case "ts": return "TypeScript";
      case "tsx": return "TypeScript React";
      case "json": return "JSON";
      case "md": return "Markdown";
      default: return file.extension?.toUpperCase() || "Plain Text";
    }
  };
  
  // Function to handle tab key in the editor
  const handleTabKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const target = e.target as HTMLTextAreaElement;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      
      // Insert 2 spaces for tab
      const newCode = code.substring(0, start) + '  ' + code.substring(end);
      setCode(newCode);
      onChangeCode(file.id, newCode);
      
      // Move cursor to the right position after inserting tab
      setTimeout(() => {
        if (editorRef.current) {
          editorRef.current.selectionStart = editorRef.current.selectionEnd = start + 2;
        }
      }, 0);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#1e1e1e] h-full overflow-hidden">
      {/* Editor Info Bar */}
      <div className="bg-[#1e1e1e] border-b border-[#3c3c3c] text-[#cccccc] text-xs px-4 py-1 flex items-center">
        <div className="flex space-x-2">
          <span>{getLanguageType()}</span>
          <span>•</span>
          <span>UTF-8</span>
        </div>
      </div>
      
      {/* Code Area */}
      <div className="flex-1 overflow-auto flex bg-[#1e1e1e] text-[#cccccc]">
        {/* Line Numbers */}
        <LineNumbers count={lineCount} />
        
        {/* Editor */}
        <div className="flex-1 relative overflow-hidden">
          <textarea
            ref={editorRef}
            value={code}
            onChange={handleCodeChange}
            onKeyDown={handleTabKey}
            className="absolute w-full h-full font-mono text-sm bg-transparent resize-none outline-none p-0 leading-6 text-[#cccccc] overflow-auto"
            style={{ 
              caretColor: '#ffffff',
              tabSize: 2
            }}
            spellCheck="false"
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
          />
          {/* This pre is just for styling reference, but we're not implementing real syntax highlighting here */}
          <pre className="pointer-events-none absolute top-0 left-0 right-0 bottom-0 overflow-hidden opacity-0 font-mono text-sm leading-6">
            {code}
          </pre>
        </div>
      </div>
      
      {/* Status Bar */}
      <div className="bg-[#007acc] text-white text-xs px-4 py-1 flex justify-between">
        <div>
          <span className="mr-4">Line {code.split('\n').length}</span>
          <span>Col {editorRef.current && typeof editorRef.current.selectionStart === 'number' 
            ? editorRef.current.selectionStart - (code.lastIndexOf('\n', Math.max(0, editorRef.current.selectionStart - 1)) + 1) 
            : 1}</span>
        </div>
        <div className="flex space-x-4">
          <span>Spaces: 2</span>
          <span>UTF-8</span>
          <span>{getLanguageType()}</span>
        </div>
      </div>
    </div>
  );
};

export default CodeEditor;
