import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest, getQueryFn } from "../lib/queryClient";
import { Label } from "@/components/ui/label";
import { insertUserSchema, User } from "@shared/schema";
import { EyeIcon, EyeOffIcon } from "lucide-react";

// Extended schemas with validation
const loginSchema = z.object({
  username: z.string().min(3, { message: "اسم المستخدم يجب أن يكون 3 أحرف على الأقل" }),
  password: z.string().min(6, { message: "كلمة المرور يجب أن تكون 6 أحرف على الأقل" }),
});

const registerSchema = insertUserSchema.extend({
  password: z.string().min(6, { message: "كلمة المرور يجب أن تكون 6 أحرف على الأقل" }),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "كلمات المرور غير متطابقة",
  path: ["confirmPassword"],
});

type LoginValues = z.infer<typeof loginSchema>;
type RegisterValues = z.infer<typeof registerSchema>;

const AuthPage: React.FC = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>("login");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [_, navigate] = useLocation();

  // Check if user is already logged in
  const { data: user, isLoading } = useQuery<User | undefined>({
    queryKey: ['/api/user'],
    queryFn: getQueryFn({ on401: "returnNull" }),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: false, // Don't retry on 401
  });
  
  // Redirect if already logged in
  useEffect(() => {
    if (user && !isLoading && typeof user === 'object' && 'id' in user) {
      navigate('/');
    }
  }, [user, isLoading, navigate]);

  // Login form
  const loginForm = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  // Register form
  const registerForm = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      password: "",
      confirmPassword: "",
      avatarUrl: "/avatars/default.png",
    },
  });

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (values: LoginValues) => {
      return apiRequest("POST", "/api/login", values);
    },
    onSuccess: (response) => {
      response.json().then(data => {
        toast({
          title: "تم تسجيل الدخول بنجاح",
          description: `مرحبًا ${data.username}! 👋`,
        });
        queryClient.invalidateQueries({ queryKey: ['/api/user'] });
        navigate('/');
      });
    },
    onError: (error) => {
      toast({
        title: "فشل تسجيل الدخول",
        description: "اسم المستخدم أو كلمة المرور غير صحيحة",
        variant: "destructive",
      });
    },
  });

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: async (values: RegisterValues) => {
      const { confirmPassword, ...registerData } = values;
      return apiRequest("POST", "/api/register", registerData);
    },
    onSuccess: (response) => {
      response.json().then(data => {
        toast({
          title: "تم إنشاء الحساب بنجاح",
          description: `مرحباً ${data.username}، تم إنشاء حسابك بنجاح!`,
        });
        queryClient.invalidateQueries({ queryKey: ['/api/user'] });
        navigate('/');
      });
    },
    onError: (error) => {
      toast({
        title: "فشل إنشاء الحساب",
        description: "حدث خطأ أثناء إنشاء الحساب. قد يكون اسم المستخدم موجوداً بالفعل.",
        variant: "destructive",
      });
    },
  });

  const onLoginSubmit = (values: LoginValues) => {
    loginMutation.mutate(values);
  };

  const onRegisterSubmit = (values: RegisterValues) => {
    registerMutation.mutate(values);
  };

  // Redirect if already logged in
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (user) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row items-stretch">
      {/* Left side - Forms */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white dark:bg-gray-900">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold tracking-tight mb-2">مرحباً بك في كودر التفاعلية</h1>
            <p className="text-muted-foreground">منصة البرمجة التفاعلية ومشاركة الكود</p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="login">تسجيل الدخول</TabsTrigger>
              <TabsTrigger value="register">إنشاء حساب</TabsTrigger>
            </TabsList>

            {/* Login Form */}
            <TabsContent value="login">
              <Card>
                <CardHeader>
                  <CardTitle>تسجيل الدخول</CardTitle>
                  <CardDescription>
                    قم بتسجيل الدخول للوصول إلى مشاريعك
                  </CardDescription>
                </CardHeader>
                <form onSubmit={loginForm.handleSubmit(onLoginSubmit)}>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-username">اسم المستخدم</Label>
                      <Input
                        id="login-username"
                        type="text"
                        placeholder="أدخل اسم المستخدم"
                        {...loginForm.register("username")}
                      />
                      {loginForm.formState.errors.username && (
                        <p className="text-sm text-red-500">
                          {loginForm.formState.errors.username.message}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="login-password">كلمة المرور</Label>
                      <div className="relative">
                        <Input
                          id="login-password"
                          type={showLoginPassword ? "text" : "password"}
                          placeholder="أدخل كلمة المرور"
                          {...loginForm.register("password")}
                        />
                        <button
                          type="button"
                          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-800 dark:hover:text-gray-300"
                          onClick={() => setShowLoginPassword(!showLoginPassword)}
                          tabIndex={-1}
                        >
                          {showLoginPassword ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
                        </button>
                      </div>
                      {loginForm.formState.errors.password && (
                        <p className="text-sm text-red-500">
                          {loginForm.formState.errors.password.message}
                        </p>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={loginMutation.isPending}
                    >
                      {loginMutation.isPending ? "جاري تسجيل الدخول..." : "تسجيل الدخول"}
                    </Button>
                  </CardFooter>
                </form>
              </Card>
            </TabsContent>

            {/* Register Form */}
            <TabsContent value="register">
              <Card>
                <CardHeader>
                  <CardTitle>إنشاء حساب جديد</CardTitle>
                  <CardDescription>
                    أنشئ حساباً جديداً لبدء رحلتك البرمجية
                  </CardDescription>
                </CardHeader>
                <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)}>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="register-username">اسم المستخدم</Label>
                      <Input
                        id="register-username"
                        type="text"
                        placeholder="أدخل اسم المستخدم"
                        {...registerForm.register("username")}
                      />
                      {registerForm.formState.errors.username && (
                        <p className="text-sm text-red-500">
                          {registerForm.formState.errors.username.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="register-password">كلمة المرور</Label>
                      <div className="relative">
                        <Input
                          id="register-password"
                          type={showRegisterPassword ? "text" : "password"}
                          placeholder="أدخل كلمة المرور"
                          {...registerForm.register("password")}
                        />
                        <button
                          type="button"
                          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-800 dark:hover:text-gray-300"
                          onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                          tabIndex={-1}
                        >
                          {showRegisterPassword ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
                        </button>
                      </div>
                      {registerForm.formState.errors.password && (
                        <p className="text-sm text-red-500">
                          {registerForm.formState.errors.password.message}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="register-confirm-password">تأكيد كلمة المرور</Label>
                      <div className="relative">
                        <Input
                          id="register-confirm-password"
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="أدخل كلمة المرور مرة أخرى"
                          {...registerForm.register("confirmPassword")}
                        />
                        <button
                          type="button"
                          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-800 dark:hover:text-gray-300"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          tabIndex={-1}
                        >
                          {showConfirmPassword ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
                        </button>
                      </div>
                      {registerForm.formState.errors.confirmPassword && (
                        <p className="text-sm text-red-500">
                          {registerForm.formState.errors.confirmPassword.message}
                        </p>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={registerMutation.isPending}
                    >
                      {registerMutation.isPending ? "جاري إنشاء الحساب..." : "إنشاء حساب"}
                    </Button>
                  </CardFooter>
                </form>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Right side - Hero/Feature Showcase */}
      <div className="flex-1 bg-gradient-to-br from-primary-500 to-primary-700 p-8 flex items-center justify-center text-white hidden md:flex">
        <div className="max-w-lg">
          <h1 className="text-4xl font-bold mb-6">منصة كودر التفاعلية</h1>
          <p className="text-xl mb-8">
            أنشئ وشارك وتعاون على مشاريع البرمجة الخاصة بك في بيئة تفاعلية متكاملة
          </p>
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white/10 p-4 rounded-lg backdrop-blur-sm">
              <h3 className="text-lg font-medium mb-2">محرر برمجة ذكي</h3>
              <p>محرر برمجي متطور مع إكمال تلقائي للكود ودعم متعدد اللغات</p>
            </div>
            <div className="bg-white/10 p-4 rounded-lg backdrop-blur-sm">
              <h3 className="text-lg font-medium mb-2">مشاركة وتعاون</h3>
              <p>شارك مشاريعك وتعاون مع مطورين آخرين في الوقت الفعلي</p>
            </div>
            <div className="bg-white/10 p-4 rounded-lg backdrop-blur-sm">
              <h3 className="text-lg font-medium mb-2">تنفيذ كود مباشر</h3>
              <p>شاهد نتائج كودك مباشرة أثناء الكتابة بتحديثات فورية</p>
            </div>
            <div className="bg-white/10 p-4 rounded-lg backdrop-blur-sm">
              <h3 className="text-lg font-medium mb-2">تجربة مستخدم متميزة</h3>
              <p>واجهة مستخدم سلسة وسريعة الاستجابة لتجربة برمجية مريحة</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;