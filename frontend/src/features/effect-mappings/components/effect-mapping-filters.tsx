import type { InputVariable } from "@/lib/api";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface EffectMappingFiltersProps {
  search: string;
  variable: string;
  active: string;
  sortBy: string;
  sortDir: string;
  onSearchChange: (value: string) => void;
  onVariableChange: (value: string) => void;
  onActiveChange: (value: string) => void;
  onSortByChange: (value: string) => void;
  onSortDirChange: (value: string) => void;
  onClearFilters: () => void;
}

const INPUT_VARIABLES: { value: InputVariable; label: string }[] = [
  { value: "temperature", label: "Temperature" },
  { value: "ratio", label: "Ratio" },
  { value: "grind_size", label: "Grind Size" },
  { value: "bloom_time", label: "Bloom Time" },
  { value: "total_brew_time", label: "Brew Time" },
  { value: "coffee_weight", label: "Coffee Weight" },
  { value: "pour_count", label: "Pour Count" },
  { value: "pour_technique", label: "Pour Technique" },
  { value: "filter_type", label: "Filter Type" },
];

export function EffectMappingFilters({
  search,
  variable,
  active,
  sortBy,
  sortDir,
  onSearchChange,
  onVariableChange,
  onActiveChange,
  onSortByChange,
  onSortDirChange,
  onClearFilters,
}: EffectMappingFiltersProps) {
  const hasFilters = search || variable || active;

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 flex-wrap gap-2">
        <Input
          placeholder="Search mappings..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full sm:w-64"
        />

        <Select value={variable} onValueChange={onVariableChange}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="All variables" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All variables</SelectItem>
            {INPUT_VARIABLES.map((v) => (
              <SelectItem key={v.value} value={v.value}>
                {v.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={active} onValueChange={onActiveChange}>
          <SelectTrigger className="w-full sm:w-32">
            <SelectValue placeholder="All status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All status</SelectItem>
            <SelectItem value="true">Active</SelectItem>
            <SelectItem value="false">Inactive</SelectItem>
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button variant="ghost" size="icon" onClick={onClearFilters}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="flex gap-2">
        <Select value={sortBy} onValueChange={onSortByChange}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="created_at">Created</SelectItem>
            <SelectItem value="updated_at">Updated</SelectItem>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="variable">Variable</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sortDir} onValueChange={onSortDirChange}>
          <SelectTrigger className="w-24">
            <SelectValue placeholder="Order" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="desc">Newest</SelectItem>
            <SelectItem value="asc">Oldest</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
