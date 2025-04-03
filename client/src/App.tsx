import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import IDE from "@/pages/IDE";
import ProjectsPage from "@/pages/ProjectsPage";
import Community from "@/pages/Community";
import Support from "@/pages/Support";
import MainLayout from "@/layouts/MainLayout";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/projects" component={ProjectsPage} />
      <Route path="/ide/:id" component={IDE} />
      <Route path="/community" component={Community} />
      <Route path="/support" component={Support} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <MainLayout>
      <Router />
      <Toaster />
    </MainLayout>
  );
}

export default App;
