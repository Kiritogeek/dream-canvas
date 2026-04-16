import { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Sparkles, LayoutDashboard, LogOut, User, Zap, Crown, Menu, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useUserPlan } from "@/hooks/useUserPlan";
import { ThemeToggle } from "@/components/ThemeToggle";

const navItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Tableau de bord", shortLabel: "Accueil" },
  { to: "/dashboard/plans", icon: Crown, label: "Plans", shortLabel: "Plans" },
  { to: "/dashboard/profile", icon: User, label: "Profil", shortLabel: "Profil" },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const { plan, usageInfo } = useUserPlan();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar : glass avec lavande/peach (charte) */}
      <header className="sticky top-0 z-50 glass border-b border-border/50 shadow-sm">
        <div className="container px-4 sm:px-6 lg:px-8 flex h-14 sm:h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link
              to="/dashboard"
              className="group/logo flex items-center gap-1.5 sm:gap-2 transition-transform duration-300 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-primary transition-transform duration-300 group-hover/logo:animate-logo-sparkle" />
              <span className="font-display text-lg sm:text-xl font-bold text-gradient">DreamWeave</span>
            </Link>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Badge tier — cliquable */}
            <Link
              to="/dashboard/plans"
              className={`inline-flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-xs font-semibold transition-opacity hover:opacity-80 ${
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
            <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground mr-2">
              <User className="h-4 w-4" />
              <span className="hidden lg:inline">{user?.email}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={handleSignOut} className="hidden sm:inline-flex">
              <LogOut className="h-4 w-4 mr-1" />
              <span className="hidden md:inline">Déconnexion</span>
            </Button>
            {/* Burger menu mobile — rotation légère au toggle */}
            <Button
              variant="ghost"
              size="sm"
              className="sm:hidden p-1.5 transition-transform duration-300 hover:rotate-90"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5 animate-in fade-in zoom-in-95 duration-200" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Menu mobile déroulant — animation slide + stagger des items */}
        {mobileMenuOpen && (
          <div
            className="sm:hidden border-t border-border/50 bg-card/95 backdrop-blur-xl animate-menu-slide origin-top"
            role="menu"
          >
            <div className="px-4 py-3 space-y-1">
              {navItems.map((item, index) => {
                const active =
                  item.to === "/dashboard"
                    ? location.pathname === "/dashboard"
                    : location.pathname.startsWith(item.to);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors animate-menu-item-in [animation-fill-mode:both] ${
                      index === 0 ? "stagger-1" : index === 1 ? "stagger-2" : index === 2 ? "stagger-3" : "stagger-4"
                    } ${active ? "gradient-primary text-primary-foreground shadow-dream" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
              <div className="pt-2 mt-2 border-t border-border/50 animate-menu-item-in [animation-fill-mode:both] stagger-5">
                <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span className="truncate">{user?.email}</span>
                </div>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleSignOut();
                  }}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors w-full animate-menu-item-in [animation-fill-mode:both] stagger-6"
                >
                  <LogOut className="h-4 w-4" />
                  Déconnexion
                </button>
              </div>
            </div>
          </div>
        )}
      </header>

      <div className="min-h-[calc(100vh-3.5rem)] bg-content">
        <div key={location.pathname} className="container px-4 sm:px-6 lg:px-8 py-4 sm:py-6 animate-fade-up">
        {/* Sub nav — desktop: inline, mobile: hidden (dans le burger) */}
        <nav className="hidden sm:flex gap-1.5 mb-6 lg:mb-8 overflow-x-auto pb-1 scrollbar-none">
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
                className={`shrink-0 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] ${
                  active ? "gradient-primary text-primary-foreground shadow-dream animate-nav-pill-pop" : ""
                }`}
                size="sm"
              >
                <Link to={item.to}>
                  <item.icon className="h-4 w-4 mr-1.5 lg:mr-2" />
                  <span className="hidden md:inline">{item.label}</span>
                  <span className="md:hidden">{item.shortLabel}</span>
                </Link>
              </Button>
            );
          })}
        </nav>

        {children}
        </div>
      </div>
    </div>
  );
}
