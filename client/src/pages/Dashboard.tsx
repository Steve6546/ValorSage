import React, { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import ButtonRipple from "@/components/ui/button-ripple";
import ProjectCard from "@/components/ProjectCard";
import ActivityItem from "@/components/ActivityItem";
import UsageStatsComponent from "@/components/UsageStats";
import CollaboratorItem from "@/components/CollaboratorItem";
import QuickLinks from "@/components/QuickLinks";
import { useNotification } from "@/contexts/NotificationContext";
import { RecentProject, Activity, UsageStats, Collaborator, Project, ProjectType } from "@shared/schema";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const Dashboard: React.FC = () => {
  const { showNotification } = useNotification();
  const { user } = useAuth();
  const [location, navigate] = useLocation();
  
  // تحديث البيانات عند تحميل الصفحة أو العودة إليها
  useEffect(() => {
    // عند تحميل الصفحة، تأكد من تحديث البيانات
    if (user) {
      console.log("تحديث بيانات Dashboard للمستخدم:", user.username);
      
      // تحديث جميع البيانات المطلوبة في لوحة التحكم في كل مرة يتم فيها عرض الصفحة
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects/recent'] });
      queryClient.invalidateQueries({ queryKey: ['/api/activities'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats/usage'] });
      queryClient.invalidateQueries({ queryKey: ['/api/collaborators'] });
    }
  }, [user, location]); // إضافة location للتحديث عند تغيير الصفحة والعودة للداشبورد
  
  // Fetch recent projects
  const { data: projects = [], isLoading: projectsLoading } = useQuery<RecentProject[]>({
    queryKey: ['/api/projects/recent'],
    enabled: !!user, // Only fetch when user is authenticated
  });

  // Fetch activities
  const { data: activities = [], isLoading: activitiesLoading } = useQuery<Activity[]>({
    queryKey: ['/api/activities'],
    enabled: !!user, // Only fetch when user is authenticated
  });

  // Fetch usage stats
  const { data: usageStats, isLoading: statsLoading } = useQuery<UsageStats>({
    queryKey: ['/api/stats/usage'],
    enabled: !!user, // Only fetch when user is authenticated
  });

  // Fetch collaborators
  const { data: collaborators = [], isLoading: collaboratorsLoading } = useQuery<Collaborator[]>({
    queryKey: ['/api/collaborators'],
    enabled: !!user, // Only fetch when user is authenticated
  });
  
  // Delete project mutation
  const deleteProjectMutation = useMutation<number, Error, number>({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/projects/${id}`);
      return id;
    },
    onSuccess: (id) => {
      // تحديث جميع البيانات المرتبطة بالمشاريع والأنشطة في جميع الصفحات
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects/recent'] });
      queryClient.invalidateQueries({ queryKey: ['/api/activities'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats/usage'] });
      
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
        variant: "destructive",
        duration: 3000,
      });
    }
  });
  
  // استيراد أدوات نافذة الحوار
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [newProject, setNewProject] = useState({
    name: "",
    description: "",
    type: "html"
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
      queryClient.invalidateQueries({ queryKey: ['/api/stats/usage'] });
      
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
  
  const handleCreateProjectSubmit = (e: React.FormEvent) => {
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
  
  // فتح نافذة إنشاء مشروع جديد
  const handleCreateProject = () => {
    setNewProjectOpen(true);
  };
  
  const handleImportProject = () => {
    showNotification({
      id: Date.now().toString(),
      type: "info",
      title: "قريباً",
      message: "سيتم إضافة ميزة استيراد المشاريع قريباً",
      duration: 3000,
    });
  };
  
  const handleProjectDelete = (id: number) => {
    if (window.confirm("هل أنت متأكد من حذف هذا المشروع؟")) {
      deleteProjectMutation.mutate(id);
    }
  };
  
  const handleMessageCollaborator = (id: number) => {
    showNotification({
      id: Date.now().toString(),
      type: "info",
      title: "قريباً",
      message: "سيتم إضافة ميزة المراسلة قريباً",
      duration: 3000,
    });
  };

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Projects & Activities */}
        <div className="lg:col-span-2 space-y-6">
          {/* Welcome Section */}
          <section className="bg-gradient-to-r from-primary-500 to-accent-500 rounded-xl p-6 text-white shadow-lg">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-bold mb-2">مرحباً، {user?.username || 'المستخدم'}!</h1>
                <p className="mb-4 opacity-90">استكمل مشاريعك أو أنشئ مشروعاً جديداً للبدء.</p>
                
                {/* Action Buttons */}
                <div className="flex flex-wrap gap-3 mt-4">
                  <ButtonRipple
                    variant="default"
                    className="bg-white text-primary-700 font-medium px-4 py-2 rounded-md hover:bg-opacity-95 transition-colors flex items-center"
                    onClick={handleCreateProject}
                  >
                    <i className="ri-add-line ml-1.5"></i>
                    مشروع جديد
                  </ButtonRipple>
                  <ButtonRipple
                    variant="secondary"
                    className="bg-white bg-opacity-20 text-white font-medium px-4 py-2 rounded-md hover:bg-opacity-30 transition-colors flex items-center"
                    onClick={handleImportProject}
                  >
                    <i className="ri-folder-open-line ml-1.5"></i>
                    استيراد مشروع
                  </ButtonRipple>
                </div>
              </div>
              <div className="hidden md:block">
                <img src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=120&q=80" alt="Code illustration" className="w-24 h-24 object-cover rounded-lg shadow-md" />
              </div>
            </div>
          </section>

          {/* Recent Projects */}
          <Card className="bg-white dark:bg-gray-800 rounded-xl shadow">
            <CardContent className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">المشاريع الحديثة</h2>
                <ButtonRipple 
                  variant="link" 
                  className="text-primary-500 text-sm font-medium hover:underline flex items-center p-0"
                  onClick={() => navigate("/projects")}
                >
                  عرض الكل
                  <i className="ri-arrow-left-line mr-1"></i>
                </ButtonRipple>
              </div>
              
              {/* Projects List */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {projectsLoading ? (
                  <p>جاري تحميل المشاريع...</p>
                ) : projects.length === 0 ? (
                  <p>لا توجد مشاريع حالياً. قم بإنشاء مشروع جديد للبدء.</p>
                ) : (
                  projects.map((project) => (
                    <ProjectCard 
                      key={project.id} 
                      project={project} 
                      onProjectDelete={handleProjectDelete}
                    />
                  ))
                )}
              </div>
            </CardContent>
          </Card>
          
          {/* Recent Activity */}
          <Card className="bg-white dark:bg-gray-800 rounded-xl shadow">
            <CardContent className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">النشاطات الحديثة</h2>
                <ButtonRipple 
                  variant="link" 
                  className="text-primary-500 text-sm font-medium hover:underline flex items-center p-0"
                  onClick={() => navigate("/activities")}
                >
                  المزيد
                  <i className="ri-arrow-left-line mr-1"></i>
                </ButtonRipple>
              </div>
              
              {/* Activity Timeline */}
              <div className="space-y-6">
                {activitiesLoading ? (
                  <p>جاري تحميل النشاطات...</p>
                ) : activities.length === 0 ? (
                  <p>لا توجد نشاطات حالياً.</p>
                ) : (
                  activities.map((activity, index) => (
                    <ActivityItem 
                      key={activity.id}
                      activity={activity}
                      isLast={index === activities.length - 1}
                    />
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Right Column - Stats & Resources */}
        <div className="space-y-6">
          {/* Usage Statistics */}
          <Card className="bg-white dark:bg-gray-800 rounded-xl shadow">
            <CardContent className="p-6">
              <h2 className="text-xl font-bold mb-6">إحصائيات الاستخدام</h2>
              
              {statsLoading ? (
                <p>جاري تحميل الإحصائيات...</p>
              ) : !usageStats ? (
                <p>لا توجد إحصائيات متاحة حالياً.</p>
              ) : (
                <UsageStatsComponent stats={usageStats} />
              )}
            </CardContent>
          </Card>
          
          {/* Recent Collaborators */}
          <Card className="bg-white dark:bg-gray-800 rounded-xl shadow">
            <CardContent className="p-6">
              <h2 className="text-xl font-bold mb-6">المتعاونون</h2>
              
              <div className="space-y-4">
                {collaboratorsLoading ? (
                  <p>جاري تحميل المتعاونين...</p>
                ) : collaborators.length === 0 ? (
                  <p>لا يوجد متعاونون حالياً.</p>
                ) : (
                  collaborators.map((collaborator) => (
                    <CollaboratorItem
                      key={collaborator.id}
                      collaborator={collaborator}
                      onMessage={handleMessageCollaborator}
                    />
                  ))
                )}
              </div>
              
              <ButtonRipple
                className="mt-4 w-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-medium px-4 py-2 rounded-md transition-colors flex items-center justify-center"
                onClick={() => navigate("/collaborators/invite")}
              >
                <i className="ri-user-add-line ml-1.5"></i>
                دعوة متعاون جديد
              </ButtonRipple>
            </CardContent>
          </Card>
          
          {/* Quick Links */}
          <Card className="bg-white dark:bg-gray-800 rounded-xl shadow">
            <CardContent className="p-6">
              <h2 className="text-xl font-bold mb-4">روابط سريعة</h2>
              <QuickLinks />
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* نافذة إنشاء مشروع جديد */}
      <Dialog open={newProjectOpen} onOpenChange={setNewProjectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إنشاء مشروع جديد</DialogTitle>
            <DialogDescription>
              املأ التفاصيل التالية لإنشاء مشروع جديد
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleCreateProjectSubmit}>
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
                    <SelectItem value="nodejs">Node.js</SelectItem>
                    <SelectItem value="typescript">TypeScript</SelectItem>
                    <SelectItem value="python">Python</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <DialogFooter className="mt-4">
              <ButtonRipple type="submit" disabled={createProjectMutation.isPending}>
                {createProjectMutation.isPending ? "جارِ الإنشاء..." : "إنشاء المشروع"}
              </ButtonRipple>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  );
};

export default Dashboard;
