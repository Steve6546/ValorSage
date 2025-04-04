import { useAuth } from "../hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";

export function ProtectedRoute({
  path,
  component: Component,
}: {
  path: string;
  component: () => React.JSX.Element;
}) {
  try {
    const { user, isLoading } = useAuth();
    
    // تعامل أفضل مع حالة التحميل - عرض شاشة التحميل وعدم إعادة التوجيه مباشرة
    if (isLoading) {
      return (
        <Route path={path}>
          <div className="flex flex-col items-center justify-center min-h-screen">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">جاري تحميل بيانات المستخدم...</p>
          </div>
        </Route>
      );
    }

    // فقط إعادة التوجيه إذا كنا متأكدين من عدم وجود مستخدم (بعد انتهاء حالة التحميل)
    if (!user) {
      console.log("ProtectedRoute: No user found, redirecting to auth", { user, isLoading });
      return (
        <Route path={path}>
          <Redirect to="/auth" />
        </Route>
      );
    }

    // عرض المكون المحمي إذا كان المستخدم موجوداً
    console.log("ProtectedRoute: User found, rendering protected component", { user });
    return <Route path={path} component={Component} />;
  } catch (error) {
    console.error("ProtectedRoute error:", error);
    // توجيه احتياطي في حالة حدوث خطأ
    return (
      <Route path={path}>
        <Redirect to="/auth" />
      </Route>
    );
  }
}