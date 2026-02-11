import { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Sparkles, LayoutDashboard, FolderOpen, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { ThemeToggle } from "@/components/ThemeToggle";

const navItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Tableau de bord" },
  { to: "/dashboard/projects", icon: FolderOpen, label: "Mes projets" },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
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
            const active = location.pathname === item.to;
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
