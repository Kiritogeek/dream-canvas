import { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Sparkles, LayoutDashboard, FolderOpen, LogOut, User, Zap, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useUserPlan } from "@/hooks/useUserPlan";
import { ThemeToggle } from "@/components/ThemeToggle";

const navItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Tableau de bord" },
  { to: "/dashboard/projects", icon: FolderOpen, label: "Mes projets" },
  { to: "/dashboard/plans", icon: Crown, label: "Plans" },
  { to: "/dashboard/profile", icon: User, label: "Profil" },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const { plan, usageInfo } = useUserPlan();
  const location = useLocation();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link to="/dashboard" className="flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-primary" />
              <span className="font-display text-xl font-bold text-gradient">DreamWeave</span>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            {/* Badge tier — cliquable */}
            <Link
              to="/dashboard/plans"
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-opacity hover:opacity-80 ${
                plan === "pro"
                  ? "bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                  : "bg-muted text-muted-foreground border border-border"
              }`}
              title="Voir les plans"
            >
              {plan === "pro" && <Zap className="h-3 w-3" />}
              {plan === "pro" ? "Pro" : "Free"}
            </Link>
            {/* Compteur de générations */}
            <span className="hidden md:inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-full border border-border/50">
              <Sparkles className="h-3 w-3" />
              {usageInfo.count}/{usageInfo.limit}
            </span>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mr-2">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">{user?.email}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Déconnexion</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="container py-6">
        {/* Sub nav */}
        <nav className="flex gap-2 mb-8">
          {navItems.map((item) => {
            const active =
              item.to === "/dashboard"
                ? location.pathname === "/dashboard"
                : location.pathname.startsWith(item.to);
            return (
              <Button
                key={item.to}
                variant={active ? "default" : "ghost"}
                asChild
                className={active ? "gradient-primary text-primary-foreground shadow-dream" : ""}
                size="sm"
              >
                <Link to={item.to}>
                  <item.icon className="h-4 w-4 mr-2" />
                  {item.label}
                </Link>
              </Button>
            );
          })}
        </nav>

        {children}
      </div>
    </div>
  );
}
