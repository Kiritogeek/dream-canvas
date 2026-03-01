import { useState, useEffect } from "react";
import { User, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/DashboardLayout";

export default function Profile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setDisplayName(data.display_name || "");
        }
        setLoading(false);
      });
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);

    const { error } = await supabase
      .from("profiles")
      .update({ display_name: displayName.trim() || null })
      .eq("user_id", user.id);

    if (error) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Profil mis à jour !" });
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-4">
          <div className="glass rounded-xl h-48 animate-pulse" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-lg space-y-4 sm:space-y-6">
        <h1 className="text-xl sm:text-2xl font-display font-bold">Mon profil</h1>

        <div className="glass rounded-xl sm:rounded-2xl p-4 sm:p-6 space-y-4 sm:space-y-6">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="h-12 w-12 sm:h-16 sm:w-16 rounded-full gradient-primary flex items-center justify-center shrink-0">
              <User className="h-6 w-6 sm:h-8 sm:w-8 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <p className="font-display font-semibold text-sm sm:text-base">
                {displayName || "Utilisateur"}
              </p>
              <p className="text-xs sm:text-sm text-muted-foreground truncate">{user?.email}</p>
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={user?.email || ""}
                disabled
                className="opacity-60"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="displayName">Nom d'affichage</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Votre pseudo"
              />
            </div>
            <Button
              type="submit"
              disabled={saving}
              className="gradient-primary text-primary-foreground"
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Sauvegarde..." : "Sauvegarder"}
            </Button>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}
