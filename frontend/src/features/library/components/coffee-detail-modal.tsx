import { Pencil, Trash2 } from "lucide-react";
import type { Coffee, RoastLevel } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface CoffeeDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  coffee: Coffee | null;
  onEdit: () => void;
  onDelete: () => void;
}

const roastLevelColors: Record<RoastLevel, string> = {
  Light: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  Medium: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  "Medium-Dark": "bg-orange-200 text-orange-900 dark:bg-orange-800 dark:text-orange-100",
  Dark: "bg-stone-200 text-stone-900 dark:bg-stone-700 dark:text-stone-100",
};

function formatDate(dateString: string | undefined): string {
  if (!dateString) return "—";
  return new Date(dateString).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function CoffeeDetailModal({
  open,
  onOpenChange,
  coffee,
  onEdit,
  onDelete,
}: CoffeeDetailModalProps) {
  if (!coffee) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-sm text-muted-foreground">{coffee.roaster}</p>
              <DialogTitle className="text-xl">{coffee.name}</DialogTitle>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={onEdit}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={onDelete}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {coffee.roast_level && (
              <Badge
                variant="secondary"
                className={roastLevelColors[coffee.roast_level]}
              >
                {coffee.roast_level}
              </Badge>
            )}
            {coffee.country && <Badge variant="outline">{coffee.country}</Badge>}
            {coffee.region && (
              <Badge variant="outline">{coffee.region}</Badge>
            )}
            {coffee.process && (
              <Badge variant="secondary">{coffee.process}</Badge>
            )}
          </div>

          {coffee.tasting_notes && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Tasting Notes
              </p>
              <p className="text-sm">{coffee.tasting_notes}</p>
            </div>
          )}

          <Separator />

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-medium text-muted-foreground">Roast Date</p>
              <p>{formatDate(coffee.roast_date)}</p>
            </div>
            <div>
              <p className="font-medium text-muted-foreground">Purchase Date</p>
              <p>{formatDate(coffee.purchase_date)}</p>
            </div>
            <div>
              <p className="font-medium text-muted-foreground">Days Since Roast</p>
              <p>
                {coffee.days_since_roast !== undefined &&
                coffee.days_since_roast !== null
                  ? coffee.days_since_roast
                  : "—"}
              </p>
            </div>
            <div>
              <p className="font-medium text-muted-foreground">Brews</p>
              <p>{coffee.experiment_count}</p>
            </div>
          </div>

          {coffee.notes && (
            <>
              <Separator />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Notes</p>
                <p className="text-sm whitespace-pre-wrap">{coffee.notes}</p>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
