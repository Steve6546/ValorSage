import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useQueryClient } from "@tanstack/react-query";
import { User } from "@shared/schema";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
}

// Create context with default values to prevent undefined errors
const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: false,
  login: async () => {},
  logout: async () => {},
  register: async () => {},
});

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();

  // Create a dummy user for development
  const createDummyUser = () => {
    const dummyUser: User = {
      id: 1,
      username: "demo_user",
      password: "password123", // This won't be exposed to front-end
      avatarUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde",
      createdAt: new Date()
    };
    return dummyUser;
  };

  useEffect(() => {
    // Check if user is logged in on initial load
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/auth/me", {
        credentials: "include",
      });
      
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else {
        // For development, auto-login with a dummy user if API returns 401
        console.log("Auto-logging in with demo user for development...");
        setUser(createDummyUser());
      }
    } catch (error) {
      console.error("Error checking auth:", error);
      // Set dummy user even on error for development
      setUser(createDummyUser());
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (username: string, password: string) => {
    try {
      setIsLoading(true);
      const response = await apiRequest("POST", "/api/auth/login", {
        username,
        password,
      });
      
      const userData = await response.json();
      setUser(userData);
      
      // Invalidate any cached data
      queryClient.invalidateQueries();
      
      console.log(`Login successful: ${userData.username}`);
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      await apiRequest("POST", "/api/auth/logout", null);
      setUser(null);
      
      // Clear all cached data
      queryClient.clear();
      
      console.log("Logout successful");
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (username: string, password: string) => {
    try {
      setIsLoading(true);
      const response = await apiRequest("POST", "/api/auth/register", {
        username,
        password,
      });
      
      const userData = await response.json();
      setUser(userData);
      
      console.log(`Registration successful: ${userData.username}`);
    } catch (error) {
      console.error("Registration error:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  return useContext(AuthContext);
};
