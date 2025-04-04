import React, { useState, useEffect, useRef } from "react";
import { FileItem } from "@shared/schema";
import { EditorState, Extension } from "@codemirror/state";
import { EditorView, keymap, lineNumbers, highlightActiveLineGutter } from "@codemirror/view";
import { defaultKeymap, indentWithTab, history, historyKeymap } from "@codemirror/commands";
import { oneDark } from "@codemirror/theme-one-dark";
import { javascript } from "@codemirror/lang-javascript";
import { html } from "@codemirror/lang-html";
import { css } from "@codemirror/lang-css";
import { syntaxHighlighting, defaultHighlightStyle, bracketMatching, foldGutter, indentOnInput, LanguageSupport } from "@codemirror/language";
import { autocompletion, completionKeymap } from "@codemirror/autocomplete";

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
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const editorViewRef = useRef<EditorView | null>(null);
  const [cursorPosition, setCursorPosition] = useState({ line: 1, col: 1 });
  const [activeFileId, setActiveFileId] = useState<number>(file?.id || 0);
  
  // Function to get language extension based on file extension
  const getLanguageExtension = (extension: string | undefined): Extension => {
    const ext = extension?.toLowerCase() || "";
    switch (ext) {
      case "js":
      case "jsx":
      case "ts":
      case "tsx":
      case "json":
        return javascript();
      case "html":
      case "htm":
      case "xml":
        return html();
      case "css":
      case "scss":
      case "less":
        return css();
      default:
        return new LanguageSupport(javascript().language);
    }
  };
  
  // Function to get file extension based syntax highlighting class
  const getLanguageType = () => {
    const extension = file?.extension || "";
    switch (extension) {
      case "html": return "HTML";
      case "css": return "CSS";
      case "js": return "JavaScript";
      case "jsx": return "JSX";
      case "ts": return "TypeScript";
      case "tsx": return "TypeScript React";
      case "json": return "JSON";
      case "md": return "Markdown";
      default: return extension.toUpperCase() || "Plain Text";
    }
  };
  
  // Update cursor position
  const updateCursorPosition = (view: EditorView) => {
    const pos = view.state.selection.main.head;
    const line = view.state.doc.lineAt(pos);
    setCursorPosition({
      line: line.number,
      col: pos - line.from + 1
    });
  };
  
  // Create or update editor
  useEffect(() => {
    if (!editorContainerRef.current || !file) return;
    
    // If file has changed, destroy and recreate the editor
    if (editorViewRef.current && activeFileId !== file.id) {
      editorViewRef.current.destroy();
      editorViewRef.current = null;
    }
    
    if (!editorViewRef.current) {
      const startState = EditorState.create({
        doc: file.content || "",
        extensions: [
          lineNumbers(),
          highlightActiveLineGutter(),
          history(),
          bracketMatching(),
          autocompletion(),
          foldGutter(),
          indentOnInput(),
          syntaxHighlighting(defaultHighlightStyle),
          keymap.of([
            ...defaultKeymap,
            ...historyKeymap,
            ...completionKeymap,
            indentWithTab
          ]),
          oneDark,
          getLanguageExtension(file.extension || ""),
          EditorView.updateListener.of(update => {
            if (update.docChanged) {
              const doc = update.state.doc.toString();
              onChangeCode(file.id, doc);
            }
            if (update.selectionSet) {
              updateCursorPosition(update.view);
            }
          }),
          EditorView.theme({
            "&": {
              height: "100%",
              fontSize: "14px"
            },
            ".cm-scroller": {
              overflow: "auto",
              fontFamily: "Menlo, Monaco, 'Courier New', monospace"
            },
            ".cm-content": {
              caretColor: "#fff"
            }
          })
        ]
      });
      
      const view = new EditorView({
        state: startState,
        parent: editorContainerRef.current
      });
      
      editorViewRef.current = view;
      setActiveFileId(file.id);
      updateCursorPosition(view);
    } else {
      // Update the content if it's the same file but content changed externally
      const currentContent = editorViewRef.current.state.doc.toString();
      if (currentContent !== file.content) {
        editorViewRef.current.dispatch({
          changes: {
            from: 0,
            to: currentContent.length,
            insert: file.content || ""
          }
        });
      }
    }
    
    return () => {
      // Clean up only when component unmounts, not on every render
      if (editorContainerRef.current === null) {
        editorViewRef.current?.destroy();
      }
    };
  }, [file, onChangeCode]);
  
  // File tabs component
  const FileTabs = () => {
    return (
      <div className="flex bg-[#252526] border-b border-[#3c3c3c]">
        {openFiles.map((openFile) => (
          <div 
            key={openFile.id}
            className={`flex items-center group px-3 py-1.5 text-xs ${
              openFile.id === file.id ? 'bg-[#1e1e1e] text-white font-medium' : 'text-[#969696] hover:text-white'
            }`}
            onClick={() => onSelectFile(openFile.id)}
          >
            <span className="truncate max-w-[120px]">{openFile.name}</span>
            <button 
              className="ml-2 text-gray-500 hover:text-white opacity-0 group-hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation();
                onCloseFile(openFile.id);
              }}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col bg-[#1e1e1e] h-full overflow-hidden">
      {/* File Tabs */}
      <FileTabs />
      
      {/* Editor Info Bar */}
      <div className="bg-[#1e1e1e] border-b border-[#3c3c3c] text-[#cccccc] text-xs px-4 py-1 flex items-center">
        <div className="flex space-x-2">
          <span>{getLanguageType()}</span>
          <span>•</span>
          <span>UTF-8</span>
        </div>
      </div>
      
      {/* Code Area */}
      <div className="flex-1 overflow-hidden">
        <div ref={editorContainerRef} className="h-full w-full" />
      </div>
      
      {/* Status Bar */}
      <div className="bg-[#007acc] text-white text-xs px-4 py-1 flex justify-between">
        <div>
          <span className="mr-4">Line {cursorPosition.line}</span>
          <span>Col {cursorPosition.col}</span>
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
