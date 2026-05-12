import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { UserPlan } from "@/types";

interface QuotaReachedDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  plan: UserPlan;
  usageInfo: { count: number; limit: number };
  nextResetDate: Date;
}

export function QuotaReachedDialog({
  open,
  onOpenChange,
  plan,
  usageInfo,
  nextResetDate,
}: QuotaReachedDialogProps) {
  const navigate = useNavigate();

  const formattedDate = nextResetDate.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const handleUpgrade = () => {
    onOpenChange(false);
    navigate("/dashboard/plans");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm text-center">
        <DialogHeader>
          <DialogTitle className="text-lg">Quota mensuel atteint</DialogTitle>
        </DialogHeader>
        <div className="space-y-5 py-2">
          <p className="text-muted-foreground text-sm leading-relaxed">
            Vous avez utilisé{" "}
            <span className="font-semibold text-foreground">
              {usageInfo.count} / {usageInfo.limit}
            </span>{" "}
            générations. Votre quota se renouvelle le {formattedDate}.
          </p>
          <div className="flex flex-col gap-2">
            {plan === "libre" && (
              <Button
                className="w-full gradient-primary text-primary-foreground gap-2"
                onClick={handleUpgrade}
              >
                Passer au plan Créateur →
              </Button>
            )}
            {plan === "createur" && (
              <Button
                className="w-full gradient-primary text-primary-foreground gap-2"
                onClick={handleUpgrade}
              >
                Passer au plan Studio →
              </Button>
            )}
            <Button
              variant="ghost"
              className="w-full text-sm"
              onClick={() => onOpenChange(false)}
            >
              Fermer
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
