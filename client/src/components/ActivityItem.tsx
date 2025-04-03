import React from "react";
import { cn } from "@/lib/utils";
import { Activity } from "@shared/schema";

interface ActivityItemProps {
  activity: Activity;
  isLast?: boolean;
}

const ActivityItem: React.FC<ActivityItemProps> = ({ activity, isLast = false }) => {
  const getIconForType = (type: string) => {
    switch (type) {
      case "save":
        return "ri-save-line";
      case "publish":
        return "ri-upload-cloud-line";
      case "collaborate":
        return "ri-team-line";
      case "create":
        return "ri-add-line";
      case "update":
        return "ri-edit-line";
      case "delete":
        return "ri-delete-bin-line";
      default:
        return "ri-history-line";
    }
  };
  
  const getBgForType = (type: string) => {
    switch (type) {
      case "save":
        return "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300";
      case "publish":
        return "bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300";
      case "collaborate":
        return "bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-300";
      case "create":
        return "bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300";
      case "update":
        return "bg-yellow-100 dark:bg-yellow-900 text-yellow-600 dark:text-yellow-300";
      case "delete":
        return "bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300";
      default:
        return "bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-300";
    }
  };
  
  const formatTimestamp = (date: string) => {
    const now = new Date();
    const timestamp = new Date(date);
    const diffTime = Math.abs(now.getTime() - timestamp.getTime());
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
    <div className="flex">
      <div className="ml-4 flex flex-col items-center">
        <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", getBgForType(activity.type))}>
          <i className={getIconForType(activity.type)}></i>
        </div>
        {!isLast && <div className="w-px h-full bg-gray-300 dark:bg-gray-700 mt-2"></div>}
      </div>
      <div className="flex-1">
        <h3 className="font-medium">{activity.title}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {formatTimestamp(activity.timestamp)} · {activity.by}
        </p>
        {activity.details && (
          <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-750 rounded-md text-sm">
            {activity.type === "publish" && activity.projectUrl ? (
              <div className="flex items-center">
                <i className="ri-link text-gray-500 ml-1"></i>
                <a href={activity.projectUrl} className="text-primary-500 hover:underline" target="_blank" rel="noopener noreferrer">
                  {activity.projectUrl}
                </a>
              </div>
            ) : (
              activity.details
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityItem;
