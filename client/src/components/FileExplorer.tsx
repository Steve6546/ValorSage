import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { 
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { FileItem, FileType } from "@shared/schema";

interface FileExplorerProps {
  files: FileItem[];
  selectedFile?: FileItem;
  onFileSelect: (file: FileItem) => void;
  onCreateFile?: (parentId: number | null) => void;
  onRenameFile?: (fileId: number) => void;
  onDeleteFile?: (fileId: number) => void;
}

const FileIcon: React.FC<{ file: FileItem }> = ({ file }) => {
  const getIcon = () => {
    if (file.type === FileType.DIRECTORY) {
      return "ri-folder-line text-yellow-500";
    }
    
    switch (file.extension) {
      case "html":
        return "ri-file-text-line text-blue-500";
      case "js":
        return "ri-file-code-line text-yellow-500";
      case "jsx":
      case "tsx":
        return "ri-file-code-line text-blue-500";
      case "css":
        return "ri-file-list-line text-pink-500";
      case "json":
        return "ri-file-code-line text-gray-500";
      case "md":
        return "ri-markdown-line text-gray-500";
      default:
        return "ri-file-line text-gray-500";
    }
  };
  
  return <i className={cn("ml-1", getIcon())}></i>;
};

const FileExplorer: React.FC<FileExplorerProps> = ({
  files,
  selectedFile,
  onFileSelect,
  onCreateFile,
  onRenameFile,
  onDeleteFile
}) => {
  const [expandedFolders, setExpandedFolders] = useState<Record<number, boolean>>({});
  
  const toggleFolder = (folderId: number) => {
    setExpandedFolders({
      ...expandedFolders,
      [folderId]: !expandedFolders[folderId]
    });
  };

  const renderFileTree = (items: FileItem[], parentId: number | null = null, level = 0) => {
    return (
      <ul className={level > 0 ? "pr-4 mt-1 space-y-1" : "space-y-1"}>
        {items
          .filter(file => file.parentId === parentId)
          .map(file => (
            <React.Fragment key={file.id}>
              <ContextMenu>
                <ContextMenuTrigger>
                  {file.type === FileType.DIRECTORY ? (
                    <li>
                      <div 
                        onClick={() => toggleFolder(file.id)}
                        className="flex items-center text-sm py-1 px-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded cursor-pointer"
                      >
                        <FileIcon file={file} />
                        <span>{file.name}</span>
                      </div>
                      {expandedFolders[file.id] && 
                        renderFileTree(items, file.id, level + 1)
                      }
                    </li>
                  ) : (
                    <li 
                      onClick={() => onFileSelect(file)}
                      className={cn(
                        "flex items-center text-sm py-1 px-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded cursor-pointer",
                        selectedFile?.id === file.id && "bg-primary-100 dark:bg-primary-900"
                      )}
                    >
                      <FileIcon file={file} />
                      <span>{file.name}</span>
                    </li>
                  )}
                </ContextMenuTrigger>
                <ContextMenuContent>
                  {file.type === FileType.DIRECTORY && (
                    <ContextMenuItem onClick={() => onCreateFile && onCreateFile(file.id)}>
                      إنشاء ملف جديد
                    </ContextMenuItem>
                  )}
                  <ContextMenuItem onClick={() => onRenameFile && onRenameFile(file.id)}>
                    إعادة تسمية
                  </ContextMenuItem>
                  <ContextMenuItem 
                    onClick={() => onDeleteFile && onDeleteFile(file.id)}
                    className="text-red-500 focus:text-red-500"
                  >
                    حذف
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            </React.Fragment>
          ))}
      </ul>
    );
  };

  return (
    <div className="w-48 lg:w-56 border-l border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 overflow-y-auto h-full">
      <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
        <h3 className="font-medium text-sm">متصفح الملفات</h3>
        <button 
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-sm"
          onClick={() => onCreateFile && onCreateFile(null)}
        >
          <i className="ri-add-line"></i>
        </button>
      </div>
      
      <div className="p-3">
        {renderFileTree(files)}
      </div>
    </div>
  );
};

export default FileExplorer;
