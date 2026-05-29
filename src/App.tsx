import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import { BackgroundJobsProvider } from "@/contexts/BackgroundJobsContext";

// Recharge la page si un chunk JS est introuvable après un nouveau déploiement (hash périmé en cache).
function lazyWithReload<T extends React.ComponentType<unknown>>(
  factory: () => Promise<{ default: T }>
) {
  return lazy(() =>
    factory().catch(() => {
      window.location.reload();
      return new Promise<{ default: T }>(() => {});
    })
  );
}

const Landing = lazyWithReload(() => import("./pages/Landing"));
const Auth = lazyWithReload(() => import("./pages/Auth"));
const EmailVerification = lazyWithReload(() => import("./pages/EmailVerification"));
const ResetPassword = lazyWithReload(() => import("./pages/ResetPassword"));
const Dashboard = lazyWithReload(() => import("./pages/Dashboard"));
const Projects = lazyWithReload(() => import("./pages/Projects"));
const ProjectDetail = lazyWithReload(() => import("./pages/ProjectDetail"));
const Profile = lazyWithReload(() => import("./pages/Profile"));
const Plans = lazyWithReload(() => import("./pages/Plans"));
const ChapterDetail = lazyWithReload(() => import("./pages/ChapterDetail"));
const ScenarioChapterEditor = lazyWithReload(() => import("./pages/ScenarioChapterEditor"));
const Pilotage = lazyWithReload(() => import("./pages/Pilotage"));
const NotFound = lazyWithReload(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

function PageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center gradient-dream">
      <div className="flex flex-col items-center gap-4">
        <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        <p className="text-muted-foreground font-display text-lg">
          Chargement...
        </p>
      </div>
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <BackgroundJobsProvider>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/auth/verify-email" element={<EmailVerification />} />
              <Route path="/auth/reset-password" element={<ResetPassword />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/projects"
                element={
                  <ProtectedRoute>
                    <Projects />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/projects/:id/scenario/:chapterId"
                element={
                  <ProtectedRoute>
                    <ScenarioChapterEditor />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/projects/:id/chapter/:chapterId"
                element={
                  <ProtectedRoute>
                    <ChapterDetail />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/projects/:id"
                element={
                  <ProtectedRoute>
                    <ProjectDetail />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/profile"
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/plans"
                element={
                  <ProtectedRoute>
                    <Plans />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/pilotage"
                element={
                  <ProtectedRoute>
                    <Pilotage />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
          </BackgroundJobsProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
