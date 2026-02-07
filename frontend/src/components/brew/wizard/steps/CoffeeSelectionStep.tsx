import { Controller, useFormContext } from 'react-hook-form';
import CoffeeSelector from '../../CoffeeSelector';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Coffee } from '@/api/coffees';

interface CoffeeSelectionStepProps {
  onCoffeeChange: (coffeeId: string, coffee: Coffee) => void;
  selectedCoffee: Coffee | null;
}

export default function CoffeeSelectionStep({ onCoffeeChange, selectedCoffee }: CoffeeSelectionStepProps) {
  const { control, register, formState: { errors } } = useFormContext();

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-2">Select Coffee</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Choose the coffee you're brewing. This helps track your brews for each coffee.
        </p>
      </div>

      <Controller
        name="coffee_id"
        control={control}
        render={({ field }) => (
          <CoffeeSelector
            value={field.value}
            onChange={onCoffeeChange}
            error={errors.coffee_id?.message as string}
          />
        )}
      />

      {selectedCoffee && (
        <>
          <div className="p-4 bg-muted/50 rounded-lg">
            <h4 className="font-medium">{selectedCoffee.name}</h4>
            <p className="text-sm text-muted-foreground">{selectedCoffee.roaster}</p>
            {selectedCoffee.days_off_roast !== undefined && (
              <p className="text-sm text-muted-foreground">
                {selectedCoffee.days_off_roast} days off roast
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="roast_date">Roast Date (this bag)</Label>
            <Input
              id="roast_date"
              type="date"
              {...register('roast_date')}
            />
            <p className="text-xs text-muted-foreground">
              Override if this bag has a different roast date than the coffee default.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
