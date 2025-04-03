import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "../hooks/use-auth";
import { useLocation } from "wouter";

export default function NotFound() {
  const { user } = useAuth();
  const [_, navigate] = useLocation();

  // Redirect to auth if not logged in, otherwise show 404
  const handleBackClick = () => {
    if (user) {
      navigate('/');
    } else {
      navigate('/auth');
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-muted/5">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2 items-center">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <h1 className="text-2xl font-bold">404 الصفحة غير موجودة</h1>
          </div>

          <p className="mt-4 text-sm text-muted-foreground mb-4">
            الصفحة التي تبحث عنها غير موجودة أو قد تم نقلها.
          </p>
          
          <Button onClick={handleBackClick} className="w-full">
            {user ? 'العودة إلى الصفحة الرئيسية' : 'الذهاب إلى صفحة تسجيل الدخول'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
