import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Collaborator } from "@shared/schema";

interface CollaboratorItemProps {
  collaborator: Collaborator;
  onMessage?: (id: number) => void;
}

const CollaboratorItem: React.FC<CollaboratorItemProps> = ({ 
  collaborator, 
  onMessage
}) => {
  const formatLastSeen = (date: string | null) => {
    if (!date) return "متصل الآن";
    
    const now = new Date();
    const lastSeen = new Date(date);
    const diffTime = Math.abs(now.getTime() - lastSeen.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    
    if (diffDays > 0) {
      return `آخر ظهور: منذ ${diffDays} ${diffDays === 1 ? 'يوم' : 'أيام'}`;
    } else if (diffHours > 0) {
      return `آخر ظهور: منذ ${diffHours} ${diffHours === 1 ? 'ساعة' : 'ساعات'}`;
    } else {
      return 'آخر ظهور: منذ دقائق';
    }
  };

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center">
        <Avatar className="ml-3 w-10 h-10">
          <AvatarImage src={collaborator.avatarUrl} alt={collaborator.username} />
          <AvatarFallback>{collaborator.username.charAt(0)}</AvatarFallback>
        </Avatar>
        <div>
          <h3 className="font-medium">{collaborator.username}</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {collaborator.isOnline 
              ? "متصل الآن" 
              : formatLastSeen(collaborator.lastSeen)
            }
          </p>
        </div>
      </div>
      <div className="flex space-x-2 rtl:space-x-reverse">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => onMessage && onMessage(collaborator.id)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <i className="ri-message-2-line"></i>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>إرسال رسالة</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
};

export default CollaboratorItem;
