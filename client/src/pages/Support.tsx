import React from "react";
import { Card, CardContent } from "@/components/ui/card";

const Support: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">الدعم</h1>
      
      <Card className="bg-white dark:bg-gray-800 rounded-xl shadow">
        <CardContent className="p-8 text-center">
          <div className="mb-4">
            <i className="ri-customer-service-line text-primary-500 text-5xl"></i>
          </div>
          <h3 className="text-lg font-medium mb-2">مركز الدعم</h3>
          <p className="text-gray-500 dark:text-gray-400">
            نعمل على إضافة مركز الدعم قريباً، ترقبوا المزيد من التحديثات.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Support;
