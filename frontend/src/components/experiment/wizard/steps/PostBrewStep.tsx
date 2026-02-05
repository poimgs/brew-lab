import { useFormContext, Controller } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { MineralProfile } from '@/api/mineral-profiles';

interface PostBrewStepProps {
  mineralProfiles: MineralProfile[];
}

export default function PostBrewStep({ mineralProfiles }: PostBrewStepProps) {
  const { register, control } = useFormContext();

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-2">Post-Brew Variables</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Record any adjustments made after brewing.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="water_bypass_ml">Water Bypass (ml)</Label>
          <div className="flex items-center gap-2">
            <Input
              id="water_bypass_ml"
              type="number"
              placeholder="e.g., 30"
              {...register('water_bypass_ml', { valueAsNumber: true })}
            />
            <span className="text-sm text-muted-foreground">ml</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Amount of water added after brewing to adjust strength
          </p>
        </div>

        <div className="space-y-2">
          <Label>Mineral Profile</Label>
          <Controller
            name="mineral_profile_id"
            control={control}
            render={({ field }) => (
              <Select value={field.value || ''} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select mineral profile" />
                </SelectTrigger>
                <SelectContent>
                  {mineralProfiles.map((profile) => (
                    <SelectItem key={profile.id} value={profile.id}>
                      {profile.name} {profile.brand && `(${profile.brand})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <p className="text-xs text-muted-foreground">
            Mineral additions used in the brew water
          </p>
        </div>
      </div>
    </div>
  );
}
