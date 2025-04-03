import React from "react";
import { Link } from "wouter";
import { 
  Card, 
  CardContent
} from "@/components/ui/card";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ProjectWithCollaborators } from "@shared/schema";

interface ProjectCardProps {
  project: ProjectWithCollaborators;
  onProjectDelete?: (id: number) => void;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project, onProjectDelete }) => {
  const getIconForType = (type: string) => {
    switch (type) {
      case "html":
        return "ri-html5-line";
      case "react":
        return "ri-reactjs-line";
      case "vue":
        return "ri-vuejs-line";
      case "angular":
        return "ri-angularjs-line";
      case "node":
        return "ri-nodejs-line";
      default:
        return "ri-code-line";
    }
  };
  
  const getBgForType = (type: string) => {
    switch (type) {
      case "html":
        return "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300";
      case "react":
        return "bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-300";
      case "vue":
        return "bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300";
      case "angular":
        return "bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300";
      case "node":
        return "bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300";
      default:
        return "bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-300";
    }
  };
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "published":
        return <Badge className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300 hover:bg-green-100">منشور</Badge>;
      case "draft":
        return <Badge className="bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-300 hover:bg-yellow-100">مسودة</Badge>;
      case "archived":
        return <Badge className="bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-300 hover:bg-gray-100">مؤرشف</Badge>;
      default:
        return null;
    }
  };
  
  const formatLastUpdated = (date: string) => {
    const now = new Date();
    const updated = new Date(date);
    const diffTime = Math.abs(now.getTime() - updated.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    
    if (diffDays > 0) {
      return `منذ ${diffDays} ${diffDays === 1 ? 'يوم' : 'أيام'}`;
    } else if (diffHours > 0) {
      return `منذ ${diffHours} ${diffHours === 1 ? 'ساعة' : 'ساعات'}`;
    } else {
      return 'منذ دقائق';
    }
  };
  
  return (
    <Card className="group bg-gray-50 dark:bg-gray-750 border border-gray-200 dark:border-gray-700 hover:border-primary-400 dark:hover:border-primary-500 transition-all hover:shadow-md cursor-pointer relative">
      <CardContent className="p-4">
        <div className="absolute top-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                <i className="ri-more-2-fill"></i>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => window.location.href = `/ide/${project.id}`}>
                فتح في المحرر
              </DropdownMenuItem>
              <DropdownMenuItem>
                تغيير الإعدادات
              </DropdownMenuItem>
              <DropdownMenuItem className="text-red-500 focus:text-red-500" onClick={() => onProjectDelete && onProjectDelete(project.id)}>
                حذف المشروع
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        <div className="mb-3 flex items-center">
          <div className={`w-10 h-10 rounded-md flex items-center justify-center text-lg ml-3 ${getBgForType(project.type)}`}>
            <i className={getIconForType(project.type)}></i>
          </div>
          <div>
            <h3 className="font-medium">{project.name}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              آخر تعديل: {formatLastUpdated(project.updatedAt)}
            </p>
          </div>
        </div>
        
        <div className="text-sm text-gray-600 dark:text-gray-300">
          {project.description}
        </div>
        
        <div className="mt-3 flex justify-between items-center">
          <div className="flex -space-x-2 rtl:space-x-reverse">
            {project.collaborators.map((collaborator, index) => (
              <Avatar key={index} className="w-6 h-6 border-2 border-white dark:border-gray-800">
                <AvatarImage src={collaborator.avatarUrl} alt={collaborator.username} />
                <AvatarFallback>{collaborator.username.charAt(0)}</AvatarFallback>
              </Avatar>
            ))}
          </div>
          {getStatusBadge(project.status)}
        </div>
      </CardContent>
    </Card>
  );
};

export default ProjectCard;
