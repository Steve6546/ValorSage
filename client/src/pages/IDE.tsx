import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import FileExplorer from "@/components/FileExplorer";
import CodeEditor from "@/components/CodeEditor";
import PreviewPanel from "@/components/PreviewPanel";
import { useNotification } from "@/contexts/NotificationContext";
import { useWebSocket } from "@/lib/websocket";
import { FileItem, Project } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

interface IDEParams {
  id: string;
}

const IDE: React.FC = () => {
  const { id } = useParams<IDEParams>();
  const projectId = parseInt(id);
  const { showNotification } = useNotification();
  const socket = useWebSocket();
  
  const [selectedFile, setSelectedFile] = useState<FileItem | undefined>(undefined);
  const [openFiles, setOpenFiles] = useState<FileItem[]>([]);
  const [localFiles, setLocalFiles] = useState<FileItem[]>([]);
  const [refreshPreview, setRefreshPreview] = useState<number>(0);
  
  // Fetch project details
  const { data: project, isLoading: projectLoading } = useQuery<Project>({
    queryKey: [`/api/projects/${projectId}`],
  });
  
  // Fetch project files
  const { data: files = [], isLoading: filesLoading } = useQuery<FileItem[]>({
    queryKey: [`/api/projects/${projectId}/files`],
    onSuccess: (data) => {
      setLocalFiles(data);
      // Open index.html by default if it exists
      const indexFile = data.find(file => file.name === "index.html");
      if (indexFile) {
        handleFileSelect(indexFile);
      }
    }
  });
  
  useEffect(() => {
    if (socket) {
      socket.addEventListener("message", (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === "file_update" && data.projectId === projectId) {
            // Update file in local state
            setLocalFiles(prev => 
              prev.map(file => 
                file.id === data.file.id 
                  ? { ...file, content: data.file.content }
                  : file
              )
            );
            
            // If the file is open, update it
            setOpenFiles(prev => 
              prev.map(file => 
                file.id === data.file.id 
                  ? { ...file, content: data.file.content }
                  : file
              )
            );
            
            showNotification({
              id: Date.now().toString(),
              type: "info",
              title: "تحديث الملفات",
              message: `تم تحديث الملف ${data.file.name} بواسطة ${data.user}`,
              duration: 3000,
            });
          }
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      });
    }
  }, [socket, projectId, showNotification]);
  
  const handleFileSelect = (file: FileItem) => {
    setSelectedFile(file);
    
    // Add to open files if not already open
    if (!openFiles.some(f => f.id === file.id)) {
      setOpenFiles([...openFiles, file]);
    }
  };
  
  const handleCloseFile = (fileId: number) => {
    setOpenFiles(openFiles.filter(file => file.id !== fileId));
    
    // If the closed file is the selected file, select the first remaining file
    if (selectedFile && selectedFile.id === fileId) {
      const remainingFiles = openFiles.filter(file => file.id !== fileId);
      if (remainingFiles.length > 0) {
        setSelectedFile(remainingFiles[0]);
      } else {
        setSelectedFile(undefined);
      }
    }
  };
  
  const handleCodeChange = async (fileId: number, code: string) => {
    // Update local file state
    setLocalFiles(prev => 
      prev.map(file => 
        file.id === fileId 
          ? { ...file, content: code }
          : file
      )
    );
    
    // Update open files state
    setOpenFiles(prev => 
      prev.map(file => 
        file.id === fileId 
          ? { ...file, content: code }
          : file
      )
    );
    
    // Send to server
    try {
      await apiRequest("PUT", `/api/projects/${projectId}/files/${fileId}`, { content: code });
      
      // Send update through WebSocket
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
          type: "file_update",
          projectId,
          fileId,
          content: code
        }));
      }
    } catch (error) {
      console.error("Error updating file:", error);
      showNotification({
        id: Date.now().toString(),
        type: "error",
        title: "خطأ",
        message: "حدث خطأ أثناء حفظ الملف",
        duration: 3000,
      });
    }
  };
  
  const handleCreateFile = async (parentId: number | null) => {
    const fileName = prompt("اسم الملف الجديد:");
    if (!fileName) return;
    
    try {
      const response = await apiRequest("POST", `/api/projects/${projectId}/files`, {
        name: fileName,
        parentId,
        content: ""
      });
      
      const newFile: FileItem = await response.json();
      setLocalFiles([...localFiles, newFile]);
      handleFileSelect(newFile);
      
      showNotification({
        id: Date.now().toString(),
        type: "success",
        title: "تم الإنشاء",
        message: `تم إنشاء الملف ${fileName} بنجاح`,
        duration: 3000,
      });
    } catch (error) {
      console.error("Error creating file:", error);
      showNotification({
        id: Date.now().toString(),
        type: "error",
        title: "خطأ",
        message: "حدث خطأ أثناء إنشاء الملف",
        duration: 3000,
      });
    }
  };
  
  const handleRenameFile = async (fileId: number) => {
    const file = localFiles.find(f => f.id === fileId);
    if (!file) return;
    
    const newName = prompt("اسم الملف الجديد:", file.name);
    if (!newName || newName === file.name) return;
    
    try {
      await apiRequest("PUT", `/api/projects/${projectId}/files/${fileId}`, {
        name: newName
      });
      
      // Update local state
      setLocalFiles(prev => 
        prev.map(f => 
          f.id === fileId 
            ? { ...f, name: newName }
            : f
        )
      );
      
      // Update open files
      setOpenFiles(prev => 
        prev.map(f => 
          f.id === fileId 
            ? { ...f, name: newName }
            : f
        )
      );
      
      showNotification({
        id: Date.now().toString(),
        type: "success",
        title: "تم التعديل",
        message: `تم تغيير اسم الملف إلى ${newName} بنجاح`,
        duration: 3000,
      });
    } catch (error) {
      console.error("Error renaming file:", error);
      showNotification({
        id: Date.now().toString(),
        type: "error",
        title: "خطأ",
        message: "حدث خطأ أثناء تغيير اسم الملف",
        duration: 3000,
      });
    }
  };
  
  const handleDeleteFile = async (fileId: number) => {
    if (!confirm("هل أنت متأكد من حذف هذا الملف؟")) return;
    
    try {
      await apiRequest("DELETE", `/api/projects/${projectId}/files/${fileId}`, null);
      
      // Remove from local state
      setLocalFiles(prev => prev.filter(f => f.id !== fileId));
      
      // Remove from open files
      handleCloseFile(fileId);
      
      showNotification({
        id: Date.now().toString(),
        type: "success",
        title: "تم الحذف",
        message: "تم حذف الملف بنجاح",
        duration: 3000,
      });
    } catch (error) {
      console.error("Error deleting file:", error);
      showNotification({
        id: Date.now().toString(),
        type: "error",
        title: "خطأ",
        message: "حدث خطأ أثناء حذف الملف",
        duration: 3000,
      });
    }
  };
  
  const handleRefreshPreview = () => {
    setRefreshPreview(prev => prev + 1);
  };
  
  if (projectLoading || filesLoading) {
    return <div className="container mx-auto px-4 py-8">جاري التحميل...</div>;
  }
  
  if (!project) {
    return <div className="container mx-auto px-4 py-8">مشروع غير موجود</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mt-4 bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
        <div className="p-4 bg-gray-100 dark:bg-gray-750 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-lg font-bold">{project.name}</h2>
          <div className="flex space-x-2 rtl:space-x-reverse">
            <button className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-1">
              <i className="ri-fullscreen-line"></i>
            </button>
            <button className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-1">
              <i className="ri-settings-3-line"></i>
            </button>
          </div>
        </div>

        <div className="flex h-[500px]">
          {/* File Explorer */}
          <FileExplorer 
            files={localFiles}
            selectedFile={selectedFile}
            onFileSelect={handleFileSelect}
            onCreateFile={handleCreateFile}
            onRenameFile={handleRenameFile}
            onDeleteFile={handleDeleteFile}
          />
          
          {/* Code Editor */}
          {selectedFile ? (
            <CodeEditor 
              file={selectedFile}
              openFiles={openFiles}
              onChangeCode={handleCodeChange}
              onCloseFile={handleCloseFile}
              onSelectFile={(id) => {
                const file = openFiles.find(f => f.id === id);
                if (file) setSelectedFile(file);
              }}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center bg-white dark:bg-gray-800">
              <div className="text-center">
                <i className="ri-file-list-line text-primary-500 text-4xl mb-2"></i>
                <p className="text-gray-500 dark:text-gray-400">اختر ملفاً للبدء في التحرير</p>
              </div>
            </div>
          )}
          
          {/* Preview Panel */}
          <PreviewPanel 
            files={localFiles}
            selectedFile={selectedFile}
            onRefresh={handleRefreshPreview}
          />
        </div>
        
        {/* Status Bar */}
        <div className="p-2 bg-gray-100 dark:bg-gray-750 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center space-x-4 rtl:space-x-reverse">
            <span>{project.type === "react" ? "React" : project.type}</span>
            <span>{selectedFile?.extension === "js" ? "JavaScript" : selectedFile?.extension || ""}</span>
            <span>UTF-8</span>
          </div>
          <div className="flex items-center space-x-4 rtl:space-x-reverse">
            <span>المتعاونون: {project.collaborators.length}</span>
            <span><i className="ri-git-branch-line ml-1"></i> main</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IDE;
