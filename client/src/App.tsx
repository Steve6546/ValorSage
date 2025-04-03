import { Toaster } from "@/components/ui/toaster";
import MainLayout from "@/layouts/MainLayout";
import { AppRoutes } from "./lib/routes";

function App() {
  return (
    <MainLayout>
      <AppRoutes />
      <Toaster />
    </MainLayout>
  );
}

export default App;
