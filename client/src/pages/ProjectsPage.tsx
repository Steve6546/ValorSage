import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import ButtonRipple from "@/components/ui/button-ripple";
import ProjectCard from "@/components/ProjectCard";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNotification } from "@/contexts/NotificationContext";
import { apiRequest } from "@/lib/queryClient";
import { ProjectWithCollaborators } from "@shared/schema";

const ProjectsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { showNotification } = useNotification();
  const [_, navigate] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [newProject, setNewProject] = useState({
    name: "",
    description: "",
    type: "html"
  });
  
  // Fetch all projects
  const { data: projects = [], isLoading } = useQuery<ProjectWithCollaborators[]>({
    queryKey: ['/api/projects'],
  });
  
  // Create project mutation
  const createProjectMutation = useMutation({
    mutationFn: async (projectData: { name: string; description: string; type: string }) => {
      const response = await apiRequest("POST", "/api/projects", projectData);
      return response.json();
    },
    onSuccess: (data) => {
      // تحديث جميع البيانات المرتبطة بالمشاريع والأنشطة في جميع الصفحات
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects/recent'] });
      queryClient.invalidateQueries({ queryKey: ['/api/activities'] });
      
      console.log("تم إنشاء مشروع جديد بنجاح:", data);
      
      showNotification({
        id: Date.now().toString(),
        type: "success",
        title: "تم الإنشاء",
        message: "تم إنشاء المشروع بنجاح",
        duration: 3000,
      });
      
      setNewProjectOpen(false);
      navigate(`/ide/${data.id}`);
    },
    onError: (error) => {
      console.error("Error creating project:", error);
      showNotification({
        id: Date.now().toString(),
        type: "error",
        title: "خطأ",
        message: "حدث خطأ أثناء إنشاء المشروع",
        duration: 3000,
      });
    }
  });
  
  // Delete project mutation
  const deleteProjectMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/projects/${id}`, null);
      return id;
    },
    onSuccess: (id) => {
      // تحديث جميع البيانات المرتبطة بالمشاريع والأنشطة في جميع الصفحات
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects/recent'] });
      queryClient.invalidateQueries({ queryKey: ['/api/activities'] });
      
      console.log("تم حذف المشروع بنجاح:", id);
      
      showNotification({
        id: Date.now().toString(),
        type: "success",
        title: "تم الحذف",
        message: "تم حذف المشروع بنجاح",
        duration: 3000,
      });
    },
    onError: (error) => {
      console.error("Error deleting project:", error);
      showNotification({
        id: Date.now().toString(),
        type: "error",
        title: "خطأ",
        message: "حدث خطأ أثناء حذف المشروع",
        duration: 3000,
      });
    }
  });
  
  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProject.name.trim()) {
      showNotification({
        id: Date.now().toString(),
        type: "error",
        title: "خطأ",
        message: "يرجى إدخال اسم المشروع",
        duration: 3000,
      });
      return;
    }
    
    createProjectMutation.mutate(newProject);
  };
  
  const handleDeleteProject = (id: number) => {
    if (window.confirm("هل أنت متأكد من حذف هذا المشروع؟")) {
      deleteProjectMutation.mutate(id);
    }
  };
  
  const filteredProjects = projects.filter(project => 
    project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (project.description && project.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <h1 className="text-2xl font-bold mb-4 md:mb-0">المشاريع</h1>
        
        <div className="flex flex-col sm:flex-row w-full md:w-auto gap-3">
          <div className="relative w-full sm:w-auto">
            <Input
              type="text"
              placeholder="البحث في المشاريع..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-8 pl-3 py-2 rounded-md text-sm w-full"
            />
            <i className="ri-search-line absolute right-2.5 top-2.5 text-gray-500 dark:text-gray-400"></i>
          </div>
          
          <Dialog open={newProjectOpen} onOpenChange={setNewProjectOpen}>
            <DialogTrigger asChild>
              <ButtonRipple className="flex items-center">
                <i className="ri-add-line ml-1.5"></i>
                مشروع جديد
              </ButtonRipple>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>إنشاء مشروع جديد</DialogTitle>
                <DialogDescription>
                  املأ التفاصيل التالية لإنشاء مشروع جديد
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleCreateProject}>
                <div className="space-y-4 py-2">
                  <div className="space-y-2">
                    <Label htmlFor="project-name">اسم المشروع</Label>
                    <Input
                      id="project-name"
                      placeholder="أدخل اسم المشروع"
                      value={newProject.name}
                      onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="project-description">وصف المشروع</Label>
                    <Textarea
                      id="project-description"
                      placeholder="أدخل وصفاً مختصراً للمشروع"
                      value={newProject.description}
                      onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                      rows={3}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="project-type">نوع المشروع</Label>
                    <Select
                      value={newProject.type}
                      onValueChange={(value) => setNewProject({ ...newProject, type: value })}
                    >
                      <SelectTrigger id="project-type">
                        <SelectValue placeholder="اختر نوع المشروع" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="html">HTML / CSS / JavaScript</SelectItem>
                        <SelectItem value="react">React</SelectItem>
                        <SelectItem value="vue">Vue</SelectItem>
                        <SelectItem value="angular">Angular</SelectItem>
                        <SelectItem value="node">Node.js</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <DialogFooter>
                  <ButtonRipple type="submit" disabled={createProjectMutation.isPending}>
                    {createProjectMutation.isPending ? "جارِ الإنشاء..." : "إنشاء المشروع"}
                  </ButtonRipple>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      
      {isLoading ? (
        <div className="text-center py-10">جاري تحميل المشاريع...</div>
      ) : filteredProjects.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="mb-4">
              <i className="ri-folder-line text-primary-500 text-5xl"></i>
            </div>
            <h3 className="text-lg font-medium mb-2">
              {searchTerm ? "لا توجد نتائج بحث" : "لا توجد مشاريع بعد"}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              {searchTerm
                ? "حاول استخدام كلمات بحث مختلفة"
                : "قم بإنشاء مشروع جديد للبدء في التطوير"
              }
            </p>
            {!searchTerm && (
              <ButtonRipple onClick={() => setNewProjectOpen(true)}>
                <i className="ri-add-line ml-1.5"></i>
                إنشاء مشروع جديد
              </ButtonRipple>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onProjectDelete={handleDeleteProject}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ProjectsPage;
