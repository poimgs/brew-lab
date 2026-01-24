import { FileText, Pencil, Trash2 } from "lucide-react";
import type { FilterPaper } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface FilterPaperCardProps {
  filterPaper: FilterPaper;
  onEdit: (filterPaper: FilterPaper) => void;
  onDelete: (filterPaper: FilterPaper) => void;
}

export function FilterPaperCard({
  filterPaper,
  onEdit,
  onDelete,
}: FilterPaperCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <FileText className="h-4 w-4" />
          {filterPaper.name}
        </CardTitle>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onEdit(filterPaper)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive"
            onClick={() => onDelete(filterPaper)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {filterPaper.brand && (
          <p className="text-sm text-muted-foreground">{filterPaper.brand}</p>
        )}
        {filterPaper.notes && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            {filterPaper.notes}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
