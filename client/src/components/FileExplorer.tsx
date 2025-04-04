import React, { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { 
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuShortcut,
} from "@/components/ui/context-menu";
import { FileItem, FileType } from "@shared/schema";
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

interface FileExplorerProps {
  files: FileItem[];
  selectedFile?: FileItem;
  onFileSelect: (file: FileItem) => void;
  onCreateFile?: (parentId: number | null, fileType: FileType) => void;
  onRenameFile?: (fileId: number) => void;
  onDeleteFile?: (fileId: number) => void;
  onMoveFile?: (fileId: number, targetFolderId: number | null) => void;
}

const FileIcon: React.FC<{ file: FileItem }> = ({ file }) => {
  // More modern icon set using SVG for better visuals
  if (file.type === FileType.DIRECTORY) {
    return (
      <svg className="w-4 h-4 text-[#dcb67a] mr-2 flex-shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M2 6C2 4.89543 2.89543 4 4 4H9.5C10.0304 4 10.5391 4.21071 10.9142 4.58579L12 5.67157C12.3751 6.04665 12.8838 6.25736 13.4142 6.25736H20C21.1046 6.25736 22 7.15179 22 8.25736V18C22 19.1046 21.1046 20 20 20H4C2.89543 20 2 19.1046 2 18V6Z" fill="currentColor" />
      </svg>
    );
  }

  let iconColor = "#6e768e";
  let iconPath = null;

  switch (file.extension) {
    case "html":
      iconColor = "#e44d26";
      iconPath = <path d="M5.08 0L6.4 19.5L12 21.5L17.6 19.5L18.93 0H5.08ZM16.3 6H9.5L9.64 8.04H16.16L15.75 13.5L12 14.13L8.28 13.45L8.1 11.09H10.1L10.2 12.27L12 12.59L13.78 12.21L13.96 9.5H7.93L7.53 4.04H16.47L16.3 6Z" fill="currentColor" />;
      break;
    case "js":
    case "jsx":
      iconColor = "#f7df1e";
      iconPath = <path d="M0 0H24V24H0V0ZM22 18.3C21.7 19.3 20.9 20 19.4 20C17.6 20 16.3 19 16.3 16.6V13H14V9.9H16.3V7.3H20V9.9H22.6V13H20V16.2C20 17.3 20.7 17.5 21.1 17.5C21.5 17.5 22 17.3 22.3 17.1L22 18.3ZM13.8 18.9C13.2 19.8 11.9 20 10.7 20C8.6 20 7.3 19 7 17.2L10.5 16.7C10.5 17 10.6 17.2 10.7 17.4C10.8 17.6 11.1 17.9 11.6 17.9C12.1 17.9 12.8 17.7 12.8 16.8V9.9H16.4V18.9H13.8Z" fill="currentColor" />;
      break;
    case "tsx":
      iconColor = "#3178c6";
      iconPath = <path d="M2 0H22C23.1046 0 24 0.89543 24 2V22C24 23.1046 23.1046 24 22 24H2C0.89543 24 0 23.1046 0 22V2C0 0.89543 0.89543 0 2 0ZM14.4 12.5H10.2V20H8V12.5H3.8V10.4H14.4V12.5ZM20.2 16.9C20.2 18.2 19.3 19.6 16.8 19.6C15.4 19.6 14.1 19 13.2 17.9L14.8 16.6C15.3 17.3 16 17.7 16.8 17.7C17.7 17.7 18 17.3 18 16.9C18 16.2 16.8 15.9 15.8 15.5C14.6 15 13.2 14.4 13.2 12.5C13.2 10.9 14.5 9.7 16.4 9.7C17.6 9.7 18.6 10.2 19.3 11.1L17.8 12.4C17.3 11.8 16.8 11.6 16.4 11.6C16 11.6 15.7 11.8 15.7 12.2C15.7 12.8 16.4 12.9 17.4 13.3C19.6 14.1 20.2 15.1 20.2 16.9Z" fill="currentColor" />;
      break;
    case "css":
      iconColor = "#264de4";
      iconPath = <path d="M5.01001 0H18.99C19.79 0 20.38 0.59 20.38 1.39V22.61C20.38 23.41 19.79 24 18.99 24H5.01001C4.21001 24 3.62001 23.41 3.62001 22.61V1.39C3.62001 0.59 4.21001 0 5.01001 0ZM11.89 20.4L16.78 19.09L17.44 15.5L17.89 13.08L18.12 12H12.01L11.89 13.02H15.32L15.1 14.04H11.67L11.55 15.05H14.89L14.53 17.43L12.01 18.05L9.49001 17.43L9.29001 15.91H10.32L10.42 16.67L12.01 16.99L13.59 16.67L13.79 14.89H9.17001L9.05001 13.88H13.67L13.75 12.86H8.94001L8.82001 11.84H15.07L14.95 12.86L12.01 12.86L11.89 20.4Z" fill="currentColor" />;
      break;
    case "json":
      iconColor = "#f2c040";
      iconPath = <path d="M5 3H19C20.1 3 21 3.9 21 5V19C21 20.1 20.1 21 19 21H5C3.9 21 3 20.1 3 19V5C3 3.9 3.9 3 5 3ZM7.5 7.5C7.5 8.33 6.83 9 6 9C5.17 9 4.5 8.33 4.5 7.5C4.5 6.67 5.17 6 6 6C6.83 6 7.5 6.67 7.5 7.5ZM6 18C5.17 18 4.5 17.33 4.5 16.5C4.5 15.67 5.17 15 6 15C6.83 15 7.5 15.67 7.5 16.5C7.5 17.33 6.83 18 6 18ZM18 6H11.14C10.14 6 9.15 9 8.14 9C7.14 9 6.42 11 5.42 11H4V13H5.25C6.25 13 7.28 10 8.28 10C9.28 10 10 8 11 8H18V6ZM19.5 16.5C19.5 17.33 18.83 18 18 18H9V16H18C18.83 16 19.5 15.33 19.5 14.5C19.5 13.67 18.83 13 18 13H9V11H18C18.83 11 19.5 11.67 19.5 12.5V16.5Z" fill="currentColor" />;
      break;
    case "md":
      iconColor = "#6e768e";
      iconPath = <path d="M20.56 18H3.44C2.65 18 2 17.37 2 16.59V7.41C2 6.63 2.65 6 3.44 6H20.56C21.35 6 22 6.63 22 7.41V16.59C22 17.37 21.35 18 20.56 18ZM6.81 15.19V11.53L8.73 13.88L10.65 11.53V15.19H12.58V8.81H10.65L8.73 11.16L6.81 8.81H4.89V15.19H6.81ZM18.19 10.73H15.35V8.81H13.42V10.73H10.58V12.65H13.42V14.58H15.35V12.65H18.19" fill="currentColor" />;
      break;
    default:
      iconPath = <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2ZM18 20H6V4H13V9H18V20Z" fill="currentColor" />;
  }

  return (
    <svg className={`w-4 h-4 text-[${iconColor}] mr-2 flex-shrink-0`} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      {iconPath || <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2ZM18 20H6V4H13V9H18V20Z" fill="currentColor" />}
    </svg>
  );
};

// Draggable Item component with drag and drop functionality
interface DraggableItemProps {
  file: FileItem;
  onDrop: (fileId: number, targetId: number | null) => void;
  selectedFile?: FileItem;
  onFileSelect: (file: FileItem) => void;
  expandedFolders: Record<number, boolean>;
  toggleFolder: (id: number) => void;
  children?: React.ReactNode;
}

const DraggableItem: React.FC<DraggableItemProps> = ({
  file,
  onDrop,
  selectedFile,
  onFileSelect,
  expandedFolders,
  toggleFolder,
  children
}) => {
  const [{ isDragging }, drag] = useDrag({
    type: 'FILE',
    item: { id: file.id, type: file.type },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  });
  
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: 'FILE',
    canDrop: (item: { id: number, type: string }) => {
      // Can't drop on self or files (only on directories)
      return file.type === FileType.DIRECTORY && item.id !== file.id;
    },
    drop: (item: { id: number }, monitor) => {
      if (!monitor.didDrop()) {
        onDrop(item.id, file.id);
      }
      return { id: file.id };
    },
    collect: (monitor) => ({
      isOver: !!monitor.isOver({ shallow: true }),
      canDrop: !!monitor.canDrop(),
    }),
  });
  
  const isActive = isOver && canDrop;
  const opacity = isDragging ? 0.5 : 1;
  
  const itemRef = useRef<HTMLDivElement>(null);
  const combinedRef = file.type === FileType.DIRECTORY 
    ? (el: HTMLDivElement) => { drag(el); drop(el); if (itemRef.current) itemRef.current = el; }
    : (el: HTMLDivElement) => { drag(el); if (itemRef.current) itemRef.current = el; };
  
  return (
    <div 
      ref={combinedRef}
      style={{ opacity }} 
      className={cn(
        file.type === FileType.DIRECTORY && isActive ? "border border-blue-500 rounded" : "",
        file.type === FileType.DIRECTORY && canDrop ? "bg-[#2a2d2e]/30" : ""
      )}
    >
      {file.type === FileType.DIRECTORY ? (
        <div 
          onClick={() => toggleFolder(file.id)}
          className="flex items-center text-sm py-1 px-2 hover:bg-[#2a2d2e] rounded cursor-pointer group"
        >
          <span className="mr-1 text-[#6e768e] group-hover:text-white">
            {expandedFolders[file.id] ? (
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M19 9L12 16L5 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 5L16 12L9 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </span>
          <FileIcon file={file} />
          <span className="text-[#cccccc] group-hover:text-white">{file.name}</span>
        </div>
      ) : (
        <div 
          onClick={() => onFileSelect(file)}
          className={cn(
            "flex items-center text-sm py-1 px-2 hover:bg-[#2a2d2e] rounded cursor-pointer my-1 group",
            selectedFile?.id === file.id && "bg-[#37373d]"
          )}
        >
          <FileIcon file={file} />
          <span className={cn(
            "text-[#cccccc] group-hover:text-white truncate",
            selectedFile?.id === file.id && "text-white"
          )}>
            {file.name}
          </span>
        </div>
      )}
      {children}
    </div>
  );
};

const FileExplorer: React.FC<FileExplorerProps> = ({
  files,
  selectedFile,
  onFileSelect,
  onCreateFile,
  onRenameFile,
  onDeleteFile,
  onMoveFile
}) => {
  const [expandedFolders, setExpandedFolders] = useState<Record<number, boolean>>({});
  
  const toggleFolder = (folderId: number) => {
    setExpandedFolders(prev => ({
      ...prev,
      [folderId]: !prev[folderId]
    }));
  };
  
  const handleFileDrop = (fileId: number, targetFolderId: number | null) => {
    if (onMoveFile) {
      onMoveFile(fileId, targetFolderId);
    }
  };

  const renderFileTree = (items: FileItem[], parentId: number | null = null, level = 0) => {
    return (
      <ul className={level > 0 ? "pl-4 border-l border-[#3c3c3c] ml-2" : ""}>
        {items
          .filter(file => file.parentId === parentId)
          .map(file => (
            <React.Fragment key={file.id}>
              <ContextMenu>
                <ContextMenuTrigger>
                  {file.type === FileType.DIRECTORY ? (
                    <li className="my-1">
                      <DraggableItem 
                        file={file}
                        onDrop={handleFileDrop}
                        selectedFile={selectedFile}
                        onFileSelect={onFileSelect}
                        expandedFolders={expandedFolders}
                        toggleFolder={toggleFolder}
                      >
                        {expandedFolders[file.id] && 
                          renderFileTree(items, file.id, level + 1)
                        }
                      </DraggableItem>
                    </li>
                  ) : (
                    <li className="ml-4">
                      <DraggableItem
                        file={file}
                        onDrop={handleFileDrop}
                        selectedFile={selectedFile}
                        onFileSelect={onFileSelect}
                        expandedFolders={expandedFolders}
                        toggleFolder={toggleFolder}
                      />
                    </li>
                  )}
                </ContextMenuTrigger>
                <ContextMenuContent className="bg-[#252526] border-[#3c3c3c] text-[#cccccc]">
                  {file.type === FileType.DIRECTORY && (
                    <>
                      <ContextMenuSub>
                        <ContextMenuSubTrigger
                          className="hover:bg-[#2a2d2e] hover:text-white focus:bg-[#2a2d2e] focus:text-white"
                        >
                          <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 6V18M18 12H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          إنشاء جديد
                        </ContextMenuSubTrigger>
                        <ContextMenuSubContent className="bg-[#252526] border-[#3c3c3c] text-[#cccccc]">
                          <ContextMenuItem 
                            onClick={() => onCreateFile && onCreateFile(file.id, FileType.FILE)}
                            className="hover:bg-[#2a2d2e] hover:text-white focus:bg-[#2a2d2e] focus:text-white"
                          >
                            <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2ZM18 20H6V4H13V9H18V20Z" fill="currentColor" />
                            </svg>
                            ملف جديد
                            <ContextMenuShortcut>Ctrl+N</ContextMenuShortcut>
                          </ContextMenuItem>
                          <ContextMenuItem 
                            onClick={() => onCreateFile && onCreateFile(file.id, FileType.DIRECTORY)}
                            className="hover:bg-[#2a2d2e] hover:text-white focus:bg-[#2a2d2e] focus:text-white"
                          >
                            <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M2 6C2 4.89543 2.89543 4 4 4H9.5C10.0304 4 10.5391 4.21071 10.9142 4.58579L12 5.67157C12.3751 6.04665 12.8838 6.25736 13.4142 6.25736H20C21.1046 6.25736 22 7.15179 22 8.25736V18C22 19.1046 21.1046 20 20 20H4C2.89543 20 2 19.1046 2 18V6Z" fill="currentColor" />
                            </svg>
                            مجلد جديد
                            <ContextMenuShortcut>Ctrl+Shift+N</ContextMenuShortcut>
                          </ContextMenuItem>
                        </ContextMenuSubContent>
                      </ContextMenuSub>
                      <ContextMenuSeparator className="bg-[#3c3c3c]" />
                    </>
                  )}
                  <ContextMenuItem 
                    onClick={() => onRenameFile && onRenameFile(file.id)}
                    className="hover:bg-[#2a2d2e] hover:text-white focus:bg-[#2a2d2e] focus:text-white"
                  >
                    <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M11 4H4C3.44772 4 3 4.44772 3 5V19C3 19.5523 3.44772 20 4 20H18C18.5523 20 19 19.5523 19 19V12M17.5858 3.58579C18.3668 2.80474 19.6332 2.80474 20.4142 3.58579C21.1953 4.36683 21.1953 5.63316 20.4142 6.41421L11.8284 15H9L9 12.1716L17.5858 3.58579Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    إعادة تسمية
                  </ContextMenuItem>
                  <ContextMenuItem 
                    onClick={() => onDeleteFile && onDeleteFile(file.id)}
                    className="hover:bg-[#2a2d2e] hover:text-red-500 focus:bg-[#2a2d2e] focus:text-red-500 text-red-400"
                  >
                    <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M19 7L18.1327 19.1425C18.0579 20.1891 17.187 21 16.1378 21H7.86224C6.81296 21 5.94208 20.1891 5.86732 19.1425L5 7M10 11V17M14 11V17M15 7V4C15 3.44772 14.5523 3 14 3H10C9.44772 3 9 3.44772 9 4V7M4 7H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
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
    <div className="h-full overflow-y-auto px-2 py-1 text-sm">
      {renderFileTree(files)}
    </div>
  );
};

// Wrap FileExplorer with DnD provider
const DndFileExplorer: React.FC<FileExplorerProps> = (props) => {
  return (
    <DndProvider backend={HTML5Backend}>
      <FileExplorer {...props} />
    </DndProvider>
  );
};

export default DndFileExplorer;
