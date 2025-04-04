import { createContext, ReactNode, useContext } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { User, insertUserSchema } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

// Login schema for simplified validation
const loginSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
});

// Register schema reuses the insert schema plus confirmation
const registerSchema = insertUserSchema.extend({
  password: z.string().min(6),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "كلمات المرور غير متطابقة",
  path: ["confirmPassword"],
});

// Types for login and registration
type LoginData = z.infer<typeof loginSchema>;
type RegisterData = z.infer<typeof registerSchema>;

// Auth context interface
type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<Response, Error, LoginData>;
  logoutMutation: UseMutationResult<Response, Error, void>;
  registerMutation: UseMutationResult<Response, Error, RegisterData>;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  
  // Fetch current user
  const {
    data: user,
    error,
    isLoading,
  } = useQuery<User | undefined, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: false, // Don't retry on 401
  });

  // Login mutation
  const loginMutation = useMutation<Response, Error, LoginData>({
    mutationFn: async (credentials: LoginData) => {
      console.log("Login attempt with:", credentials);
      return await apiRequest("POST", "/api/login", credentials);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "تم تسجيل الدخول بنجاح",
        description: "مرحباً بك في منصة كودر التفاعلية",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "فشل تسجيل الدخول",
        description: "اسم المستخدم أو كلمة المرور غير صحيحة",
        variant: "destructive",
      });
    },
  });

  // Register mutation
  const registerMutation = useMutation<Response, Error, RegisterData>({
    mutationFn: async (credentials: RegisterData) => {
      const { confirmPassword, ...registerData } = credentials;
      return await apiRequest("POST", "/api/register", registerData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "تم إنشاء الحساب بنجاح",
        description: "تم إنشاء حسابك بنجاح، مرحباً بك في منصة كودر التفاعلية",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "فشل إنشاء الحساب",
        description: "حدث خطأ أثناء إنشاء الحساب. قد يكون اسم المستخدم موجوداً بالفعل.",
        variant: "destructive",
      });
    },
  });

  // Logout mutation
  const logoutMutation = useMutation<Response, Error, void>({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/logout");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      queryClient.setQueryData(["/api/user"], null);
      toast({
        title: "تم تسجيل الخروج",
        description: "نتمنى لك يوماً سعيداً!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "فشل تسجيل الخروج",
        description: "حدث خطأ أثناء تسجيل الخروج. يرجى المحاولة مرة أخرى.",
        variant: "destructive",
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}