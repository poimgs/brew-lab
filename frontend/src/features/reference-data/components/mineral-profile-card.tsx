import { Droplets, Info } from "lucide-react";
import type { MineralProfile } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface MineralProfileCardProps {
  mineralProfile: MineralProfile;
  onViewDetails: (profile: MineralProfile) => void;
}

export function MineralProfileCard({
  mineralProfile,
  onViewDetails,
}: MineralProfileCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Droplets className="h-4 w-4" />
          {mineralProfile.name}
        </CardTitle>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => onViewDetails(mineralProfile)}
        >
          <Info className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        {mineralProfile.brand && (
          <p className="text-sm text-muted-foreground">{mineralProfile.brand}</p>
        )}
        {mineralProfile.typical_dose && (
          <p className="text-xs text-muted-foreground mt-1">
            {mineralProfile.typical_dose}
          </p>
        )}
        {mineralProfile.taste_effects && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            {mineralProfile.taste_effects}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
