import { useState, useEffect } from "react";
import type { Coffee, CoffeeFormData, RoastLevel } from "@/lib/api";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AutocompleteInput } from "./autocomplete-input";
import { useSuggestions } from "../hooks/use-suggestions";

interface CoffeeFormProps {
  coffee?: Coffee;
  onSubmit: (data: CoffeeFormData) => void;
  isSubmitting: boolean;
  formId: string;
}

const ROAST_LEVELS: RoastLevel[] = ["Light", "Medium", "Medium-Dark", "Dark"];

export function CoffeeForm({
  coffee,
  onSubmit,
  isSubmitting,
  formId,
}: CoffeeFormProps) {
  const [roaster, setRoaster] = useState(coffee?.roaster ?? "");
  const [name, setName] = useState(coffee?.name ?? "");
  const [country, setCountry] = useState(coffee?.country ?? "");
  const [region, setRegion] = useState(coffee?.region ?? "");
  const [process, setProcess] = useState(coffee?.process ?? "");
  const [roastLevel, setRoastLevel] = useState<RoastLevel | "">(
    coffee?.roast_level ?? ""
  );
  const [tastingNotes, setTastingNotes] = useState(coffee?.tasting_notes ?? "");
  const [roastDate, setRoastDate] = useState(coffee?.roast_date ?? "");
  const [purchaseDate, setPurchaseDate] = useState(coffee?.purchase_date ?? "");
  const [notes, setNotes] = useState(coffee?.notes ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const roasterSuggestions = useSuggestions();
  const countrySuggestions = useSuggestions();
  const regionSuggestions = useSuggestions();
  const processSuggestions = useSuggestions();

  useEffect(() => {
    if (coffee) {
      setRoaster(coffee.roaster);
      setName(coffee.name);
      setCountry(coffee.country ?? "");
      setRegion(coffee.region ?? "");
      setProcess(coffee.process ?? "");
      setRoastLevel(coffee.roast_level ?? "");
      setTastingNotes(coffee.tasting_notes ?? "");
      setRoastDate(coffee.roast_date ?? "");
      setPurchaseDate(coffee.purchase_date ?? "");
      setNotes(coffee.notes ?? "");
    }
  }, [coffee]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!roaster.trim()) {
      newErrors.roaster = "Roaster is required";
    }

    if (!name.trim()) {
      newErrors.name = "Name is required";
    }

    if (roastDate) {
      const roastDateObj = new Date(roastDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (roastDateObj > today) {
        newErrors.roastDate = "Roast date cannot be in the future";
      }
    }

    if (roastDate && purchaseDate) {
      const roastDateObj = new Date(roastDate);
      const purchaseDateObj = new Date(purchaseDate);
      if (purchaseDateObj < roastDateObj) {
        newErrors.purchaseDate = "Purchase date cannot be before roast date";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    const data: CoffeeFormData = {
      roaster: roaster.trim(),
      name: name.trim(),
      country: country.trim() || undefined,
      region: region.trim() || undefined,
      process: process.trim() || undefined,
      roast_level: roastLevel || undefined,
      tasting_notes: tastingNotes.trim() || undefined,
      roast_date: roastDate || undefined,
      purchase_date: purchaseDate || undefined,
      notes: notes.trim() || undefined,
    };

    onSubmit(data);
  };

  return (
    <form id={formId} onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="roaster">
            Roaster <span className="text-destructive">*</span>
          </Label>
          <AutocompleteInput
            id="roaster"
            value={roaster}
            onChange={setRoaster}
            suggestions={roasterSuggestions.suggestions}
            onFetchSuggestions={(q) =>
              roasterSuggestions.fetchSuggestions("roaster", q)
            }
            onClearSuggestions={roasterSuggestions.clearSuggestions}
            placeholder="Counter Culture, Onyx, etc."
            required
          />
          {errors.roaster && (
            <p className="text-sm text-destructive">{errors.roaster}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="name">
            Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Coffee name"
            required
          />
          {errors.name && (
            <p className="text-sm text-destructive">{errors.name}</p>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="country">Country</Label>
          <AutocompleteInput
            id="country"
            value={country}
            onChange={setCountry}
            suggestions={countrySuggestions.suggestions}
            onFetchSuggestions={(q) =>
              countrySuggestions.fetchSuggestions("country", q)
            }
            onClearSuggestions={countrySuggestions.clearSuggestions}
            placeholder="Ethiopia, Colombia, etc."
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="region">Region</Label>
          <AutocompleteInput
            id="region"
            value={region}
            onChange={setRegion}
            suggestions={regionSuggestions.suggestions}
            onFetchSuggestions={(q) =>
              regionSuggestions.fetchSuggestions("region", q)
            }
            onClearSuggestions={regionSuggestions.clearSuggestions}
            placeholder="Yirgacheffe, Huila, etc."
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="process">Process</Label>
          <AutocompleteInput
            id="process"
            value={process}
            onChange={setProcess}
            suggestions={processSuggestions.suggestions}
            onFetchSuggestions={(q) =>
              processSuggestions.fetchSuggestions("process", q)
            }
            onClearSuggestions={processSuggestions.clearSuggestions}
            placeholder="Washed, Natural, etc."
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="roastLevel">Roast Level</Label>
          <Select
            value={roastLevel}
            onValueChange={(value) => setRoastLevel(value as RoastLevel)}
          >
            <SelectTrigger id="roastLevel">
              <SelectValue placeholder="Select roast level" />
            </SelectTrigger>
            <SelectContent>
              {ROAST_LEVELS.map((level) => (
                <SelectItem key={level} value={level}>
                  {level}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="tastingNotes">Tasting Notes</Label>
        <Textarea
          id="tastingNotes"
          value={tastingNotes}
          onChange={(e) => setTastingNotes(e.target.value)}
          placeholder="Blueberry, chocolate, citrus..."
          rows={2}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="roastDate">Roast Date</Label>
          <Input
            id="roastDate"
            type="date"
            value={roastDate}
            onChange={(e) => setRoastDate(e.target.value)}
          />
          {errors.roastDate && (
            <p className="text-sm text-destructive">{errors.roastDate}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="purchaseDate">Purchase Date</Label>
          <Input
            id="purchaseDate"
            type="date"
            value={purchaseDate}
            onChange={(e) => setPurchaseDate(e.target.value)}
          />
          {errors.purchaseDate && (
            <p className="text-sm text-destructive">{errors.purchaseDate}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Personal notes about this coffee..."
          rows={3}
        />
      </div>

      {/* Hidden submit button for form submission */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="sr-only"
        aria-hidden="true"
      />
    </form>
  );
}
