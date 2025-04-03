import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import ButtonRipple from "@/components/ui/button-ripple";
import ProjectCard from "@/components/ProjectCard";
import ActivityItem from "@/components/ActivityItem";
import UsageStatsComponent from "@/components/UsageStats";
import CollaboratorItem from "@/components/CollaboratorItem";
import QuickLinks from "@/components/QuickLinks";
import { useNotification } from "@/contexts/NotificationContext";
import { RecentProject, Activity, UsageStats, Collaborator, Project } from "@shared/schema";
import { useLocation } from "wouter";

const Dashboard: React.FC = () => {
  const { showNotification } = useNotification();
  const [_, navigate] = useLocation();
  
  // Fetch recent projects
  const { data: projects = [], isLoading: projectsLoading } = useQuery<RecentProject[]>({
    queryKey: ['/api/projects/recent'],
  });

  // Fetch activities
  const { data: activities = [], isLoading: activitiesLoading } = useQuery<Activity[]>({
    queryKey: ['/api/activities'],
  });

  // Fetch usage stats
  const { data: usageStats, isLoading: statsLoading } = useQuery<UsageStats>({
    queryKey: ['/api/stats/usage'],
  });

  // Fetch collaborators
  const { data: collaborators = [], isLoading: collaboratorsLoading } = useQuery<Collaborator[]>({
    queryKey: ['/api/collaborators'],
  });
  
  const handleCreateProject = () => {
    navigate("/projects/new");
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
    // Delete project API call would go here
    showNotification({
      id: Date.now().toString(),
      type: "success",
      title: "تم الحذف",
      message: "تم حذف المشروع بنجاح",
      duration: 3000,
    });
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
                <h1 className="text-2xl font-bold mb-2">مرحباً، أحمد!</h1>
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
    </main>
  );
};

export default Dashboard;
