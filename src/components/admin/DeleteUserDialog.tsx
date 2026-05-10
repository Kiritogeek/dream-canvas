import { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  displayName: string;
  email: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}

export default function DeleteUserDialog({ open, displayName, email, onConfirm, onCancel, loading }: Props) {
  const [step, setStep] = useState<1 | 2>(1);
  const [inputValue, setInputValue] = useState("");

  useEffect(() => {
    if (!open) {
      setStep(1);
      setInputValue("");
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onCancel(); }}>
      <DialogContent className="glass max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-destructive">
            Supprimer le compte
          </DialogTitle>
          <DialogDescription>
            {step === 1
              ? "Vérifiez les informations avant de continuer."
              : "Cette action est irréversible."}
          </DialogDescription>
        </DialogHeader>

        {step === 1 ? (
          <>
            <div className="rounded-lg bg-destructive/10 border border-destructive/30 p-4 text-sm text-foreground">
              Vous êtes sur le point de supprimer le compte de{" "}
              <strong>{displayName}</strong> ({email}). Cette action est
              irréversible et supprime tous ses projets, assets et données.
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={onCancel}>
                Annuler
              </Button>
              <Button variant="default" onClick={() => setStep(2)}>
                Continuer →
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <div className="space-y-3">
              <p className="text-sm text-foreground">
                Pour confirmer, saisissez le pseudo exact :{" "}
                <strong>{displayName}</strong>
              </p>
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={displayName}
                autoFocus
              />
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={onCancel}>
                Annuler
              </Button>
              <Button
                variant="destructive"
                disabled={inputValue !== displayName || loading}
                onClick={onConfirm}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Suppression...
                  </>
                ) : (
                  "Supprimer définitivement"
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
