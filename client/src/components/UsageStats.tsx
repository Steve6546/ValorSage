import React from "react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { UsageStats } from "@shared/schema";

interface UsageStatsProps {
  stats: UsageStats;
}

const UsageStatsComponent: React.FC<UsageStatsProps> = ({ stats }) => {
  return (
    <div className="space-y-4">
      {/* Storage Usage */}
      <div>
        <div className="flex justify-between mb-1">
          <span className="text-sm font-medium">المساحة التخزينية</span>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {stats.storage.used} / {stats.storage.total}
          </span>
        </div>
        <Progress 
          value={(stats.storage.usedPercent)} 
          className="w-full bg-gray-200 dark:bg-gray-700 h-2.5 rounded-full" 
        />
      </div>
      
      {/* Projects */}
      <div>
        <div className="flex justify-between mb-1">
          <span className="text-sm font-medium">المشاريع</span>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {stats.projects.count} / {stats.projects.limit}
          </span>
        </div>
        <Progress 
          value={(stats.projects.usedPercent)} 
          className="w-full bg-gray-200 dark:bg-gray-700 h-2.5 rounded-full" 
        />
      </div>
      
      {/* Collaborators */}
      <div>
        <div className="flex justify-between mb-1">
          <span className="text-sm font-medium">المتعاونون</span>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {stats.collaborators.count} / {stats.collaborators.limit}
          </span>
        </div>
        <Progress 
          value={(stats.collaborators.usedPercent)} 
          className="w-full bg-gray-200 dark:bg-gray-700 h-2.5 rounded-full" 
        />
      </div>
      
      <Button variant="link" className="mt-4 text-primary-500 p-0 h-auto text-sm font-medium hover:underline flex items-center">
        ترقية للحصول على المزيد من الموارد
        <i className="ri-arrow-left-line mr-1"></i>
      </Button>
    </div>
  );
};

export default UsageStatsComponent;
