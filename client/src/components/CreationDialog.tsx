import * as React from "react";
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileType } from "@shared/schema";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CreationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (name: string, extension: string, type: FileType) => void;
  resourceType: FileType;
  parentFolder?: string;
}

const DEFAULT_EXTENSIONS = {
  "HTML": "html",
  "CSS": "css",
  "JavaScript": "js",
  "TypeScript": "ts",
  "React": "jsx",
  "React TypeScript": "tsx",
  "JSON": "json",
  "Markdown": "md",
  "Text": "txt",
  "Python": "py",
};

const CreationDialog: React.FC<CreationDialogProps> = ({
  open,
  onOpenChange,
  onConfirm,
  resourceType,
  parentFolder,
}) => {
  const [name, setName] = useState("");
  const [selectedExtension, setSelectedExtension] = useState("js");
  const [customExtension, setCustomExtension] = useState("");
  const [extensionType, setExtensionType] = useState<"predefined" | "custom">("predefined");
  const nameInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && nameInputRef.current) {
      // Focus the name input when the dialog opens
      setTimeout(() => {
        nameInputRef.current?.focus();
      }, 100);
    }
  }, [open]);

  useEffect(() => {
    // Reset form when dialog opens
    if (open) {
      setName("");
      setSelectedExtension("js");
      setCustomExtension("");
      setExtensionType("predefined");
    }
  }, [open]);

  const handleConfirm = () => {
    if (!name.trim()) return;
    
    // For directories, no extension is needed
    if (resourceType === FileType.DIRECTORY) {
      onConfirm(name, "", FileType.DIRECTORY);
      onOpenChange(false);
      return;
    }
    
    // For files, get the extension
    const extension = extensionType === "predefined" 
      ? selectedExtension 
      : customExtension.replace(/^\./, ""); // Remove leading dot if present
    
    onConfirm(name, extension, FileType.FILE);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {resourceType === FileType.DIRECTORY ? "إنشاء مجلد جديد" : "إنشاء ملف جديد"}
          </DialogTitle>
          <DialogDescription>
            {resourceType === FileType.DIRECTORY
              ? "أدخل اسمًا للمجلد الجديد"
              : "أدخل اسمًا وامتدادًا للملف الجديد"}
            {parentFolder && ` في ${parentFolder}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="name">الاسم</Label>
            <Input
              id="name"
              ref={nameInputRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={resourceType === FileType.DIRECTORY ? "مجلد_جديد" : "ملف_جديد"}
            />
          </div>

          {resourceType === FileType.FILE && (
            <div className="space-y-2">
              <Label>نوع الملف</Label>
              <div className="flex space-x-2 rtl:space-x-reverse">
                <Select
                  value={extensionType}
                  onValueChange={(value) => setExtensionType(value as "predefined" | "custom")}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="نوع الامتداد" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="predefined">امتداد قياسي</SelectItem>
                    <SelectItem value="custom">امتداد مخصص</SelectItem>
                  </SelectContent>
                </Select>

                {extensionType === "predefined" ? (
                  <Select
                    value={selectedExtension}
                    onValueChange={setSelectedExtension}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="اختر امتداد" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(DEFAULT_EXTENSIONS).map(([name, ext]) => (
                        <SelectItem key={ext} value={ext}>
                          {name} (.{ext})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={customExtension}
                    onChange={(e) => setCustomExtension(e.target.value)}
                    placeholder="أدخل امتداد مخصص"
                    className="flex-1"
                  />
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
          <Button onClick={handleConfirm}>
            إنشاء
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreationDialog;