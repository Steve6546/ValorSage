import { Switch, Route } from "wouter";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import IDE from "@/pages/IDE";
import ProjectsPage from "@/pages/ProjectsPage";
import Community from "@/pages/Community";
import Support from "@/pages/Support";
import AuthPage from "@/pages/auth-page";
import { ProtectedRoute } from "./protected-route";

// Wrapper components that return the actual page components
// This helps solve type compatibility issues with React.FC and ProtectedRoute
const DashboardComponent = () => <Dashboard />;
const ProjectsPageComponent = () => <ProjectsPage />;
const IDEComponent = () => <IDE />;
const CommunityComponent = () => <Community />;
const SupportComponent = () => <Support />;

export function AppRoutes() {
  return (
    <Switch>
      {/* Public Routes */}
      <Route path="/auth" component={AuthPage} />
      
      {/* Protected Routes - Require Authentication */}
      <ProtectedRoute path="/" component={DashboardComponent} />
      <ProtectedRoute path="/projects" component={ProjectsPageComponent} />
      <ProtectedRoute path="/ide/:id" component={IDEComponent} />
      <ProtectedRoute path="/community" component={CommunityComponent} />
      <ProtectedRoute path="/support" component={SupportComponent} />
      
      {/* Default fallback - Not Found page automatically redirects to auth when not logged in */}
      <Route component={NotFound} />
    </Switch>
  );
}