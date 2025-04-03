import React, { useState, useEffect, useCallback } from "react";
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
  const { data: project, isLoading: projectLoading } = useQuery<Project & { collaborators: any[] }>({
    queryKey: [`/api/projects/${projectId}`],
  });
  
  // Fetch project files
  const { data: files = [], isLoading: filesLoading } = useQuery<FileItem[]>({
    queryKey: [`/api/projects/${projectId}/files`]
  });
  
  // Define file selection function
  const handleFileSelect = useCallback((file: FileItem) => {
    setSelectedFile(file);
    
    // Add to open files if not already open
    if (!openFiles.some(f => f.id === file.id)) {
      setOpenFiles(prevFiles => [...prevFiles, file]);
    }
  }, [openFiles]);
  
  // Set local files when data is loaded
  useEffect(() => {
    if (files && files.length > 0) {
      setLocalFiles(files);
      
      // Open index.html by default if it exists
      const indexFile = files.find(file => file.name === "index.html");
      if (indexFile) {
        // Directly set the selected file and update open files
        setSelectedFile(indexFile);
        
        // Add to open files if not already open
        if (!openFiles.some(f => f.id === indexFile.id)) {
          setOpenFiles(prevFiles => [...prevFiles, indexFile]);
        }
      }
    }
  }, [files, openFiles]);
  
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
    <div className="h-screen flex flex-col bg-[#1e1e1e] text-white overflow-hidden">
      {/* Header/Toolbar */}
      <div className="bg-[#252526] border-b border-[#3c3c3c] flex justify-between items-center p-2 shadow-md">
        <div className="flex items-center">
          <h1 className="text-lg font-bold mr-4">{project.name}</h1>
          <div className="flex space-x-1">
            <button className="px-3 py-1 rounded hover:bg-[#3c3c3c] transition-colors text-sm">File</button>
            <button className="px-3 py-1 rounded hover:bg-[#3c3c3c] transition-colors text-sm">Edit</button>
            <button className="px-3 py-1 rounded hover:bg-[#3c3c3c] transition-colors text-sm">View</button>
            <button className="px-3 py-1 rounded hover:bg-[#3c3c3c] transition-colors text-sm">Run</button>
            <button className="px-3 py-1 rounded hover:bg-[#3c3c3c] transition-colors text-sm">Share</button>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button onClick={handleRefreshPreview} className="p-2 rounded hover:bg-[#3c3c3c] transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          <button className="p-2 rounded hover:bg-[#3c3c3c] transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
            </svg>
          </button>
          <button className="p-2 rounded hover:bg-[#3c3c3c] transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* File Explorer */}
        <div className="w-[250px] bg-[#252526] border-r border-[#3c3c3c] flex flex-col">
          <div className="p-2 border-b border-[#3c3c3c] flex justify-between items-center">
            <h2 className="font-medium text-sm uppercase">Files</h2>
            <button 
              onClick={() => handleCreateFile(null)} 
              className="p-1 rounded hover:bg-[#3c3c3c] transition-colors"
              title="New File"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <FileExplorer 
              files={localFiles}
              selectedFile={selectedFile}
              onFileSelect={handleFileSelect}
              onCreateFile={handleCreateFile}
              onRenameFile={handleRenameFile}
              onDeleteFile={handleDeleteFile}
            />
          </div>
        </div>

        {/* Editor Area */}
        <div className="flex-1 flex flex-col">
          {/* Tabs */}
          <div className="bg-[#1e1e1e] border-b border-[#3c3c3c] flex">
            {openFiles.map(file => (
              <div 
                key={file.id} 
                className={`px-3 py-2 flex items-center space-x-1 border-r border-[#3c3c3c] cursor-pointer ${selectedFile?.id === file.id ? 'bg-[#1e1e1e]' : 'bg-[#2d2d2d]'}`}
                onClick={() => setSelectedFile(file)}
              >
                <span className="text-sm truncate max-w-[100px]">{file.name}</span>
                <button 
                  className="ml-1 text-[#6e6e6e] hover:text-white" 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCloseFile(file.id);
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>

          {/* Editor Content */}
          <div className="flex-1 overflow-hidden">
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
              <div className="flex items-center justify-center h-full bg-[#1e1e1e]">
                <div className="text-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-[#6e6e6e] mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-[#6e6e6e]">اختر ملفاً للبدء في التحرير</p>
                  <button 
                    onClick={() => handleCreateFile(null)}
                    className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm font-medium transition-colors"
                  >
                    إنشاء ملف جديد
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Preview Panel */}
        <div className="w-1/2 bg-white border-l border-[#3c3c3c]">
          <div className="p-2 bg-[#252526] border-b border-[#3c3c3c] flex justify-between items-center">
            <h2 className="font-medium text-sm uppercase">Preview</h2>
            <button 
              onClick={handleRefreshPreview}
              className="p-1 rounded hover:bg-[#3c3c3c] transition-colors"
              title="Refresh Preview"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
          <PreviewPanel 
            files={localFiles}
            selectedFile={selectedFile}
            onRefresh={handleRefreshPreview}
          />
        </div>
      </div>

      {/* Status Bar */}
      <div className="bg-[#007acc] text-white text-xs px-4 py-1 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <span>{project.type === "react" ? "React" : project.type}</span>
          <span>{selectedFile?.extension === "js" ? "JavaScript" : selectedFile?.extension || ""}</span>
          <span>UTF-8</span>
          <span>{openFiles.length} open files</span>
        </div>
        <div className="flex items-center space-x-4">
          <span>متعاونون: {project.collaborators.length}</span>
          <span><svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg> main</span>
        </div>
      </div>
    </div>
  );
};

export default IDE;
